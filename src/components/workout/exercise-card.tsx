"use client"

import { useEffect, useState } from "react"
import { Dumbbell, Check, X, Edit2, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ExerciseCard as ExerciseCardType } from "@/types/workout-card"

interface ExerciseCardProps {
  card: ExerciseCardType
  onChange: (updatedCard: ExerciseCardType) => void
  onDelete?: (cardId: string) => void
  onDuplicate?: (updatedCard: ExerciseCardType) => void
}

/**
 * ExerciseCard Component
 *
 * Displays a single exercise with conditional field visibility.
 * - Display mode: Show only populated fields
 * - Edit mode: Show all fields with inputs
 *   - Click/tap the card or use the edit button (always visible)
 * - Re-hide empty fields after save
 */
export function ExerciseCard({ card, onChange, onDelete, onDuplicate }: ExerciseCardProps) {
  const [isEditing, setIsEditing] = useState(card.isEditing || false)
  const [editedCard, setEditedCard] = useState<ExerciseCardType>(card)
  const isRepeatedSet = Boolean(card.totalRepetitions && card.totalRepetitions > 1)

  // Update local state when card prop changes
  useEffect(() => {
    setEditedCard(card)
  }, [card])

  const openEditor = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  const cleanCard = (cardToClean: ExerciseCardType): ExerciseCardType => ({
    ...cardToClean,
    weight: cardToClean.weight?.trim() || null,
    distance: cardToClean.distance?.trim() || null,
    time: cardToClean.time?.trim() || null,
    timing: cardToClean.timing?.trim() || null,
    notes: cardToClean.notes?.trim() || null,
    restSeconds: cardToClean.restSeconds || null,
    isEditing: false,
  })

  // Edit handlers
  const handleSave = () => {
    // Clean up empty fields before saving
    const cleanedCard = cleanCard(editedCard)

    onChange(cleanedCard)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCard(card) // Revert changes
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(card.id)
    }
  }

  const handleDuplicate = () => {
    if (!onDuplicate) return
    const cleanedCard = cleanCard(editedCard)
    onDuplicate(cleanedCard)
    setIsEditing(false)
  }

  // Check if field has content (for conditional rendering)
  const hasWeight = card.weight && String(card.weight).trim().length > 0
  const hasDistance = card.distance && String(card.distance).trim().length > 0
  const hasTime = card.time && String(card.time).trim().length > 0
  const hasTiming = card.timing && String(card.timing).trim().length > 0
  const hasRest = card.restSeconds != null && card.restSeconds > 0
  const hasNotes = card.notes && String(card.notes).trim().length > 0

  // Format reps display - handle cases like "5 reps, 5 reps, 5 reps" and extract just the number
  const formatReps = (reps: number | string): string => {
    const repsStr = String(reps)
    // Extract first number if reps contains repeated values
    const match = repsStr.match(/^\d+/)
    if (match) {
      const num = match[0]
      return `${num} reps`
    }
    // If reps already contains "reps", just return it
    if (repsStr.includes('reps')) {
      return repsStr.split(',')[0].trim() // Take first occurrence
    }
    return `${repsStr} reps`
  }

  // Display mode (read-only)
  if (!isEditing) {
    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={openEditor}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openEditor()
          }
        }}
        className="border-primary/40 bg-card/95 hover:bg-muted/80 transition-all cursor-pointer shadow-md focus-within:ring-2 focus-within:ring-primary/50 focus-visible:outline-none"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{card.name || "Unnamed Exercise"}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Edit exercise"
                title="Edit exercise"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete exercise"
                  title="Delete exercise"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Always visible: Set number & Reps */}
          <div className="flex gap-4">
            {card.totalRepetitions && card.totalRepetitions > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Set:</span>
                <span className="font-semibold">
                  {(card.repetitionIndex ?? 0) + 1} of {card.totalRepetitions}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sets:</span>
                <span className="font-semibold">{card.sets}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Reps:</span>
              <span className="font-semibold">{formatReps(card.reps)}</span>
            </div>
          </div>

          {/* Conditional fields */}
          <div className="space-y-1.5 text-sm">
            {hasWeight && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Weight:</span>
                <span>{card.weight}</span>
              </div>
            )}

            {hasDistance && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Distance:</span>
                <span>{card.distance}</span>
              </div>
            )}

            {hasTime && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span>{card.time}</span>
              </div>
            )}

            {hasTiming && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Timing:</span>
                <span>{card.timing}</span>
              </div>
            )}

            {hasRest && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rest:</span>
                <span>{card.restSeconds}s</span>
              </div>
            )}

            {hasNotes && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-muted-foreground italic">{card.notes}</p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    )
  }

  // Edit mode (show all fields)
  return (
    <Card className="border-primary ring-2 ring-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Edit Exercise</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Exercise Name */}
        <div>
          <Label htmlFor="name">Exercise Name *</Label>
          <Input
            id="name"
            value={editedCard.name}
            onChange={(e) =>
              setEditedCard({ ...editedCard, name: e.target.value })
            }
            placeholder="e.g., Barbell Back Squat"
          />
        </div>

        {/* Sets & Reps (always visible) */}
        {isRepeatedSet && (
          <p className="text-xs text-muted-foreground">
            Set {(card.repetitionIndex ?? 0) + 1} of {card.totalRepetitions}
          </p>
        )}
        <div className={isRepeatedSet ? "grid gap-4" : "grid grid-cols-2 gap-4"}>
          {!isRepeatedSet && (
            <div>
              <Label htmlFor="sets">Sets *</Label>
              <Input
                id="sets"
                type="number"
                min="1"
                value={editedCard.sets}
                onChange={(e) =>
                  setEditedCard({ ...editedCard, sets: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          )}

          <div>
            <Label htmlFor="reps">Reps *</Label>
            <Input
              id="reps"
              value={editedCard.reps}
              onChange={(e) =>
                setEditedCard({ ...editedCard, reps: e.target.value })
              }
              placeholder="e.g., 10 or 8-12"
            />
          </div>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weight">Weight</Label>
            <Input
              id="weight"
              value={editedCard.weight || ''}
              onChange={(e) =>
                setEditedCard({ ...editedCard, weight: e.target.value || null })
              }
              placeholder="e.g., 185 lbs"
            />
          </div>

          <div>
            <Label htmlFor="rest">Rest (seconds)</Label>
            <Input
              id="rest"
              type="number"
              min="0"
              value={editedCard.restSeconds || ''}
              onChange={(e) =>
                setEditedCard({
                  ...editedCard,
                  restSeconds: parseInt(e.target.value) || null,
                })
              }
              placeholder="60"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="distance">Distance</Label>
            <Input
              id="distance"
              value={editedCard.distance || ''}
              onChange={(e) =>
                setEditedCard({ ...editedCard, distance: e.target.value || null })
              }
              placeholder="e.g., 400m"
            />
          </div>

          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              value={editedCard.time || ''}
              onChange={(e) =>
                setEditedCard({ ...editedCard, time: e.target.value || null })
              }
              placeholder="e.g., 2:30"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="timing">Timing/Tempo</Label>
          <Input
            id="timing"
            value={editedCard.timing || ''}
            onChange={(e) =>
              setEditedCard({ ...editedCard, timing: e.target.value || null })
            }
            placeholder="e.g., EMOM, 3-1-1-0"
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={editedCard.notes || ''}
            onChange={(e) =>
              setEditedCard({ ...editedCard, notes: e.target.value || null })
            }
            placeholder="Form cues, tempo, etc."
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
          {onDuplicate && (
            <Button
              onClick={handleDuplicate}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          )}
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
