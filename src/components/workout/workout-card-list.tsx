"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExerciseCard } from "./exercise-card"
import { RestCard } from "./rest-card"
import { isExerciseCard, isRestCard } from "@/types/workout-card"
import { createBlankExerciseCard } from "@/lib/workout/card-transformer"
import type { WorkoutCard } from "@/types/workout-card"

interface WorkoutCardListProps {
  cards: WorkoutCard[]
  onCardsChange: (updatedCards: WorkoutCard[]) => void
  showAddButton?: boolean
}

/**
 * WorkoutCardList Component
 *
 * Container for vertical scrolling card layout.
 * Renders ExerciseCard or RestCard based on card type.
 * Provides "Add Exercise" button to insert new blank cards.
 */
export function WorkoutCardList({
  cards,
  onCardsChange,
  showAddButton = true,
}: WorkoutCardListProps) {
  // Handle card update
  const handleCardUpdate = (cardId: string, updatedCard: WorkoutCard) => {
    const updatedCards = cards.map((card) =>
      card.id === cardId ? updatedCard : card
    )
    onCardsChange(updatedCards)
  }

  // Handle card deletion
  const handleCardDelete = (cardId: string) => {
    const updatedCards = cards.filter((card) => card.id !== cardId)
    onCardsChange(updatedCards)
  }

  // Add new blank exercise card
  const handleAddExercise = () => {
    const newCard = createBlankExerciseCard()
    onCardsChange([...cards, newCard])
  }

  // Empty state
  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No exercises yet</p>
          {showAddButton && (
            <Button onClick={handleAddExercise} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Exercise
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Render cards */}
      {cards.map((card) => {
        if (isExerciseCard(card)) {
          return (
            <ExerciseCard
              key={card.id}
              card={card}
              onChange={(updatedCard) => handleCardUpdate(card.id, updatedCard)}
              onDelete={handleCardDelete}
            />
          )
        }

        if (isRestCard(card)) {
          return (
            <RestCard
              key={card.id}
              card={card}
              onDelete={handleCardDelete}
            />
          )
        }

        return null
      })}

      {/* Add Exercise button */}
      {showAddButton && (
        <Button
          onClick={handleAddExercise}
          variant="outline"
          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      )}
    </div>
  )
}
