// src/app/api/setup/route.ts
import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { TABLE_NAMES } from '@/lib/database'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
})

// Helper function to check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }))
    return true
  } catch {
    return false
  }
}

// Helper function to create a table
async function createTable(tableName: string, keySchema: any[], attributeDefinitions: any[]) {
  const createTableCommand = new CreateTableCommand({
    TableName: tableName,
    KeySchema: keySchema,
    AttributeDefinitions: attributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST'
  })

  await client.send(createTableCommand)
}

export async function POST() {  // Notice: no request parameter needed
  const results: string[] = []
  
  try {
    // Setup Miniatures table
    if (await tableExists(TABLE_NAMES.MINIATURES)) {
      results.push(`Table ${TABLE_NAMES.MINIATURES} already exists`)
    } else {
      await createTable(
        TABLE_NAMES.MINIATURES,
        [{ AttributeName: 'id', KeyType: 'HASH' }],
        [{ AttributeName: 'id', AttributeType: 'S' }]
      )
      results.push(`Table ${TABLE_NAMES.MINIATURES} created successfully`)
    }

    // Setup Stages table
    if (await tableExists(TABLE_NAMES.STAGES)) {
      results.push(`Table ${TABLE_NAMES.STAGES} already exists`)
    } else {
      await createTable(
        TABLE_NAMES.STAGES,
        [{ AttributeName: 'id', KeyType: 'HASH' }],
        [{ AttributeName: 'id', AttributeType: 'S' }]
      )
      results.push(`Table ${TABLE_NAMES.STAGES} created successfully`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database setup completed',
      details: results
    })
    
  } catch (error) {
    console.error('Error setting up database:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}