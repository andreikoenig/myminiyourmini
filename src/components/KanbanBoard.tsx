// src/components/KanbanBoard.tsx - Full width version
'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useMiniatureStore } from '@/stores/miniatureStore'
import { getStageColorClasses } from '@/lib/stageDb'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function KanbanBoard() {
  const {
    miniatures,
    stages,
    isLoading,
    error,
    updateMiniature,
  } = useMiniatureStore()

  // Local state for optimistic updates during drag operations
  const [optimisticMiniatures, setOptimisticMiniatures] = useState(miniatures)
  const [dragError, setDragError] = useState<string | null>(null)

  // Update optimistic state when store state changes (this was the bug!)
  useEffect(() => {
    setOptimisticMiniatures(miniatures)
  }, [miniatures])

  // Group miniatures by their current stage using optimistic state
  const miniaturesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = optimisticMiniatures.filter(miniature => miniature.stageId === stage.id)
    return acc
  }, {} as Record<string, typeof optimisticMiniatures>)

  // Handle drag end event
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Clear any previous drag errors
    setDragError(null)

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const miniatureId = draggableId
    const newStageId = destination.droppableId

    // Find the miniature being moved
    const miniature = optimisticMiniatures.find(m => m.id === miniatureId)
    if (!miniature) {
      console.error('Miniature not found:', miniatureId)
      return
    }

    // Optimistic update: immediately update the UI
    const updatedMiniatures = optimisticMiniatures.map(m =>
      m.id === miniatureId ? { ...m, stageId: newStageId } : m
    )
    setOptimisticMiniatures(updatedMiniatures)

    try {
      // Call the API to persist the change
      await updateMiniature(miniatureId, { stageId: newStageId })

      console.log(`Successfully moved ${miniature.name} to new stage`)

    } catch (error) {
      // API call failed - revert the optimistic update
      console.error('Failed to move miniature:', error)
      setOptimisticMiniatures(miniatures) // Revert to original state
      setDragError('Failed to move miniature. Please try again.')

      // Clear error after 5 seconds
      setTimeout(() => setDragError(null), 5000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading your painting workflow...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">
          No painting stages configured. Add some miniatures to get started!
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Kanban Board Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Painting Workflow
        </h2>
        <p className="text-gray-600">
          Drag miniatures between stages to track your painting progress
        </p>
      </div>

      {/* Drag Error Display */}
      {dragError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{dragError}</p>
        </div>
      )}

      {/* Drag and Drop Context - RESPONSIVE WITH WRAPPING */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="w-full">
          {/* UPDATED: CSS Grid with auto-fit for responsive wrapping */}
          <div className="grid gap-6 pb-6" style={{ 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            minHeight: '320px'
          }}>
            {stages.map((stage) => {
              const stageMiniatures = miniaturesByStage[stage.id] || []

              return (
                <div key={stage.id} className="w-full">
                  {/* Unified Swimlane Container - Title + Cards in one gray box */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          bg-gray-100 rounded-lg min-h-[320px] transition-all duration-200 border-2 border-gray-300
                          ${snapshot.isDraggingOver
                            ? 'bg-blue-100 ring-2 ring-blue-300 ring-opacity-50 border-blue-400'
                            : 'hover:bg-gray-50 hover:border-gray-400'
                          }
                        `}
                      >
                        {/* Title inside the swimlane */}
                        <div className="p-3 pb-2 border-b border-gray-200/50">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-base font-semibold ${getStageColorClasses(stage.color).text}`}>
                              {stage.name}
                            </h3>
                            <Badge variant="secondary" className="bg-white/80 text-gray-600 text-xs px-2 py-0.5">
                              {stageMiniatures.length}
                            </Badge>
                          </div>
                          {stage.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {stage.description}
                            </p>
                          )}
                        </div>

                        {/* Cards area */}
                        <div className="p-2">
                          <div className="space-y-2">
                            {stageMiniatures.length === 0 ? (
                              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                                <p className="text-gray-500 text-xs font-medium">
                                  {snapshot.isDraggingOver ? 'Drop miniature here' : `Drop miniatures here`}
                                </p>
                              </div>
                            ) : (
                              stageMiniatures.map((miniature, index) => (
                                <Draggable
                                  key={miniature.id}
                                  draggableId={miniature.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`
                                        ${snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''}
                                        transition-transform duration-200
                                      `}
                                    >
                                      <Card
                                        className={`
                                          kanban-card hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing
                                          border-l-4 ${getStageColorClasses(stage.color).border} bg-white py-1
                                          ${snapshot.isDragging
                                            ? 'shadow-2xl ring-2 ring-blue-400 ring-opacity-75'
                                            : 'hover:shadow-md hover:-translate-y-1'
                                          }
                                        `}
                                        style={{
                                          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                          transitionDuration: snapshot.isDragging ? '0ms' : '200ms'
                                        }}
                                      >
                                        <div className="px-2">
                                          {/* Title and description */}
                                          <div className="mb-1">
                                            <div className="text-sm font-medium text-gray-900 leading-tight">
                                              {miniature.name}
                                            </div>
                                            {miniature.description && (
                                              <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                {miniature.description}
                                              </div>
                                            )}
                                          </div>

                                          {/* Metadata */}
                                          <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-400">
                                              {new Date(miniature.createdAt).toLocaleDateString()}
                                            </div>
                                            
                                            {/* Drag indicator */}
                                            <div className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                                              </svg>
                                            </div>
                                          </div>

                                          {snapshot.isDragging && (
                                            <div className="mt-1 text-xs text-blue-600 font-medium text-center bg-blue-50 rounded px-2 py-0.5">
                                              Drop in any stage...
                                            </div>
                                          )}
                                        </div>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Summary Stats */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{optimisticMiniatures.length}</span> total miniatures across{' '}
            <span className="font-medium">{stages.length}</span> stages
          </div>
          <div className="text-sm text-gray-500">
            {optimisticMiniatures.filter(m => {
              const stage = stages.find(s => s.id === m.stageId)
              return stage?.name === 'Finished'
            }).length} completed
          </div>
        </div>
      </div>
    </div>
  )
}