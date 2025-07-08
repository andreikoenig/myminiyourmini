// src/app/api/stages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stagesDb } from '@/lib/stageDb'
import { validateStageName, validateStageColor } from '@/lib/schemas'
import { getUserFromRequest } from '@/lib/userDb'

// GET /api/stages - Fetch all stages for the authenticated user
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

    let stages = await stagesDb.getAllForUser(user.id)
    
    // If no stages exist, initialize with defaults
    if (stages.length === 0) {
      console.log(`No stages found for user ${user.username}, initializing defaults...`)
      stages = await stagesDb.initializeDefaultStages(user.id)
    }
    
    return NextResponse.json({
      success: true,
      data: stages
    })
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stages' 
      },
      { status: 500 }
    )
  }
}

// POST /api/stages - Create a new stage for authenticated user
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
    const { name, description = '', color = 'gray', insertAtPosition } = body
    
    // Validate stage name
    const nameError = validateStageName(name)
    if (nameError) {
      return NextResponse.json(
        { 
          success: false, 
          error: nameError 
        },
        { status: 400 }
      )
    }

    // Validate stage color
    const colorError = validateStageColor(color)
    if (colorError) {
      return NextResponse.json(
        { 
          success: false, 
          error: colorError 
        },
        { status: 400 }
      )
    }

    // Check for duplicate stage names for this user
    const existingStages = await stagesDb.getAllForUser(user.id)
    const duplicateName = existingStages.find(stage => 
      stage.name.toLowerCase() === name.trim().toLowerCase()
    )
    
    if (duplicateName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A stage with this name already exists' 
        },
        { status: 400 }
      )
    }

    // Create the stage data
    const stageData = {
      name: name.trim(),
      description: description.trim(),
      color
    }

    // Create the new stage for authenticated user
    const newStage = await stagesDb.create(user.id, stageData)
    
    // Handle positioning if specified
    if (typeof insertAtPosition === 'number' && insertAtPosition >= 0) {
      // Get all stages including the new one
      const allStages = await stagesDb.getAllForUser(user.id)
      
      // Remove the new stage from its current position (should be at the end)
      const stagesWithoutNew = allStages.filter(s => s.id !== newStage.id)
      
      // Insert the new stage at the desired position
      stagesWithoutNew.splice(insertAtPosition, 0, newStage)
      
      // Reorder all stages
      const orderedStageIds = stagesWithoutNew.map(stage => stage.id)
      await stagesDb.reorderStages(user.id, orderedStageIds)
      
      // Return the updated stage list
      const finalStages = await stagesDb.getAllForUser(user.id)
      
      return NextResponse.json({
        success: true,
        data: newStage,
        allStages: finalStages
      }, { status: 201 })
    }
    
    return NextResponse.json({
      success: true,
      data: newStage
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create stage' 
      },
      { status: 500 }
    )
  }
}

// PUT /api/stages/reorder - Reorder stages for authenticated user
export async function PUT(request: NextRequest) {
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
    const { orderedStageIds } = body
    
    if (!Array.isArray(orderedStageIds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'orderedStageIds must be an array' 
        },
        { status: 400 }
      )
    }

    // Verify all stages belong to the authenticated user
    const existingStages = await stagesDb.getAllForUser(user.id)
    const existingStageIds = new Set(existingStages.map(s => s.id))
    
    const invalidIds = orderedStageIds.filter(id => !existingStageIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid stage IDs: ${invalidIds.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Reorder the stages for authenticated user
    await stagesDb.reorderStages(user.id, orderedStageIds)
    
    // Return updated stages
    const updatedStages = await stagesDb.getAllForUser(user.id)
    
    return NextResponse.json({
      success: true,
      data: updatedStages
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reorder stages' 
      },
      { status: 500 }
    )
  }
}