// src/app/api/stages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stagesDb } from '@/lib/stageDb'
import { getUserFromRequest } from '@/lib/userDb'

// GET /api/stages/[id] - Get specific stage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const stage = await stagesDb.getById(resolvedParams.id)
    
    if (!stage) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stage not found' 
        },
        { status: 404 }
      )
    }
    
    // Security check: ensure the stage belongs to the authenticated user
    if (stage.userId !== user.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stage not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: stage
    })
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stage' 
      },
      { status: 500 }
    )
  }
}

// PATCH /api/stages/[id] - Update specific stage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params
    
    // First verify the stage exists and belongs to the authenticated user
    const existingStage = await stagesDb.getById(resolvedParams.id)
    
    if (!existingStage || existingStage.userId !== user.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stage not found' 
        },
        { status: 404 }
      )
    }
    
    // Validate that we have some updates to make
    const allowedUpdates = ['name', 'description', 'color', 'sortOrder']
    const updates = Object.keys(body).reduce((acc, key) => {
      if (allowedUpdates.includes(key) && body[key] !== undefined) {
        acc[key] = body[key]
      }
      return acc
    }, {} as Record<string, unknown>)
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid updates provided' 
        },
        { status: 400 }
      )
    }

    const updatedStage = await stagesDb.update(resolvedParams.id, updates)
    
    return NextResponse.json({
      success: true,
      data: updatedStage
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update stage' 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/stages/[id] - Delete specific stage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    
    // First verify the stage exists and belongs to the authenticated user
    const existingStage = await stagesDb.getById(resolvedParams.id)
    
    if (!existingStage || existingStage.userId !== user.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stage not found' 
        },
        { status: 404 }
      )
    }

    // Check if stage has miniatures - we need to import miniatureDb for this
    const { miniatureDb } = await import('@/lib/miniatureDb')
    const miniaturesInStage = await miniatureDb.getAllInStage(user.id, resolvedParams.id)
    
    if (miniaturesInStage.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete stage with ${miniaturesInStage.length} miniatures. Move them to other stages first.` 
        },
        { status: 400 }
      )
    }

    // Prevent deletion of default stages
    if (existingStage.isDefault) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete default stages. You can edit them instead.' 
        },
        { status: 400 }
      )
    }
    
    await stagesDb.delete(resolvedParams.id)
    
    return NextResponse.json({
      success: true,
      message: 'Stage deleted successfully'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete stage' 
      },
      { status: 500 }
    )
  }
}