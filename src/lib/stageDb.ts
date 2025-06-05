// src/lib/stagesDb.ts
// Database operations specifically for stage entities

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
  import { Stage, CreateStageRequest, UpdateStageRequest, DEFAULT_STAGE_TEMPLATES, generateSortOrder } from './schemas'
  
  // Database operations for stages
  export const stagesDb = {
    // Get all stages for a user, sorted by sortOrder
    async getAllForUser(userId: string): Promise<Stage[]> {
      try {
        const command = new ScanCommand({
          TableName: TABLE_NAMES.STAGES,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        })
        
        const response = await docClient.send(command)
        const stages = (response.Items as Stage[]) || []
        
        // Sort stages by sortOrder for consistent display
        return stages.sort((a, b) => a.sortOrder - b.sortOrder)
      } catch (error) {
        return handleDatabaseError(error, 'get all stages', TABLE_NAMES.STAGES)
      }
    },
  
    // Get single stage by ID
    async getById(stageId: string): Promise<Stage | null> {
      try {
        const command = new GetCommand({
          TableName: TABLE_NAMES.STAGES,
          Key: { id: stageId }
        })
        
        const response = await docClient.send(command)
        return response.Item as Stage || null
      } catch (error) {
        return handleDatabaseError(error, 'get stage by ID', TABLE_NAMES.STAGES)
      }
    },
  
    // Create a new stage for a user
    async create(userId: string, stageData: CreateStageRequest): Promise<Stage> {
      try {
        // Validate input data
        const name = validateRequiredString(stageData.name, 'name')
        const description = validateOptionalString(stageData.description, 'description')
        
        // Get existing stages to calculate sort order
        const existingStages = await this.getAllForUser(userId)
        
        const now = getCurrentTimestamp()
        const stage: Stage = {
          id: generateId('stage'),
          userId,
          name,
          description,
          color: stageData.color,
          sortOrder: generateSortOrder(existingStages, stageData.insertAfterStageId),
          isDefault: false, // User-created stages are never default
          createdAt: now,
          updatedAt: now,
        }
  
        const command = new PutCommand({
          TableName: TABLE_NAMES.STAGES,
          Item: stage,
        })
  
        await docClient.send(command)
        return stage
      } catch (error) {
        return handleDatabaseError(error, 'create stage', TABLE_NAMES.STAGES)
      }
    },
  
    // Update an existing stage
    async update(stageId: string, updates: UpdateStageRequest): Promise<Stage> {
      try {
        const updatedAt = getCurrentTimestamp()
        
        // Build update expression dynamically based on provided updates
        const updateExpressions: string[] = []
        const expressionAttributeNames: Record<string, string> = {}
        const expressionAttributeValues: Record<string, unknown> = {}
  
        // Always update updatedAt
        updateExpressions.push('#updatedAt = :updatedAt')
        expressionAttributeNames['#updatedAt'] = 'updatedAt'
        expressionAttributeValues[':updatedAt'] = updatedAt
  
        // Add other updates if provided
        Object.entries(updates).forEach(([key, value], index) => {
          if (value !== undefined) {
            const attrName = `#attr${index}`
            const attrValue = `:val${index}`
            
            updateExpressions.push(`${attrName} = ${attrValue}`)
            expressionAttributeNames[attrName] = key
            
            // Apply validation based on field type
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
          TableName: TABLE_NAMES.STAGES,
          Key: { id: stageId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
  
        const response = await docClient.send(command)
        return response.Attributes as Stage
      } catch (error) {
        return handleDatabaseError(error, 'update stage', TABLE_NAMES.STAGES)
      }
    },
  
    // Delete a stage (should only be allowed if no miniatures are in this stage)
    async delete(stageId: string): Promise<void> {
      try {
        const command = new DeleteCommand({
          TableName: TABLE_NAMES.STAGES,
          Key: { id: stageId },
        })
  
        await docClient.send(command)
      } catch (error) {
        return handleDatabaseError(error, 'delete stage', TABLE_NAMES.STAGES)
      }
    },
  
    // Initialize default stages for a new user
    async initializeDefaultStages(userId: string): Promise<Stage[]> {
      try {
        const now = getCurrentTimestamp()
        const defaultStages: Stage[] = DEFAULT_STAGE_TEMPLATES.map((template, index) => ({
          ...template,
          id: generateId('stage'),
          userId,
          createdAt: now,
          updatedAt: now,
        }))
  
        // Create all default stages
        const createPromises = defaultStages.map(stage => 
          docClient.send(new PutCommand({
            TableName: TABLE_NAMES.STAGES,
            Item: stage,
          }))
        )
  
        await Promise.all(createPromises)
        return defaultStages.sort((a, b) => a.sortOrder - b.sortOrder)
      } catch (error) {
        return handleDatabaseError(error, 'initialize default stages', TABLE_NAMES.STAGES)
      }
    },
  
    // Reorder stages by updating their sortOrder values
    async reorderStages(userId: string, orderedStageIds: string[]): Promise<void> {
      try {
        // Update each stage's sortOrder based on its position in the new order
        const updatePromises = orderedStageIds.map((stageId, index) => {
          const newSortOrder = (index + 1) * 10 // 10, 20, 30, etc.
          return this.update(stageId, { sortOrder: newSortOrder })
        })
  
        await Promise.all(updatePromises)
      } catch (error) {
        return handleDatabaseError(error, 'reorder stages', TABLE_NAMES.STAGES)
      }
    }
  }
  
  // Utility function to get stage color classes for Tailwind
  export const getStageColorClasses = (color: string) => {
    const colorMap: Record<string, { border: string; background: string; text: string }> = {
      gray: { border: 'border-l-gray-400', background: 'bg-gradient-to-r from-white to-gray-50', text: 'text-gray-700' },
      yellow: { border: 'border-l-yellow-400', background: 'bg-gradient-to-r from-white to-yellow-50', text: 'text-yellow-700' },
      orange: { border: 'border-l-orange-400', background: 'bg-gradient-to-r from-white to-orange-50', text: 'text-orange-700' },
      purple: { border: 'border-l-purple-400', background: 'bg-gradient-to-r from-white to-purple-50', text: 'text-purple-700' },
      pink: { border: 'border-l-pink-400', background: 'bg-gradient-to-r from-white to-pink-50', text: 'text-pink-700' },
      indigo: { border: 'border-l-indigo-400', background: 'bg-gradient-to-r from-white to-indigo-50', text: 'text-indigo-700' },
      emerald: { border: 'border-l-emerald-600', background: 'bg-gradient-to-r from-white to-emerald-100', text: 'text-emerald-800' },
      green: { border: 'border-l-green-400', background: 'bg-gradient-to-r from-white to-green-50', text: 'text-green-700' },
      blue: { border: 'border-l-blue-400', background: 'bg-gradient-to-r from-white to-blue-50', text: 'text-blue-700' },
      red: { border: 'border-l-red-400', background: 'bg-gradient-to-r from-white to-red-50', text: 'text-red-700' },
    }
    
    return colorMap[color] || colorMap.gray
  }