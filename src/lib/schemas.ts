// src/lib/schemas.ts
// Database schema definitions for custom stages functionality

// Stage entity definition
export interface Stage {
    id: string              // Unique identifier for the stage
    userId: string          // Which user owns this stage (for future user system)
    name: string            // Display name (e.g., "Base Coating", "Advanced Highlighting")
    description?: string    // Optional description of what happens in this stage
    color: string           // Color theme for visual distinction in kanban board
    sortOrder: number       // Determines display order in kanban board (0, 10, 20, etc.)
    isDefault: boolean      // Whether this stage is part of user's default workflow
    createdAt: string       // When this stage was created
    updatedAt: string       // When this stage was last modified
  }
  
  // Updated miniature interface to reference stages properly
  export interface MiniatureWithStage {
    id: string
    userId: string          // Which user owns this miniature
    name: string
    description: string
    stageId: string         // References Stage.id instead of hardcoded string
    createdAt: string
    updatedAt: string
    
    // Extended fields for future features
    imageUrl?: string       // For miniature photos
    estimatedHours?: number // Time estimation for project planning
    actualHours?: number    // Time tracking for completed projects
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    notes?: string          // General project notes
  }
  
  // Default stage templates that new users start with
  export const DEFAULT_STAGE_TEMPLATES: Omit<Stage, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Queue',
      description: 'Miniatures waiting to be started',
      color: 'gray',
      sortOrder: 0,
      isDefault: true
    },
    {
      name: 'Prime',
      description: 'Ready for priming or currently being primed',
      color: 'yellow',
      sortOrder: 10,
      isDefault: true
    },
    {
      name: 'Base Coat',
      description: 'Applying main colors to large areas',
      color: 'orange',
      sortOrder: 20,
      isDefault: true
    },
    {
      name: 'Wash',
      description: 'Adding shadows and depth with washes',
      color: 'purple',
      sortOrder: 30,
      isDefault: true
    },
    {
      name: 'Highlight',
      description: 'Adding highlights and edge details',
      color: 'pink',
      sortOrder: 40,
      isDefault: true
    },
    {
      name: 'Details',
      description: 'Final details, decals, and finishing touches',
      color: 'indigo',
      sortOrder: 50,
      isDefault: true
    },
    {
      name: 'Basing',
      description: 'Adding terrain, texture, and environmental details to the base',
      color: 'emerald',
      sortOrder: 60,
      isDefault: true
    },
    {
      name: 'Finished',
      description: 'Completed miniatures ready for gaming or display',
      color: 'green',
      sortOrder: 70,
      isDefault: true
    }
  ]
  
  // Type for stage operations that don't require full stage data
  export interface CreateStageRequest {
    name: string
    description?: string
    color: string
    insertAfterStageId?: string  // For inserting new stages between existing ones
  }
  
  export interface UpdateStageRequest {
    name?: string
    description?: string
    color?: string
    sortOrder?: number
  }
  
  // Type for moving miniatures between stages
  export interface MoveMiniatureRequest {
    miniatureId: string
    newStageId: string
    insertIndex?: number  // For future drag-and-drop ordering within stages
  }
  
  // Validation helpers for stage management
  export const validateStageName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'Stage name is required'
    }
    if (name.trim().length > 50) {
      return 'Stage name must be 50 characters or less'
    }
    if (name.trim().length < 2) {
      return 'Stage name must be at least 2 characters'
    }
    return null
  }
  
  export const validateStageColor = (color: string): string | null => {
    const validColors = ['gray', 'yellow', 'orange', 'purple', 'pink', 'indigo', 'emerald', 'green', 'blue', 'red']
    if (!validColors.includes(color)) {
      return `Color must be one of: ${validColors.join(', ')}`
    }
    return null
  }
  
  // Helper function for generating sort order values
  export const generateSortOrder = (existingStages: Stage[], insertAfterStageId?: string): number => {
    if (existingStages.length === 0) {
      return 10 // First stage gets sort order 10
    }
    
    if (!insertAfterStageId) {
      // Insert at the end
      const maxSortOrder = Math.max(...existingStages.map(s => s.sortOrder))
      return maxSortOrder + 10
    }
    
    // Insert after specific stage
    const insertAfterStage = existingStages.find(s => s.id === insertAfterStageId)
    if (!insertAfterStage) {
      // Fallback to end if specified stage not found
      const maxSortOrder = Math.max(...existingStages.map(s => s.sortOrder))
      return maxSortOrder + 10
    }
    
    // Find the next stage after the insertion point
    const sortedStages = existingStages.sort((a, b) => a.sortOrder - b.sortOrder)
    const insertIndex = sortedStages.findIndex(s => s.id === insertAfterStageId)
    const nextStage = sortedStages[insertIndex + 1]
    
    if (!nextStage) {
      // Inserting at the end
      return insertAfterStage.sortOrder + 10
    }
    
    // Insert between two stages
    const gap = nextStage.sortOrder - insertAfterStage.sortOrder
    if (gap > 1) {
      // There's room to insert between
      return insertAfterStage.sortOrder + Math.floor(gap / 2)
    } else {
      // Need to rebalance sort orders to make room
      // This is a more advanced feature we can implement later
      return insertAfterStage.sortOrder + 10
    }
  }