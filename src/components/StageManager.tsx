// src/components/StageManager.tsx - List view only with position field
'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useMiniatureStore } from '@/stores/miniatureStore'
import { getStageColorClasses } from '@/lib/stageDb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Trash2, GripVertical, AlertCircle } from 'lucide-react'

// Available colors for stages
const STAGE_COLORS = [
  { value: 'gray', label: 'Gray', preview: 'bg-gray-400' },
  { value: 'yellow', label: 'Yellow', preview: 'bg-yellow-400' },
  { value: 'orange', label: 'Orange', preview: 'bg-orange-400' },
  { value: 'purple', label: 'Purple', preview: 'bg-purple-400' },
  { value: 'pink', label: 'Pink', preview: 'bg-pink-400' },
  { value: 'indigo', label: 'Indigo', preview: 'bg-indigo-400' },
  { value: 'emerald', label: 'Emerald', preview: 'bg-emerald-600' },
  { value: 'green', label: 'Green', preview: 'bg-green-400' },
  { value: 'blue', label: 'Blue', preview: 'bg-blue-400' },
  { value: 'red', label: 'Red', preview: 'bg-red-400' },
]

interface StageFormData {
  name: string
  description: string
  color: string
  position: number
}

export default function StageManager() {
  const { 
    stages, 
    miniatures, 
    isLoading,
    error,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    clearError
  } = useMiniatureStore()

  const [isOpen, setIsOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [formData, setFormData] = useState<StageFormData>({
    name: '',
    description: '',
    color: 'gray',
    position: 1
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [optimisticStages, setOptimisticStages] = useState(stages)
  const [dragError, setDragError] = useState<string | null>(null)

  // Update optimistic state when store state changes
  useState(() => {
    setOptimisticStages([...stages]) // Create new array to trigger re-render
  })

  // Count miniatures in each stage
  const miniaturesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = miniatures.filter(m => m.stageId === stage.id).length
    return acc
  }, {} as Record<string, number>)

  // Handle drag end for stage reordering
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Clear any previous drag errors
    setDragError(null)

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (destination.index === source.index) {
      return
    }

    // Optimistic update: immediately reorder the stages in the UI
    const reorderedStages = Array.from(optimisticStages)
    const [movedStage] = reorderedStages.splice(source.index, 1)
    reorderedStages.splice(destination.index, 0, movedStage)
    
    setOptimisticStages(reorderedStages)

    try {
      // Call the API to persist the new order
      const orderedStageIds = reorderedStages.map(stage => stage.id)
      await reorderStages(orderedStageIds)

      console.log('Successfully reordered stages')

    } catch (error) {
      // API call failed - revert the optimistic update
      console.error('Failed to reorder stages:', error)
      setOptimisticStages(stages) // Revert to original order
      setDragError('Failed to reorder stages. Please try again.')

      // Clear error after 5 seconds
      setTimeout(() => setDragError(null), 5000)
    }
  }

  const handleOpenDialog = (stageId?: string) => {
    if (stageId) {
      const stage = stages.find(s => s.id === stageId)
      if (stage) {
        setEditingStage(stageId)
        const currentIndex = stages.findIndex(s => s.id === stageId)
        setFormData({
          name: stage.name,
          description: stage.description || '',
          color: stage.color,
          position: currentIndex + 1
        })
      }
    } else {
      setEditingStage(null)
      setFormData({
        name: '',
        description: '',
        color: 'gray',
        position: stages.length + 1 // Default to end of list
      })
    }
    setIsOpen(true)
  }

  const handleCloseDialog = () => {
    setIsOpen(false)
    setEditingStage(null)
    setFormData({ name: '', description: '', color: 'gray', position: 1 })
    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingStage) {
        // For editing, first update the stage properties
        await updateStage(editingStage, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color
        })

        // Then handle position change if needed
        const currentIndex = optimisticStages.findIndex(s => s.id === editingStage)
        const newIndex = formData.position - 1 // Convert to 0-based index
        
        if (currentIndex !== newIndex && currentIndex !== -1) {
          // Create new order with the stage moved to the desired position
          const reorderedStages = [...optimisticStages]
          const [movedStage] = reorderedStages.splice(currentIndex, 1)
          reorderedStages.splice(newIndex, 0, movedStage)
          
          const orderedStageIds = reorderedStages.map(stage => stage.id)
          await reorderStages(orderedStageIds)
        }
      } else {
        // For creating a new stage - we need to handle position during creation
        const desiredPosition = formData.position - 1 // Convert to 0-based index
        
        // Create stage data with position information
        const stageData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          // Pass the desired position to the API
          insertAtPosition: desiredPosition
        }

        await addStage(stageData)
      }
      
      // Close dialog on success
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save stage:', error)
      // Error handling is managed by the store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId)
    const miniatureCount = miniaturesByStage[stageId] || 0
    
    if (miniatureCount > 0) {
      alert(`Cannot delete "${stage?.name}" stage with ${miniatureCount} miniatures. Move them to other stages first.`)
      return
    }

    if (stage?.isDefault) {
      alert('Cannot delete default stages. You can edit them instead.')
      return
    }

    if (confirm(`Are you sure you want to delete the "${stage?.name}" stage?`)) {
      try {
        await deleteStage(stageId)
      } catch (error) {
        console.error('Failed to delete stage:', error)
        // Error handling is managed by the store
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading stages...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(error || dragError) && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error || dragError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearError()
              setDragError(null)
            }}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Manage Stages</h2>
          <p className="text-gray-600">Customize your painting workflow</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage ? 'Edit Stage' : 'Add New Stage'}
              </DialogTitle>
              <DialogDescription>
                {editingStage 
                  ? 'Update the stage details and position below.'
                  : 'Create a new stage for your painting workflow.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Stage Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Advanced Highlighting"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select 
                    value={formData.position.toString()} 
                    onValueChange={(value: string) => setFormData(prev => ({ ...prev, position: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: stages.length + 1 }, (_, i) => i + 1).map((position) => (
                        <SelectItem key={position} value={position.toString()}>
                          Position {position}
                          {position === 1 && ' (First)'}
                          {position === stages.length + 1 && !editingStage && ' (Last)'}
                          {position === stages.length && editingStage && ' (Last)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what happens in this stage..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Theme</Label>
                <Select 
                  value={formData.color} 
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.preview}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingStage ? 'Update Stage' : 'Create Stage')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List View with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="stages-list">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-4 ${
                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-4' : ''
              }`}
            >
              {optimisticStages.map((stage, index) => {
                const colorClasses = getStageColorClasses(stage.color)
                const miniatureCount = miniaturesByStage[stage.id] || 0

                return (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`
                          ${snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''}
                          transition-transform
                        `}
                      >
                        <Card 
                          className={`
                            border-l-4 ${colorClasses.border} ${colorClasses.background}
                            ${snapshot.isDragging 
                              ? 'shadow-2xl ring-2 ring-blue-300' 
                              : 'hover:shadow-lg'
                            }
                            transition-all duration-200
                          `}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/50 rounded">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <CardTitle className={`text-lg ${colorClasses.text}`}>
                                    {stage.name}
                                  </CardTitle>
                                </div>
                                {stage.description && (
                                  <CardDescription className="mt-1 ml-7">
                                    {stage.description}
                                  </CardDescription>
                                )}
                              </div>
                              <Badge variant="secondary" className="bg-white/80">
                                {miniatureCount}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-500">
                                Position: {index + 1}
                                {stage.isDefault && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(stage.id)}
                                  className="h-8 w-8 p-0"
                                  title="Edit stage"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStage(stage.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  disabled={miniatureCount > 0 || stage.isDefault}
                                  title={
                                    stage.isDefault 
                                      ? "Cannot delete default stages" 
                                      : miniatureCount > 0 
                                        ? `Cannot delete stage with ${miniatureCount} miniatures`
                                        : "Delete stage"
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Stage Management Tips:</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Drag the grip icons to reorder stages</p>
          <p>• Use the position field in the form to set exact placement</p>
          <p>• Default stages cannot be deleted but can be edited</p>
          <p>• Stages with miniatures cannot be deleted - move miniatures to other stages first</p>
          <p>• New miniatures automatically start in the first stage</p>
        </div>
      </div>

      {/* Stage Statistics */}
      {stages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Stage Statistics:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {optimisticStages.map((stage) => {
              const count = miniaturesByStage[stage.id] || 0
              const colorClasses = getStageColorClasses(stage.color)
              
              return (
                <div key={stage.id} className="text-center">
                  <div className={`text-2xl font-bold ${colorClasses.text}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-600 truncate" title={stage.name}>
                    {stage.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}