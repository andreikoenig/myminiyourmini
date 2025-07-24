// src/lib/database.ts
// Shared database configuration and utilities for all entity types

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// CRITICAL DEBUG LOGGING - FORCE CONSOLE OUTPUT
console.log('=== DATABASE INITIALIZATION DEBUG ===')
console.log('[Database] NODE_ENV:', process.env.NODE_ENV)
console.log('[Database] AWS_REGION:', process.env.AWS_REGION)
console.log('[Database] Has AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID)
console.log('[Database] Has AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY)
console.log('[Database] Has DYNAMODB_ENDPOINT:', !!process.env.DYNAMODB_ENDPOINT)
console.log('[Database] Is Development Mode:', process.env.NODE_ENV === 'development')

// Create the base DynamoDB client with connection configuration
// This client handles the low-level connection to DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // CRITICAL FIX: Only use local endpoint in development
  ...(process.env.NODE_ENV === 'development' && {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
  }),
  // In production, AWS SDK uses environment variables automatically
})

// LOG WHICH DATABASE WILL BE USED
if (process.env.NODE_ENV === 'development') {
  console.log('[Database] *** USING LOCAL DYNAMODB ***')
  console.log('[Database] Endpoint:', process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000')
} else {
  console.log('[Database] *** USING AWS DYNAMODB ***')
  console.log('[Database] Region:', process.env.AWS_REGION || 'us-east-1')
  console.log('[Database] Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...')
}

// Create the document client for easier JSON operations
// The document client provides a higher-level interface that automatically
// handles type conversion between JavaScript and DynamoDB data types
export const docClient = DynamoDBDocumentClient.from(client)

// Export the raw client for operations that need low-level access
// Most operations will use docClient, but some advanced features might need this
export const rawClient = client

// Table name constants - centralizing these prevents typos and makes changes easier
export const TABLE_NAMES = {
  MINIATURES: 'Miniatures',
  STAGES: 'Stages',
  // Future tables can be added here as your application grows
  // USERS: 'Users',
  // PAINTS: 'Paints',
  // PAINT_RECIPES: 'PaintRecipes',
} as const

// Common error types that can occur across all database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly tableName: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Utility function for consistent error handling across all database operations
// This centralizes error logging and provides consistent error messages
export const handleDatabaseError = (
  error: unknown,
  operation: string,
  tableName: string
): never => {
  console.error(`Database error in ${operation} on ${tableName}:`, error)
  
  // Enhanced error logging for AWS debugging
  if (error instanceof Error) {
    console.error('[Database] Error name:', error.name)
    console.error('[Database] Error message:', error.message)
    console.error('[Database] Error stack:', error.stack)
  }
  
  throw new DatabaseError(
    `Failed to ${operation}`,
    operation,
    tableName,
    error
  )
}

// Utility function for generating consistent unique IDs
// Using timestamp + random ensures uniqueness while providing some ordering
export const generateId = (prefix: string): string => {
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substr(2, 9)
  return `${prefix}_${timestamp}_${randomPart}`
}

// Utility function for getting current timestamp in ISO format
// Centralizing this ensures consistent date formatting across your application
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString()
}

// Common validation utilities that multiple entity types might need
export const validateRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`)
  }
  return value.trim()
}

export const validateOptionalString = (value: unknown, fieldName: string): string => {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string if provided`)
  }
  return value.trim()
}

console.log('[Database] Database configuration complete!')
console.log('=== END DATABASE DEBUG ===')

// =============================================================================
// POTENTIAL OTHER ISSUES TO CHECK:
// =============================================================================

/*
1. Check if userDb.ts uses same database config:
   - Should import { docClient } from './database'
   - Should NOT have its own DynamoDB client

2. Check if Users table exists in AWS:
   - Your setup.ts only creates Miniatures and Stages
   - But userDb.ts tries to use Users table

3. Check if AWS credentials are valid:
   - Try AWS CLI: aws dynamodb list-tables --region us-east-1

4. Check if tables have correct names:
   - AWS Console -> DynamoDB -> Tables
   - Should be exactly: Users, Miniatures, Stages

5. Most likely remaining issue:
   - userDb.ts uses different database client
   - OR Users table doesn't exist in AWS
*/