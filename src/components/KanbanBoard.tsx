// src/components/KanbanBoard.tsx
'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useMiniatureStore } from '@/stores/miniatureStore'
import { getStageColorClasses } from '@/lib/stageDb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function KanbanBoard() {
  const {
    miniatures,
    stages,
    isLoading,
    error,
    updateMiniature,
    moveToNextStage,
    moveToPreviousStage,
    getStageForMiniature,
    getNextStage,
    getPreviousStage
  } = useMiniatureStore()

  // Local state for optimistic updates during drag operations
  const [optimisticMiniatures, setOptimisticMiniatures] = useState(miniatures)
  const [dragError, setDragError] = useState<string | null>(null)

  // Update optimistic state when store state changes
  useState(() => {
    setOptimisticMiniatures(miniatures)
  })

  // Group miniatures by their current stage using optimistic state
  const miniaturesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = optimisticMiniatures.filter(miniature => miniature.stageId === stage.id)
    return acc
  }, {} as Record<string, typeof optimisticMiniatures>)

  // Handle drag end event
  const handleDragEnd = async (result: DropResult) => {
    // Disable drop animation for instant movement
    if (result.destination) {
      const element = document.querySelector(`[data-rbd-draggable-id="${result.draggableId}"]`);
      if (element) {
        (element as HTMLElement).style.transition = 'none';
      }
    }

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
    const oldStageId = source.droppableId

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

      // Success! The store will update automatically, and our useEffect will sync
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

      {/* Drag and Drop Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div
            className="flex gap-6 min-w-max pb-6"
            style={{ minWidth: `${stages.length * 320}px` }}
          >
            {stages.map((stage) => {
              const stageColorClasses = getStageColorClasses(stage.color)
              const stageMiniatures = miniaturesByStage[stage.id] || []

              return (
                <div
                  key={stage.id}
                  className="kanban-column flex-shrink-0 w-80"
                >
                  {/* Stage Column Header */}
                  <div
                    className={`
                      rounded-lg p-4 mb-4 border-l-4 
                      ${stageColorClasses.border} 
                      ${stageColorClasses.background}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${stageColorClasses.text}`}>
                        {stage.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="bg-white/80"
                      >
                        {stageMiniatures.length}
                      </Badge>
                    </div>
                    {stage.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {stage.description}
                      </p>
                    )}
                  </div>

                  {/* Droppable Stage Column */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          space-y-3 min-h-[200px] p-2 rounded-lg transition-colors
                          ${snapshot.isDraggingOver
                            ? 'bg-blue-50 border-2 border-blue-200 border-dashed'
                            : 'bg-transparent'
                          }
                        `}
                      >
                        {stageMiniatures.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg">
                            <p className="text-gray-400 text-sm">
                              {snapshot.isDraggingOver ? 'Drop here' : `No miniatures in ${stage.name}`}
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
                                    ${snapshot.isDragging ? 'rotate-3 scale-105' : ''}
                                    transition-transform
                                  `}
                                >
                                  <Card
                                    className={`
                                      kanban-card hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing
                                      border-l-4 ${stageColorClasses.border}
                                      ${snapshot.isDragging
                                        ? 'bg-white shadow-2xl ring-2 ring-blue-300'
                                        : 'bg-white hover:bg-gray-50'
                                      }
                                    `}
                                    style={{
                                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                      transitionDuration: snapshot.isDragging ? '0ms' : '200ms'
                                    }}
                                  >
                                    <CardHeader className="pb-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <CardTitle className="text-base font-medium text-gray-900 leading-tight">
                                            {miniature.name}
                                          </CardTitle>
                                          {miniature.description && (
                                            <CardDescription className="text-xs text-gray-500 mt-1 line-clamp-2">
                                              {miniature.description}
                                            </CardDescription>
                                          )}
                                        </div>
                                      </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                      {/* Miniature Actions - Only show when not dragging */}
                                      {!snapshot.isDragging && (
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              moveToPreviousStage(miniature.id)
                                            }}
                                            disabled={!getPreviousStage(miniature.id)}
                                          >
                                            ← Prev
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              moveToNextStage(miniature.id)
                                            }}
                                            disabled={!getNextStage(miniature.id)}
                                          >
                                            Next →
                                          </Button>
                                        </div>
                                      )}

                                      {/* Metadata */}
                                      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                                        <span>Added {new Date(miniature.createdAt).toLocaleDateString()}</span>
                                        {snapshot.isDragging && (
                                          <span className="text-blue-600 font-medium">Dragging...</span>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
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