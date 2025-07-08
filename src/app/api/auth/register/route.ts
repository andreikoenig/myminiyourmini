import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/userDb'
import { RegisterRequest } from '@/lib/userSchema'

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    
    // Validate required fields
    if (!body.email || !body.username || !body.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email, username, and password are required' 
        },
        { status: 400 }
      )
    }

    // Create new user account
    const result = await userDb.createUser(body)

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    }, { status: 201 })
    
  } catch (error) {
    console.error('Registration error:', error)
    
    // Check if it's a validation error
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 400 }
    )
  }
}