import { create } from 'zustand'
import { Stage } from '@/lib/schemas'
import { useAuthStore } from './authStore'

// Define the miniature interface (matches your API)
export interface Miniature {
  id: string
  userId: string
  name: string
  description: string
  stageId: string
  createdAt: string
  updatedAt: string
}

// API response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  allStages?: Stage[] // For stage creation with positioning
}

// Store state interface
interface MiniatureState {
  // State
  miniatures: Miniature[]
  stages: Stage[]
  isLoading: boolean
  error: string | null
  
  // Miniature Actions
  fetchMiniatures: () => Promise<void>
  addMiniature: (data: { name: string; description: string }) => Promise<void>
  updateMiniature: (id: string, updates: Partial<Miniature>) => Promise<void>
  deleteMiniature: (id: string) => Promise<void>
  
  // Stage Actions
  addStage: (data: { name: string; description?: string; color: string; insertAtPosition?: number }) => Promise<void>
  updateStage: (id: string, updates: { name?: string; description?: string; color?: string }) => Promise<void>
  deleteStage: (id: string) => Promise<void>
  reorderStages: (orderedStageIds: string[]) => Promise<void>
  
  // Utility Actions
  clearError: () => void
  
  // Helper functions for the Kanban board
  getStageForMiniature: (miniatureId: string) => Stage | null
  getMiniaturesInStage: (stageId: string) => Miniature[]
}

// API helper functions with auth
const apiCall = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    // Get auth headers from auth store
    const authHeaders = useAuthStore.getState().getAuthHeaders()
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('API call failed:', error)
    throw error instanceof Error ? error : new Error('Unknown API error')
  }
}

// Create the Zustand store
export const useMiniatureStore = create<MiniatureState>((set, get) => ({
  // Initial state
  miniatures: [],
  stages: [],
  isLoading: false,
  error: null,

  // Clear any error messages
  clearError: () => set({ error: null }),

  // Fetch both miniatures and stages from API
  fetchMiniatures: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Fetch both miniatures and stages in parallel
      const [miniaturesResponse, stagesResponse] = await Promise.all([
        apiCall<ApiResponse<Miniature[]>>('/api/miniatures'),
        apiCall<ApiResponse<Stage[]>>('/api/stages')
      ])
      
      set({ 
        miniatures: miniaturesResponse.data || [],
        stages: stagesResponse.data || [],
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        isLoading: false 
      })
    }
  },

  // Add a new miniature
  addMiniature: async (data: { name: string; description: string }) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiCall<ApiResponse<Miniature>>('/api/miniatures', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (response.data) {
        // Add the new miniature to the current list
        set(() => ({ 
          miniatures: [...get().miniatures, response.data!],
          isLoading: false 
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add miniature',
        isLoading: false 
      })
    }
  },

  // Update a miniature (used by Kanban drag-and-drop)
  updateMiniature: async (id: string, updates: Partial<Miniature>) => {
    set({ error: null })
    
    try {
      const response = await apiCall<ApiResponse<Miniature>>(`/api/miniatures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })

      if (response.data) {
        // Update the miniature in the current list
        set((state) => ({
          miniatures: state.miniatures.map(mini => 
            mini.id === id ? response.data! : mini
          )
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update miniature'
      })
      throw error // Re-throw for optimistic update handling
    }
  },

  // Delete a miniature
  deleteMiniature: async (id: string) => {
    set({ error: null })
    
    try {
      await apiCall(`/api/miniatures/${id}`, {
        method: 'DELETE',
      })

      // Remove the miniature from the current list
      set((state) => ({
        miniatures: state.miniatures.filter(mini => mini.id !== id)
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete miniature'
      })
    }
  },

  // ===== STAGE MANAGEMENT ACTIONS =====

  // Add a new stage
  addStage: async (data: { name: string; description?: string; color: string; insertAtPosition?: number }) => {
    set({ error: null })
    
    try {
      const response = await apiCall<ApiResponse<Stage>>('/api/stages', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (response.data) {
        if (response.allStages) {
          // If the API returned all stages (meaning positioning was handled), use that
          set(() => ({ 
            stages: response.allStages!
          }))
        } else {
          // Otherwise, add the new stage to the current list and resort
          set((state) => ({ 
            stages: [...state.stages, response.data!].sort((a, b) => a.sortOrder - b.sortOrder)
          }))
        }
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add stage'
      })
    }
  },

  // Update a stage
  updateStage: async (id: string, updates: { name?: string; description?: string; color?: string }) => {
    set({ error: null })
    
    try {
      const response = await apiCall<ApiResponse<Stage>>(`/api/stages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })

      if (response.data) {
        // Update the stage in the current list
        set((state) => ({
          stages: state.stages.map(stage => 
            stage.id === id ? response.data! : stage
          )
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update stage'
      })
    }
  },

  // Delete a stage
  deleteStage: async (id: string) => {
    set({ error: null })
    
    try {
      await apiCall(`/api/stages/${id}`, {
        method: 'DELETE',
      })

      // Remove the stage from the current list
      set((state) => ({
        stages: state.stages.filter(stage => stage.id !== id)
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete stage'
      })
    }
  },

  // Reorder stages
  reorderStages: async (orderedStageIds: string[]) => {
    set({ error: null })
    
    try {
      const response = await apiCall<ApiResponse<Stage[]>>('/api/stages', {
        method: 'PUT',
        body: JSON.stringify({ orderedStageIds }),
      })

      if (response.data) {
        // Update the stages with the new order
        set({ stages: response.data })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reorder stages'
      })
      throw error // Re-throw for optimistic update handling
    }
  },

  // ===== HELPER FUNCTIONS =====

  // Helper function to get stage information for a miniature
  getStageForMiniature: (miniatureId: string) => {
    const { miniatures, stages } = get()
    const miniature = miniatures.find(m => m.id === miniatureId)
    if (!miniature) return null
    
    return stages.find(s => s.id === miniature.stageId) || null
  },

  // Helper function to get all miniatures in a specific stage (for Kanban columns)
  getMiniaturesInStage: (stageId: string) => {
    const { miniatures } = get()
    return miniatures.filter(m => m.stageId === stageId)
  },
}))
