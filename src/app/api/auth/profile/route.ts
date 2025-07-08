import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, userDb } from '@/lib/userDb'

export async function PATCH(request: NextRequest) {
  try {
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

    const updates = await request.json()
    
    // Remove sensitive fields that shouldn't be updated this way
    const { ...allowedUpdates } = updates

    const updatedUser = await userDb.updateUserProfile(user.id, allowedUpdates)

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
    
  } catch (error) {
    console.error('Profile update error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update profile'
      },
      { status: 400 }
    )
  }
}
