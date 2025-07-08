// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simplified interfaces for now to get it working
interface PublicUser {
  id: string
  email: string
  username: string
  displayName: string
  createdAt: string
}

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  username: string
  password: string
  displayName?: string
}

interface AuthResponse {
  success: boolean
  user?: PublicUser
  token?: string
  error?: string
}

// Auth state interface
interface AuthState {
  // State
  user: PublicUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>
  register: (userData: RegisterRequest) => Promise<boolean>
  logout: () => void
  clearError: () => void
  checkAuthStatus: () => Promise<void>
  
  // Utility functions
  getAuthHeaders: () => Record<string, string>
  isTokenExpired: () => boolean
}

// Create the auth store with basic functionality
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Clear error messages
      clearError: () => set({ error: null }),

      // Login action (placeholder for now)
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          // TODO: Implement actual login API call
          console.log('Login attempt:', credentials.email)
          
          // Simulate successful login for now
          set({
            user: { id: '1', email: credentials.email, username: 'testuser', displayName: 'Test User', createdAt: new Date().toISOString() },
            token: 'dummy-token',
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        } catch {
          set({
            error: 'Login failed',
            isLoading: false,
          })
          return false
        }
      },

      // Register action (placeholder for now)
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          // TODO: Implement actual register API call
          console.log('Register attempt:', userData.email)
          
          // Simulate successful registration for now
          set({
            user: { id: '1', email: userData.email, username: userData.username, displayName: 'Test User', createdAt: new Date().toISOString() },
            token: 'dummy-token',
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        } catch {
          set({
            error: 'Registration failed',
            isLoading: false,
          })
          return false
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      // Check auth status (placeholder for now)
      checkAuthStatus: async () => {
        // TODO: Implement token validation
        console.log('Checking auth status...')
      },

      // Get headers for authenticated requests
      getAuthHeaders: (): Record<string, string> => {
        const { token } = get()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },

      // Check if token is expired (placeholder for now)
      isTokenExpired: () => {
        const { token } = get()
        return !token // Simple check for now
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Export the interfaces for use in other files
export type { PublicUser, LoginRequest, RegisterRequest, AuthResponse }