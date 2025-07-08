// src/lib/userSchema.ts
// User authentication schemas

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string  // bcrypt hashed password
  createdAt: string
  updatedAt: string
}

// Public user data (what gets sent to frontend)
export interface PublicUser {
  id: string
  email: string
  username: string
  displayName: string
  createdAt: string
}

// Authentication request/response types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: PublicUser
  token?: string
  error?: string
}

// Session/JWT payload
export interface SessionData {
  userId: string
  email: string
  username: string
  iat: number  // issued at
  exp: number  // expires at
}

// Validation functions
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  return null
}

export const validateUsername = (username: string): string | null => {
  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters long'
  }
  if (username.length > 30) {
    return 'Username must be 30 characters or less'
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens'
  }
  return null
}

export const validatePassword = (password: string): string | null => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  return null
}