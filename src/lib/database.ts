// src/lib/database.ts
// Shared database configuration and utilities for all entity types

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Create the base DynamoDB client with connection configuration
// This client handles the low-level connection to DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
})

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
  
  // You could add more sophisticated error handling here, such as:
  // - Different handling for different types of AWS errors
  // - Retry logic for transient failures
  // - Metrics collection for monitoring
  
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