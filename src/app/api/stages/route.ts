import { NextResponse } from 'next/server'
import { stagesDb } from '@/lib/stageDb'

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