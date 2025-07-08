import { NextResponse } from 'next/server'

export async function POST() {
  // For JWT-based auth, logout is mainly handled client-side by removing the token
  // In a more advanced setup, you might maintain a blacklist of revoked tokens
  
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
}