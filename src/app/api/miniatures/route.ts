// src/app/api/miniatures/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { miniatureDb } from '@/lib/miniatureDb'

// Temporary user ID for development - in production this would come from authentication
const TEMP_USER_ID = 'dev-user-1'

// GET /api/miniatures - Fetch all miniatures for the current user
export async function GET() {
  try {
    // Notice how we now pass the user ID to scope the query appropriately
    // This prevents accidentally returning miniatures from other users
    const miniatures = await miniatureDb.getAllForUser(TEMP_USER_ID)

    console.log('Retrieved miniatures:', JSON.stringify(miniatures, null, 2))
    
    const { stagesDb } = await import('@/lib/stageDb')
    const stages = await stagesDb.getAllForUser(TEMP_USER_ID)
    console.log('Available stages:', JSON.stringify(stages, null, 2))

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

// POST /api/miniatures - Create a new miniature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields using the same approach as before
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

    // For now, we need to determine which stage new miniatures should start in
    // In the future, this could be configurable per user or passed from the frontend
    // For development, let's assume they start in the first stage (Queue)
    
    // First, get the user's stages to find the first one
    const { stagesDb } = await import('@/lib/stageDb')
    const stages = await stagesDb.getAllForUser(TEMP_USER_ID)
    
    if (stages.length === 0) {
      // If the user has no stages, initialize them with defaults
      await stagesDb.initializeDefaultStages(TEMP_USER_ID)
      const newStages = await stagesDb.getAllForUser(TEMP_USER_ID)
      var defaultStageId = newStages[0]?.id
    } else {
      var defaultStageId = stages[0]?.id
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

    // Create miniature with the new method signature
    const miniatureData = {
      name: name.trim(),
      description: description.trim(),
      stageId: defaultStageId  // New miniatures start in the first stage
    }

    const newMiniature = await miniatureDb.create(TEMP_USER_ID, miniatureData)
    
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