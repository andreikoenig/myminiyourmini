'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import AuthForm from '@/components/AuthForm'
import { Loader2 } from 'lucide-react'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, checkAuthStatus } = useAuthStore()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [isInitializing, setIsInitializing] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus()
      setIsInitializing(false)
    }
    
    initAuth()
  }, [checkAuthStatus])

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your miniature tracker...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthForm 
        mode={authMode} 
        onModeChange={setAuthMode}
      />
    )
  }

  // Show main app if authenticated
  return <>{children}</>
}