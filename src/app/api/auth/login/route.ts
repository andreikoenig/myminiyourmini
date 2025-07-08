import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/userDb'
import { LoginRequest } from '@/lib/userSchema'

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required' 
        },
        { status: 400 }
      )
    }

    // Attempt to authenticate user
    const result = await userDb.authenticateUser(body)

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email or password' 
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    })
    
  } catch (error) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred during login' 
      },
      { status: 500 }
    )
  }
}
