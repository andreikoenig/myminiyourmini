// src/lib/miniatureDb.ts
// Database operations specifically for miniature entities

import { 
  PutCommand, 
  ScanCommand, 
  UpdateCommand,
  DeleteCommand,
  GetCommand
} from '@aws-sdk/lib-dynamodb'
import { 
  docClient, 
  TABLE_NAMES, 
  handleDatabaseError, 
  generateId, 
  getCurrentTimestamp,
  validateRequiredString,
  validateOptionalString
} from './database'

// Updated miniature interface that references stages by ID instead of hardcoded strings
export interface Miniature {
  id: string
  userId: string
  name: string
  description: string
  stageId: string         // References Stage.id instead of hardcoded stage name
  createdAt: string       // ISO timestamp string
  updatedAt: string       // ISO timestamp string
  
  // Optional fields for future features - having them in the interface
  // documents your intentions even if not implemented yet
  imageUrl?: string       // For miniature photos
  estimatedHours?: number // Time estimation for project planning
  actualHours?: number    // Time tracking for completed projects
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  notes?: string          // General project notes
  tags?: string[]         // For categorization and search
}

// Types for API operations - these define the shape of data coming from your frontend
export interface CreateMiniatureRequest {
  name: string
  description?: string
  stageId: string         // The stage where this miniature should start
}

export interface UpdateMiniatureRequest {
  name?: string
  description?: string
  stageId?: string        // For moving between stages
  imageUrl?: string
  estimatedHours?: number
  actualHours?: number
  difficulty?: Miniature['difficulty']
  notes?: string
  tags?: string[]
}

// Database operations for miniatures
export const miniatureDb = {
  // Get all miniatures for a specific user
  // In a production app, you'd always filter by user to prevent data leaks
  async getAllForUser(userId: string): Promise<Miniature[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAMES.MINIATURES,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      
      const response = await docClient.send(command)
      return (response.Items as Miniature[]) || []
    } catch (error) {
      return handleDatabaseError(error, 'get all miniatures', TABLE_NAMES.MINIATURES)
    }
  },

  // Get miniatures in a specific stage - useful for kanban board rendering
  async getAllInStage(userId: string, stageId: string): Promise<Miniature[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAMES.MINIATURES,
        FilterExpression: 'userId = :userId AND stageId = :stageId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':stageId': stageId
        }
      })
      
      const response = await docClient.send(command)
      return (response.Items as Miniature[]) || []
    } catch (error) {
      return handleDatabaseError(error, 'get miniatures in stage', TABLE_NAMES.MINIATURES)
    }
  },

  // Get a single miniature by its ID
  async getById(miniatureId: string): Promise<Miniature | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAMES.MINIATURES,
        Key: { id: miniatureId }
      })
      
      const response = await docClient.send(command)
      return response.Item as Miniature || null
    } catch (error) {
      return handleDatabaseError(error, 'get miniature by ID', TABLE_NAMES.MINIATURES)
    }
  },

  // Create a new miniature
  async create(userId: string, miniatureData: CreateMiniatureRequest): Promise<Miniature> {
    try {
      // Validate the input data using our shared validation utilities
      const name = validateRequiredString(miniatureData.name, 'name')
      const description = validateOptionalString(miniatureData.description, 'description')
      const stageId = validateRequiredString(miniatureData.stageId, 'stageId')

      const now = getCurrentTimestamp()
      const miniature: Miniature = {
        id: generateId('mini'),
        userId,
        name,
        description,
        stageId,
        createdAt: now,
        updatedAt: now,
      }

      const command = new PutCommand({
        TableName: TABLE_NAMES.MINIATURES,
        Item: miniature,
      })

      await docClient.send(command)
      return miniature
    } catch (error) {
      return handleDatabaseError(error, 'create miniature', TABLE_NAMES.MINIATURES)
    }
  },

  // Update an existing miniature
  async update(miniatureId: string, updates: UpdateMiniatureRequest): Promise<Miniature> {
    try {
      const updatedAt = getCurrentTimestamp()
      
      // Build update expression dynamically based on provided updates
      // This approach allows partial updates without overwriting unspecified fields
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, unknown> = {}

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt')
      expressionAttributeNames['#updatedAt'] = 'updatedAt'
      expressionAttributeValues[':updatedAt'] = updatedAt

      // Add each provided update to the expression
      Object.entries(updates).forEach(([key, value], index) => {
        if (value !== undefined) {
          const attrName = `#attr${index}`
          const attrValue = `:val${index}`
          
          updateExpressions.push(`${attrName} = ${attrValue}`)
          expressionAttributeNames[attrName] = key
          
          // Apply validation and transformation based on field type
          if (key === 'name') {
            expressionAttributeValues[attrValue] = validateRequiredString(value, 'name')
          } else if (key === 'description') {
            expressionAttributeValues[attrValue] = validateOptionalString(value, 'description')
          } else {
            expressionAttributeValues[attrValue] = value
          }
        }
      })

      const command = new UpdateCommand({
        TableName: TABLE_NAMES.MINIATURES,
        Key: { id: miniatureId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })

      const response = await docClient.send(command)
      return response.Attributes as Miniature
    } catch (error) {
      return handleDatabaseError(error, 'update miniature', TABLE_NAMES.MINIATURES)
    }
  },

  // Move a miniature to a different stage
  // This is a specialized version of update that's commonly used in kanban workflows
  async moveToStage(miniatureId: string, newStageId: string): Promise<Miniature> {
    return this.update(miniatureId, { stageId: newStageId })
  },

  // Delete a miniature
  async delete(miniatureId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: TABLE_NAMES.MINIATURES,
        Key: { id: miniatureId },
      })

      await docClient.send(command)
    } catch (error) {
      return handleDatabaseError(error, 'delete miniature', TABLE_NAMES.MINIATURES)
    }
  },

  // Count miniatures in each stage for a user - useful for dashboard statistics
  async getStageStatistics(userId: string): Promise<Record<string, number>> {
    try {
      const miniatures = await this.getAllForUser(userId)
      
      // Group miniatures by stage and count them
      const stageCounts: Record<string, number> = {}
      miniatures.forEach(miniature => {
        stageCounts[miniature.stageId] = (stageCounts[miniature.stageId] || 0) + 1
      })
      
      return stageCounts
    } catch (error) {
      return handleDatabaseError(error, 'get stage statistics', TABLE_NAMES.MINIATURES)
    }
  }
}