'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
}

export default function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear auth error when user starts typing
    clearError()
  }

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    // Username validation (only for register)
    if (mode === 'register') {
      if (!formData.username) {
        errors.username = 'Username is required'
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        errors.username = 'Username can only contain letters, numbers, underscores, and hyphens'
      }
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const success = mode === 'login' 
      ? await login({ email: formData.email, password: formData.password })
      : await register({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName || formData.username
        })

    if (success) {
      // Form will be hidden by parent component when user becomes authenticated
      console.log(`${mode} successful!`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'login' 
              ? 'Sign in to your miniature tracker account'
              : 'Get started with your painting journey'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className={validationErrors.email ? 'border-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Username Field (Register only) */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="coolpainter123"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={validationErrors.username ? 'border-red-500' : ''}
                />
                {validationErrors.username && (
                  <p className="text-sm text-red-600">{validationErrors.username}</p>
                )}
              </div>
            )}

            {/* Display Name Field (Register only) */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="Your display name"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {validationErrors.password && (
                <p className="text-sm text-red-600">{validationErrors.password}</p>
              )}
              {mode === 'register' && (
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <Button
                variant="link"
                className="p-0 ml-1 h-auto font-semibold"
                onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
                disabled={isLoading}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
