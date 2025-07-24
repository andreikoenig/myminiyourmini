import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simplified interfaces for now to get it working
interface PublicUser {
  id: string
  email: string
  username: string
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
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>
  register: (userData: RegisterRequest) => Promise<boolean>
  logout: () => void
  clearError: () => void
  checkAuthStatus: () => Promise<void>
  
  // Computed properties that AuthWrapper expects
  isAuthenticated: boolean
  
  // Utility functions
  getAuthHeaders: () => Record<string, string>
}

// Create the auth store with REAL API functionality
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Computed property for authentication status
      get isAuthenticated() {
        return !!get().user && !!get().token
      },

      // Clear error messages
      clearError: () => set({ error: null }),

      // REAL login implementation
      login: async (credentials: LoginRequest) => {
        console.log('[AuthStore] Starting login for:', credentials.email)
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          })

          const data: AuthResponse = await response.json()
          console.log('[AuthStore] Login response:', { success: data.success, hasUser: !!data.user, hasToken: !!data.token })

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed')
          }

          if (!data.user || !data.token) {
            throw new Error('Invalid response from server')
          }

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
          })

          console.log('[AuthStore] Login successful for user:', data.user.username)
          return true

        } catch (error) {
          console.error('[AuthStore] Login error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          
          set({
            error: errorMessage,
            isLoading: false,
            user: null,
            token: null,
          })
          return false
        }
      },

      // REAL register implementation
      register: async (userData: RegisterRequest) => {
        console.log('[AuthStore] Starting registration for:', userData.email)
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          })

          const data: AuthResponse = await response.json()
          console.log('[AuthStore] Register response:', { success: data.success, hasUser: !!data.user, hasToken: !!data.token })

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Registration failed')
          }

          if (!data.user || !data.token) {
            throw new Error('Invalid response from server')
          }

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
          })

          console.log('[AuthStore] Registration successful for user:', data.user.username)
          return true

        } catch (error) {
          console.error('[AuthStore] Registration error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Registration failed'
          
          set({
            error: errorMessage,
            isLoading: false,
            user: null,
            token: null,
          })
          return false
        }
      },

      // Logout action
      logout: () => {
        console.log('[AuthStore] Logging out')
        set({
          user: null,
          token: null,
          error: null,
        })
      },

      // Check auth status using /me endpoint
      checkAuthStatus: async () => {
        const { token } = get()
        
        if (!token) {
          console.log('[AuthStore] No token found, skipping auth check')
          return
        }

        console.log('[AuthStore] Checking auth status with existing token')
        
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          const data: AuthResponse = await response.json()

          if (!response.ok || !data.success || !data.user) {
            console.log('[AuthStore] Auth check failed, clearing token')
            set({ user: null, token: null, error: null })
            return
          }

          console.log('[AuthStore] Auth check successful for user:', data.user.username)
          set({ user: data.user, error: null })

        } catch (error) {
          console.error('[AuthStore] Auth check error:', error)
          set({ user: null, token: null, error: null })
        }
      },

      // Get headers for authenticated requests
      getAuthHeaders: (): Record<string, string> => {
        const { token } = get()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)

// Export the interfaces for use in other files
export type { PublicUser, LoginRequest, RegisterRequest, AuthResponse }