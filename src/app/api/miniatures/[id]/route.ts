// src/app/api/miniatures/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { miniatureDb } from '@/lib/miniatureDb'

// Temporary user ID for development - in production this would come from authentication
const TEMP_USER_ID = 'dev-user-1'

// GET /api/miniatures/[id] - Get specific miniature
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const miniature = await miniatureDb.getById(resolvedParams.id)
    
    if (!miniature) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Miniature not found' 
        },
        { status: 404 }
      )
    }
    
    // Security check: ensure the miniature belongs to the current user
    // This prevents users from accessing miniatures that don't belong to them
    if (miniature.userId !== TEMP_USER_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Miniature not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: miniature
    })
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch miniature' 
      },
      { status: 500 }
    )
  }
}

// PATCH /api/miniatures/[id] - Update specific miniature
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    
    // First verify the miniature exists and belongs to the current user
    const existingMiniature = await miniatureDb.getById(resolvedParams.id)
    
    if (!existingMiniature || existingMiniature.userId !== TEMP_USER_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Miniature not found' 
        },
        { status: 404 }
      )
    }
    
    // Validate that we have some updates to make
    const allowedUpdates = ['name', 'description', 'stageId', 'notes', 'difficulty']
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

    // The new miniatureDb.update method handles validation internally
    // This is a good example of how pushing validation into the database layer
    // makes your API routes cleaner and more maintainable
    const updatedMiniature = await miniatureDb.update(resolvedParams.id, updates)
    
    return NextResponse.json({
      success: true,
      data: updatedMiniature
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update miniature' 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/miniatures/[id] - Delete specific miniature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
    // First verify the miniature exists and belongs to the current user
    const existingMiniature = await miniatureDb.getById(resolvedParams.id)
    
    if (!existingMiniature || existingMiniature.userId !== TEMP_USER_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Miniature not found' 
        },
        { status: 404 }
      )
    }
    
    await miniatureDb.delete(resolvedParams.id)
    
    return NextResponse.json({
      success: true,
      message: 'Miniature deleted successfully'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete miniature' 
      },
      { status: 500 }
    )
  }
}