'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMiniatureStore } from '@/stores/miniatureStore'
import { useAuthStore } from '@/stores/authStore'
import { getStageColorClasses } from '@/lib/stageDb'
import KanbanBoard from '@/components/KanbanBoard'
import StageManager from '@/components/StageManager'
import UserMenu from '@/components/UserMenu'

export default function MiniatureTracker() {
  // Get authenticated user
  const { user } = useAuthStore()
  
  // Get state and actions from Zustand store
  const {
    miniatures,
    isLoading,
    error,
    fetchMiniatures,
    addMiniature,
    // moveToNextStage,
    // moveToPreviousStage,
    clearError,
    getStageForMiniature,
    // getNextStage,
    // getPreviousStage
  } = useMiniatureStore()

  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'stages'>('kanban')

  // Fetch miniatures when component mounts
  useEffect(() => {
    fetchMiniatures()
  }, [fetchMiniatures])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.name.trim()) {
      return
    }

    // Add miniature via Zustand store
    await addMiniature({
      name: formData.name.trim(),
      description: formData.description.trim()
    })

    // Reset form on success (only if no error occurred)
    if (!error) {
      setFormData({ name: '', description: '' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with user menu */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              My Mini, Your Mini
            </h1>
            <p className="text-lg text-gray-600">
              Welcome back, {user?.username}! Track your miniature painting progress.
            </p>
          </div>
          <UserMenu />
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-red-700">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearError}
                  className="text-red-700 border-red-200 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add New Miniature Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Miniature</CardTitle>
            <CardDescription>
              Start tracking a new miniature painting project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Miniature Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g., Space Marine Captain"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Optional notes about this miniature..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Miniature'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && miniatures.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Loading your miniatures...
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Your Miniatures ({miniatures.length})
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('stages')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'stages'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Settings className="h-4 w-4 mr-1 inline" />
              Manage Stages
            </button>
          </div>
        </div>

        {/* Conditional View Rendering */}
        {miniatures.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No miniatures yet. Add your first one above to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'kanban' ? (
              <KanbanBoard />
            ) : viewMode === 'stages' ? (
              <StageManager />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {miniatures.map((miniature) => {
                  const currentStage = getStageForMiniature(miniature.id)
                  const colorClasses = currentStage ? getStageColorClasses(currentStage.color) : getStageColorClasses('gray')

                  return (
                    <Card
                      key={miniature.id}
                      className={`hover:shadow-xl transition-all duration-300 border-l-4 ${colorClasses.border} ${colorClasses.background}`}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{miniature.name}</CardTitle>
                            <CardDescription>
                              Stage: <span className={`font-semibold ${colorClasses.text}`}>
                                {currentStage?.name || 'Unknown'}
                              </span>
                            </CardDescription>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(miniature.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardHeader>
                      {/* <CardContent>
                        {miniature.description && (
                          <p className="text-gray-600 mb-4">{miniature.description}</p>
                        )} */}

                        {/* Stage Control Buttons */}
                        {/* <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveToPreviousStage(miniature.id)}
                            disabled={!getPreviousStage(miniature.id)}
                          >
                            ← Previous
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => moveToNextStage(miniature.id)}
                            disabled={!getNextStage(miniature.id)}
                          >
                            Next →
                          </Button>
                        </div> */}
                      {/* </CardContent> */}
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}