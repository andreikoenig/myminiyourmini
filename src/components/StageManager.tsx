// src/components/StageManager.tsx
'use client'

import { useState } from 'react'
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
import { Plus, Edit2, Trash2, GripVertical, Settings } from 'lucide-react'

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
}

export default function StageManager() {
  const { stages, miniatures, fetchMiniatures } = useMiniatureStore()
  const [isOpen, setIsOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [formData, setFormData] = useState<StageFormData>({
    name: '',
    description: '',
    color: 'gray'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Count miniatures in each stage
  const miniaturesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = miniatures.filter(m => m.stageId === stage.id).length
    return acc
  }, {} as Record<string, number>)

  const handleOpenDialog = (stageId?: string) => {
    if (stageId) {
      const stage = stages.find(s => s.id === stageId)
      if (stage) {
        setEditingStage(stageId)
        setFormData({
          name: stage.name,
          description: stage.description || '',
          color: stage.color
        })
      }
    } else {
      setEditingStage(null)
      setFormData({
        name: '',
        description: '',
        color: 'gray'
      })
    }
    setIsOpen(true)
  }

  const handleCloseDialog = () => {
    setIsOpen(false)
    setEditingStage(null)
    setFormData({ name: '', description: '', color: 'gray' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingStage) {
        // Update existing stage
        await updateStage(editingStage, formData)
      } else {
        // Create new stage
        await createStage(formData)
      }
      
      // Refresh data and close dialog
      await fetchMiniatures()
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save stage:', error)
      // Handle error (could add toast notification here)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    const miniatureCount = miniaturesByStage[stageId] || 0
    if (miniatureCount > 0) {
      alert(`Cannot delete stage with ${miniatureCount} miniatures. Move them to other stages first.`)
      return
    }

    if (confirm('Are you sure you want to delete this stage?')) {
      try {
        await deleteStage(stageId)
        await fetchMiniatures()
      } catch (error) {
        console.error('Failed to delete stage:', error)
      }
    }
  }

  // Placeholder functions - these will be implemented in the store
  const createStage = async (data: StageFormData) => {
    console.log('Creating stage:', data)
    // TODO: Implement in Zustand store
  }

  const updateStage = async (stageId: string, data: StageFormData) => {
    console.log('Updating stage:', stageId, data)
    // TODO: Implement in Zustand store
  }

  const deleteStage = async (stageId: string) => {
    console.log('Deleting stage:', stageId)
    // TODO: Implement in Zustand store
  }

  return (
    <div className="space-y-6">
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
                  ? 'Update the stage details below.'
                  : 'Create a new stage for your painting workflow.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
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

      {/* Stages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage, index) => {
          const colorClasses = getStageColorClasses(stage.color)
          const miniatureCount = miniaturesByStage[stage.id] || 0

          return (
            <Card key={stage.id} className={`border-l-4 ${colorClasses.border} ${colorClasses.background}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <CardTitle className={`text-lg ${colorClasses.text}`}>
                        {stage.name}
                      </CardTitle>
                    </div>
                    {stage.description && (
                      <CardDescription className="mt-1">
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
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStage(stage.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={miniatureCount > 0 || stage.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Helper Text */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>• Drag the grip icons to reorder stages</p>
        <p>• Default stages cannot be deleted but can be edited</p>
        <p>• Stages with miniatures cannot be deleted</p>
      </div>
    </div>
  )
}