"use client"

import { useMemo, type ReactNode } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ExerciseCard } from "./exercise-card"
import { RestCard } from "./rest-card"
import { createBlankExerciseCard } from "@/lib/workout/card-transformer"
import { cn } from "@/lib/utils"
import { isExerciseCard, isRestCard, type WorkoutCard } from "@/types/workout-card"

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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const items = useMemo(() => cards.map((card) => card.id), [cards])

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = cards.findIndex((card) => card.id === active.id)
    const newIndex = cards.findIndex((card) => card.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onCardsChange(arrayMove(cards, oldIndex, newIndex))
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {/* Render cards */}
          {cards.map((card) => (
            <SortableCard key={card.id} card={card}>
              {isExerciseCard(card) ? (
                <ExerciseCard
                  card={card}
                  onChange={(updatedCard) => handleCardUpdate(card.id, updatedCard)}
                  onDelete={handleCardDelete}
                />
              ) : isRestCard(card) ? (
                <RestCard card={card} onDelete={handleCardDelete} />
              ) : null}
            </SortableCard>
          ))}

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
      </SortableContext>
    </DndContext>
  )
}

interface SortableCardProps {
  card: WorkoutCard
  children: ReactNode
}

function SortableCard({ card, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-10 scale-[1.01] drop-shadow-lg"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ touchAction: "none" }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        aria-label="Drag to reorder"
        className="absolute left-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="pl-14">{children}</div>
    </div>
  )
}
