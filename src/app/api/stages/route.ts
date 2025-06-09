// src/app/api/stages/route.ts - Fixed with position support
import { NextRequest, NextResponse } from 'next/server'
import { stagesDb } from '@/lib/stageDb'
import { validateStageName, validateStageColor } from '@/lib/schemas'

// Temporary user ID for development
const TEMP_USER_ID = 'dev-user-1'

// GET /api/stages - Fetch all stages for the current user
export async function GET() {
  try {
    let stages = await stagesDb.getAllForUser(TEMP_USER_ID)
    
    // If no stages exist, initialize with defaults
    if (stages.length === 0) {
      console.log('No stages found, initializing defaults...')
      stages = await stagesDb.initializeDefaultStages(TEMP_USER_ID)
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

// POST /api/stages - Create a new stage
export async function POST(request: NextRequest) {
  try {
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
    const existingStages = await stagesDb.getAllForUser(TEMP_USER_ID)
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

    // Create the new stage
    const newStage = await stagesDb.create(TEMP_USER_ID, stageData)
    
    // Handle positioning if specified
    if (typeof insertAtPosition === 'number' && insertAtPosition >= 0) {
      // Get all stages including the new one
      const allStages = await stagesDb.getAllForUser(TEMP_USER_ID)
      
      // Remove the new stage from its current position (should be at the end)
      const stagesWithoutNew = allStages.filter(s => s.id !== newStage.id)
      
      // Insert the new stage at the desired position
      stagesWithoutNew.splice(insertAtPosition, 0, newStage)
      
      // Reorder all stages
      const orderedStageIds = stagesWithoutNew.map(stage => stage.id)
      await stagesDb.reorderStages(TEMP_USER_ID, orderedStageIds)
      
      // Return the updated stage list
      const finalStages = await stagesDb.getAllForUser(TEMP_USER_ID)
      
      return NextResponse.json({
        success: true,
        data: newStage,
        allStages: finalStages // Include all stages so frontend can update
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

// PUT /api/stages/reorder - Reorder stages (for drag-and-drop)
export async function PUT(request: NextRequest) {
  try {
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

    // Verify all stages belong to the current user
    const existingStages = await stagesDb.getAllForUser(TEMP_USER_ID)
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

    // Reorder the stages
    await stagesDb.reorderStages(TEMP_USER_ID, orderedStageIds)
    
    // Return updated stages
    const updatedStages = await stagesDb.getAllForUser(TEMP_USER_ID)
    
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