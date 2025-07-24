// src/components/AuthDebugPanel.tsx
'use client'

import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState, useCallback } from 'react'

interface DebugUser {
  id: string
  email: string
  username: string
  createdAt: string
  hasPassword: boolean
}

export function AuthDebugPanel() {
  const { user, token, error } = useAuthStore()
  const [dbUsers, setDbUsers] = useState<DebugUser[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/debug/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        setDbUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch debug users:', err)
    }
  }, [token])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white border rounded-lg shadow-lg max-w-sm text-xs">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      
      <div className="space-y-1">
        <div>
          <strong>User:</strong> {user ? `${user.username} (${user.email})` : 'None'}
        </div>
        <div>
          <strong>Token:</strong> {token ? 'Present' : 'Missing'}
        </div>
        <div>
          <strong>Error:</strong> {error || 'None'}
        </div>
        <div>
          <strong>DB Users:</strong> {dbUsers.length}
          {dbUsers.map((u, i) => (
            <div key={i} className="ml-2">{u.email}</div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={fetchUsers}
        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Refresh
      </button>
    </div>
  )
}