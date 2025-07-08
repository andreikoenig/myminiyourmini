// src/app/api/miniatures/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { miniatureDb } from '@/lib/miniatureDb'
import { getUserFromRequest } from '@/lib/userDb'

// GET /api/miniatures - Fetch all miniatures for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request
    const authHeader = request.headers.get('authorization')
    const user = await getUserFromRequest(authHeader)

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required' 
        },
        { status: 401 }
      )
    }

    // Fetch miniatures for the authenticated user
    const miniatures = await miniatureDb.getAllForUser(user.id)

    console.log(`Retrieved ${miniatures.length} miniatures for user ${user.username}`)
    
    // Also fetch stages for initialization
    const { stagesDb } = await import('@/lib/stageDb')
    const stages = await stagesDb.getAllForUser(user.id)
    console.log(`Available stages: ${stages.length}`)

    return NextResponse.json({
      success: true,
      data: miniatures
    })
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch miniatures' 
      },
      { status: 500 }
    )
  }
}

// POST /api/miniatures - Create a new miniature for authenticated user
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from request
    const authHeader = request.headers.get('authorization')
    const user = await getUserFromRequest(authHeader)

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required' 
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    const { name, description = '' } = body
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name is required and must be a non-empty string' 
        },
        { status: 400 }
      )
    }

    // Get the user's stages to find the first one
    const { stagesDb } = await import('@/lib/stageDb')
    const stages = await stagesDb.getAllForUser(user.id)
    
    let defaultStageId: string | undefined
    
    if (stages.length === 0) {
      // Initialize default stages if user has none
      await stagesDb.initializeDefaultStages(user.id)
      const newStages = await stagesDb.getAllForUser(user.id)
      defaultStageId = newStages[0]?.id
    } else {
      defaultStageId = stages[0]?.id
    }

    if (!defaultStageId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to determine default stage for new miniature' 
        },
        { status: 500 }
      )
    }

    // Create miniature for authenticated user
    const miniatureData = {
      name: name.trim(),
      description: description.trim(),
      stageId: defaultStageId
    }

    const newMiniature = await miniatureDb.create(user.id, miniatureData)
    
    return NextResponse.json({
      success: true,
      data: newMiniature
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create miniature' 
      },
      { status: 500 }
    )
  }
}