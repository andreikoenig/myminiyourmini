// src/stores/miniatureStore.ts
import { create } from 'zustand'
import { Stage } from '@/lib/schemas'

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

// Define the painting stages
export const PAINTING_STAGES = [
  'Queue',
  'Prime',
  'Base Coat',
  'Wash',
  'Highlight',
  'Details',
  'Basing',
  'Finished'
] as const

// API response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Store state interface
interface MiniatureState {
  // State
  miniatures: Miniature[]
  stages: Stage[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchMiniatures: () => Promise<void>
  addMiniature: (data: { name: string; description: string }) => Promise<void>
  updateMiniature: (id: string, updates: Partial<Miniature>) => Promise<void>
  deleteMiniature: (id: string) => Promise<void>
  moveToNextStage: (id: string) => Promise<void>
  moveToPreviousStage: (id: string) => Promise<void>
  clearError: () => void
  
  // Helper functions
  getStageForMiniature: (miniatureId: string) => Stage | null
  getNextStage: (miniatureId: string) => Stage | null
  getPreviousStage: (miniatureId: string) => Stage | null
}

// API helper functions
const apiCall = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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
        set((state) => ({ 
          miniatures: [...state.miniatures, response.data!],
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

  // Update a miniature (generic update function)
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

  // Move miniature to next stage
  moveToNextStage: async (id: string) => {
    const { getNextStage, updateMiniature } = get()
    const nextStage = getNextStage(id)
    
    if (nextStage) {
      await updateMiniature(id, { stageId: nextStage.id })
    }
  },

  // Move miniature to previous stage
  moveToPreviousStage: async (id: string) => {
    const { getPreviousStage, updateMiniature } = get()
    const previousStage = getPreviousStage(id)
    
    if (previousStage) {
      await updateMiniature(id, { stageId: previousStage.id })
    }
  },

  // Helper function to get stage information for a miniature
  getStageForMiniature: (miniatureId: string) => {
    const { miniatures, stages } = get()
    const miniature = miniatures.find(m => m.id === miniatureId)
    if (!miniature) return null
    
    return stages.find(s => s.id === miniature.stageId) || null
  },

  // Helper function to get the next stage for a miniature
  getNextStage: (miniatureId: string) => {
    const { miniatures, stages } = get()
    const miniature = miniatures.find(m => m.id === miniatureId)
    if (!miniature) return null
    
    const currentStage = stages.find(s => s.id === miniature.stageId)
    if (!currentStage) return null
    
    const sortedStages = stages.sort((a, b) => a.sortOrder - b.sortOrder)
    const currentIndex = sortedStages.findIndex(s => s.id === currentStage.id)
    
    return sortedStages[currentIndex + 1] || null
  },

  // Helper function to get the previous stage for a miniature
  getPreviousStage: (miniatureId: string) => {
    const { miniatures, stages } = get()
    const miniature = miniatures.find(m => m.id === miniatureId)
    if (!miniature) return null
    
    const currentStage = stages.find(s => s.id === miniature.stageId)
    if (!currentStage) return null
    
    const sortedStages = stages.sort((a, b) => a.sortOrder - b.sortOrder)
    const currentIndex = sortedStages.findIndex(s => s.id === currentStage.id)
    
    return sortedStages[currentIndex - 1] || null
  },
}))