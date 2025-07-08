// src/app/api/miniatures/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { miniatureDb } from '@/lib/miniatureDb'
import { getUserFromRequest } from '@/lib/userDb'

// GET /api/miniatures/[id] - Get specific miniature
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
    
    // Security check: ensure the miniature belongs to the authenticated user
    if (miniature.userId !== user.id) {
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
    
    // First verify the miniature exists and belongs to the authenticated user
    const existingMiniature = await miniatureDb.getById(resolvedParams.id)
    
    if (!existingMiniature || existingMiniature.userId !== user.id) {
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
    
    // First verify the miniature exists and belongs to the authenticated user
    const existingMiniature = await miniatureDb.getById(resolvedParams.id)
    
    if (!existingMiniature || existingMiniature.userId !== user.id) {
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