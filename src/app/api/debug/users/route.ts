import { NextResponse } from 'next/server'
import { userDb } from '@/lib/userDb'

export async function GET() {
  try {
    // Simple scan to get all users for debugging
    const response = await userDb.getAllUsers()
    return NextResponse.json({
      success: true,
      count: response.length,
      users: response.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        createdAt: u.createdAt,
        hasPassword: !!u.passwordHash
      }))
    })
  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}