import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/userDb'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const user = await getUserFromRequest(authHeader)

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })
    
  } catch (error) {
    console.error('Token verification error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Token verification failed' 
      },
      { status: 401 }
    )
  }
}
