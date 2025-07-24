// src/lib/userDb.ts
// Database operations for user management and authentication

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { 
  PutCommand, 
  ScanCommand, 
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb'
import { 
  docClient, 
  handleDatabaseError, 
  generateId, 
  getCurrentTimestamp,
  validateRequiredString,
} from './database'
import { 
  User, 
  PublicUser, 
  LoginRequest, 
  RegisterRequest, 
  SessionData,
  validateEmail,
  validateUsername,
  validatePassword
} from './userSchema'

// JWT secret - in production this should be a proper secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days

// Add users table to your table names
const USERS_TABLE = 'Users'

export const userDb = {
  // Create a new user account
  async createUser(userData: RegisterRequest): Promise<{ user: PublicUser; token: string }> {
    try {
      // Validate input data
      const email = validateRequiredString(userData.email, 'email')
      const username = validateRequiredString(userData.username, 'username')
      const password = validateRequiredString(userData.password, 'password')

      // Validate email format
      const emailError = validateEmail(email)
      if (emailError) throw new Error(emailError)

      // Validate username format
      const usernameError = validateUsername(username)
      if (usernameError) throw new Error(usernameError)

      // Validate password strength
      const passwordError = validatePassword(password)
      if (passwordError) throw new Error(passwordError)

      // Check if email already exists
      const existingUserByEmail = await this.getUserByEmail(email)
      if (existingUserByEmail) {
        throw new Error('An account with this email already exists')
      }

      // Check if username already exists
      const existingUserByUsername = await this.getUserByUsername(username)
      if (existingUserByUsername) {
        throw new Error('This username is already taken')
      }

      // Hash the password
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      const now = getCurrentTimestamp()
      const user: User = {
        id: generateId('user'),
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        createdAt: now,
        updatedAt: now,
      }

      // Save user to database
      const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: user,
      })

      await docClient.send(command)

      // Generate JWT token
      const token = this.generateToken(user)

      // Return public user data and token
      return {
        user: this.toPublicUser(user),
        token
      }
    } catch (error) {
      return handleDatabaseError(error, 'create user', USERS_TABLE)
    }
  },

  // Authenticate user login
  async authenticateUser(credentials: LoginRequest): Promise<{ user: PublicUser; token: string } | null> {
    try {
      const email = validateRequiredString(credentials.email, 'email')
      const password = validateRequiredString(credentials.password, 'password')

      // Find user by email
      const user = await this.getUserByEmail(email)
      if (!user) {
        return null // User not found
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        return null // Invalid password
      }

      // Update last login time
      await this.updateLastLogin(user.id)

      // Generate JWT token
      const token = this.generateToken(user)

      return {
        user: this.toPublicUser(user),
        token
      }
    } catch (error) {
      return handleDatabaseError(error, 'authenticate user', USERS_TABLE)
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const command = new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      })
      
      const response = await docClient.send(command)
      const users = response.Items as User[]
      
      return users.length > 0 ? users[0] : null
    } catch (error) {
      return handleDatabaseError(error, 'get user by email', USERS_TABLE)
    }
  },

  // Get user by username
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const command = new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': username.toLowerCase()
        }
      })
      
      const response = await docClient.send(command)
      const users = response.Items as User[]
      
      return users.length > 0 ? users[0] : null
    } catch (error) {
      return handleDatabaseError(error, 'get user by username', USERS_TABLE)
    }
  },

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const command = new GetCommand({
        TableName: USERS_TABLE,
        Key: { id: userId }
      })
      
      const response = await docClient.send(command)
      return response.Item as User || null
    } catch (error) {
      return handleDatabaseError(error, 'get user by ID', USERS_TABLE)
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<PublicUser>): Promise<PublicUser> {
    try {
      const updatedAt = getCurrentTimestamp()
      
      // Build update expression dynamically
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, unknown> = {}

      // Always update updatedAt
      updateExpressions.push('#updatedAt = :updatedAt')
      expressionAttributeNames['#updatedAt'] = 'updatedAt'
      expressionAttributeValues[':updatedAt'] = updatedAt

      // Add other updates if provided
      Object.entries(updates).forEach(([key, value], index) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const attrName = `#attr${index}`
          const attrValue = `:val${index}`
          
          updateExpressions.push(`${attrName} = ${attrValue}`)
          expressionAttributeNames[attrName] = key
          
          // Apply validation based on field type
          if (key === 'email') {
            const emailError = validateEmail(value as string)
            if (emailError) throw new Error(emailError)
            expressionAttributeValues[attrValue] = (value as string).toLowerCase()
          } else if (key === 'username') {
            const usernameError = validateUsername(value as string)
            if (usernameError) throw new Error(usernameError)
            expressionAttributeValues[attrValue] = (value as string).toLowerCase()
          } else {
            expressionAttributeValues[attrValue] = value
          }
        }
      })

      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })

      const response = await docClient.send(command)
      return this.toPublicUser(response.Attributes as User)
    } catch (error) {
      return handleDatabaseError(error, 'update user profile', USERS_TABLE)
    }
  },

  // Update last login timestamp
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { id: userId },
        UpdateExpression: 'SET lastLoginAt = :lastLoginAt',
        ExpressionAttributeValues: {
          ':lastLoginAt': getCurrentTimestamp()
        }
      })

      await docClient.send(command)
    } catch (error) {
      // Don't throw error for this non-critical operation
      console.warn('Failed to update last login:', error)
    }
  },

// Generate JWT token for user
generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    // Don't manually set exp - let expiresIn handle it
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
},

  async getAllUsers(): Promise<User[]> {
    try {
      const command = new ScanCommand({
        TableName: USERS_TABLE,
      })
      
      const response = await docClient.send(command)
      return (response.Items as User[]) || []
    } catch (error) {
      return handleDatabaseError(error, 'get all users', USERS_TABLE)
    }
  },

  // Verify JWT token and return user data
  async verifyToken(token: string): Promise<PublicUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SessionData
      const user = await this.getUserById(decoded.userId)
      
      if (!user) {
        return null
      }

      return this.toPublicUser(user)
    } catch (error) {
      console.warn('Token verification failed:', error)
      return null
    }
  },

  // Convert User to PublicUser (remove sensitive data)
  toPublicUser(user: User): PublicUser {
    const { ...publicUser } = user
    return {
      ...publicUser,
      displayName: user.username
    }
  }
}

// Middleware helper for extracting user from request headers
export const getUserFromRequest = async (authHeader: string | null): Promise<PublicUser | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  return await userDb.verifyToken(token)
}