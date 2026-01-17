"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Dumbbell, GripVertical, Moon, Plus, Repeat, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ExerciseCard } from "./exercise-card"
import { RestCard } from "./rest-card"
import { AMRAPBlockCard } from "./amrap-block-card"
import { EMOMBlockCard } from "./emom-block-card"
import { createBlankExerciseCard, createRestCard } from "@/lib/workout/card-transformer"
import { cn } from "@/lib/utils"
import {
  isExerciseCard,
  isRestCard,
  type ExerciseCard as ExerciseCardType,
  type WorkoutCard,
  type AMRAPBlockDraft,
  type EMOMBlockDraft,
} from "@/types/workout-card"

interface WorkoutCardListProps {
  cards: WorkoutCard[]
  onCardsChange: (updatedCards: WorkoutCard[]) => void
  amrapBlocks?: AMRAPBlockDraft[]
  onAmrapBlocksChange?: (updatedBlocks: AMRAPBlockDraft[]) => void
  emomBlocks?: EMOMBlockDraft[]
  onEmomBlocksChange?: (updatedBlocks: EMOMBlockDraft[]) => void
  showAddButton?: boolean
}

const ROOT_CONTAINER_ID = "root"

/**
 * WorkoutCardList Component
 *
 * Container for vertical scrolling card layout.
 * Renders ExerciseCard or RestCard based on card type.
 * Provides "+ Add" action sheet to insert moves or blocks.
 */
export function WorkoutCardList({
  cards,
  onCardsChange,
  amrapBlocks = [],
  onAmrapBlocksChange,
  emomBlocks = [],
  onEmomBlocksChange,
  showAddButton = true,
}: WorkoutCardListProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isTimingDialogOpen, setIsTimingDialogOpen] = useState(false)
  const [timingMinutes, setTimingMinutes] = useState("12")
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [isRestDialogOpen, setIsRestDialogOpen] = useState(false)
  const [restSeconds, setRestSeconds] = useState("60")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const orderedAmrapBlocks = useMemo(
    () => [...amrapBlocks].sort((a, b) => a.order - b.order),
    [amrapBlocks]
  )
  const orderedEmomBlocks = useMemo(
    () => [...emomBlocks].sort((a, b) => a.order - b.order),
    [emomBlocks]
  )
  const orderedBlockIds = useMemo(
    () => [
      ...orderedEmomBlocks.map((block) => block.id),
      ...orderedAmrapBlocks.map((block) => block.id),
    ],
    [orderedEmomBlocks, orderedAmrapBlocks]
  )
  const blockTypeById = useMemo(() => {
    const map = new Map<string, "amrap" | "emom">()
    orderedAmrapBlocks.forEach((block) => map.set(block.id, "amrap"))
    orderedEmomBlocks.forEach((block) => map.set(block.id, "emom"))
    return map
  }, [orderedAmrapBlocks, orderedEmomBlocks])

  const getCardById = (cardId: string) =>
    cards.find((card) => card.id === cardId)

  const getContainerId = (cardId: string) => {
    const card = getCardById(cardId)
    if (!card) return ROOT_CONTAINER_ID
    if (isExerciseCard(card)) {
      if (card.amrapBlockId) {
        return card.amrapBlockId
      }
      if (card.emomBlockId) {
        return card.emomBlockId
      }
    }
    return ROOT_CONTAINER_ID
  }

  const splitCardsByContainer = () => {
    const blockMap: Record<string, WorkoutCard[]> = {}
    orderedEmomBlocks.forEach((block) => {
      blockMap[block.id] = []
    })
    orderedAmrapBlocks.forEach((block) => {
      blockMap[block.id] = []
    })
    const root: WorkoutCard[] = []

    cards.forEach((card) => {
      const containerId = getContainerId(card.id)
      if (containerId === ROOT_CONTAINER_ID || !blockMap[containerId]) {
        root.push(card)
        return
      }
      blockMap[containerId].push(card)
    })

    return { root, blockMap }
  }

  const rebuildCards = (root: WorkoutCard[], blockMap: Record<string, WorkoutCard[]>) => {
    const merged: WorkoutCard[] = [...root]
    orderedBlockIds.forEach((blockId) => {
      merged.push(...(blockMap[blockId] || []))
    })
    return merged
  }

  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: "root-drop",
  })

  const { root: rootCards, blockMap: blockCardsMap } = splitCardsByContainer()

  const rootItems = useMemo(() => rootCards.map((card) => card.id), [rootCards])

  const handleCardUpdate = (cardId: string, updatedCard: WorkoutCard) => {
    const updatedCards = cards.map((card) =>
      card.id === cardId ? updatedCard : card
    )
    onCardsChange(updatedCards)
  }

  const handleCardDelete = (cardId: string) => {
    const updatedCards = cards.filter((card) => card.id !== cardId)
    onCardsChange(updatedCards)
  }

  const handleCardDuplicate = (cardId: string, updatedCard: ExerciseCardType) => {
    const cardIndex = cards.findIndex((card) => card.id === cardId)
    if (cardIndex === -1) return

    const duplicatedCard: ExerciseCardType = {
      ...updatedCard,
      id: `ex-${Date.now()}-${Math.random()}`,
      isEditing: true,
      repetitionIndex: undefined,
      totalRepetitions: undefined,
    }

    const updatedCards = [...cards]
    updatedCards[cardIndex] = updatedCard
    updatedCards.splice(cardIndex + 1, 0, duplicatedCard)
    onCardsChange(updatedCards)
  }

  const handleAddExercise = () => {
    const newCard = createBlankExerciseCard()
    onCardsChange([...cards, newCard])
  }

  const handleDeleteAmrapBlock = (blockId: string) => {
    if (!onAmrapBlocksChange) return

    const updatedCards = cards.map((card) => {
      if (!isExerciseCard(card)) return card
      if (card.amrapBlockId !== blockId) return card
      return { ...card, amrapBlockId: null }
    })

    const filteredBlocks = amrapBlocks.filter((block) => block.id !== blockId)
    onCardsChange(updatedCards)
    onAmrapBlocksChange(filteredBlocks)
  }

  const handleDeleteEmomBlock = (blockId: string) => {
    if (!onEmomBlocksChange) return

    const updatedCards = cards.map((card) => {
      if (!isExerciseCard(card)) return card
      if (card.emomBlockId !== blockId) return card
      return { ...card, emomBlockId: null }
    })

    const filteredBlocks = emomBlocks.filter((block) => block.id !== blockId)
    onCardsChange(updatedCards)
    onEmomBlocksChange(filteredBlocks)
  }

  const handleEditBlockTime = (blockId: string) => {
    const block = amrapBlocks.find((item) => item.id === blockId)
    if (!block) return
    setEditingBlockId(blockId)
    setTimingMinutes(String(Math.max(1, Math.floor(block.timeLimitSeconds / 60))))
    setIsTimingDialogOpen(true)
  }

  const handleConfirmBlockTime = () => {
    if (!onAmrapBlocksChange) return

    const minutes = Math.max(1, Math.min(120, parseInt(timingMinutes, 10) || 1))
    if (editingBlockId) {
      onAmrapBlocksChange(
        amrapBlocks.map((block) =>
          block.id === editingBlockId
            ? { ...block, timeLimitSeconds: minutes * 60 }
            : block
        )
      )
    } else {
      const nextOrder = amrapBlocks.length
        ? Math.max(...amrapBlocks.map((block) => block.order)) + 1
        : 1
      const newBlock: AMRAPBlockDraft = {
        id: `amrap-${Date.now()}-${Math.random()}`,
        label: "AMRAP",
        timeLimitSeconds: minutes * 60,
        order: nextOrder,
      }
      onAmrapBlocksChange([...amrapBlocks, newBlock])
    }

    setIsTimingDialogOpen(false)
    setEditingBlockId(null)
  }

  const moveCardToContainer = (
    cardId: string,
    targetContainerId: string,
    targetIndex?: number
  ) => {
    const card = getCardById(cardId)
    if (!card) return
    if (targetContainerId !== ROOT_CONTAINER_ID && !isExerciseCard(card)) return

    const { root, blockMap } = splitCardsByContainer()
    const sourceContainerId = getContainerId(cardId)
    const sourceList =
      sourceContainerId === ROOT_CONTAINER_ID
        ? root
        : blockMap[sourceContainerId] || []
    const targetList =
      targetContainerId === ROOT_CONTAINER_ID
        ? root
        : blockMap[targetContainerId] || []

    const sourceIndex = sourceList.findIndex((item) => item.id === cardId)
    if (sourceIndex === -1) return

    const [removed] = sourceList.splice(sourceIndex, 1)
    const targetBlockType = blockTypeById.get(targetContainerId)
    const updatedCard =
      isExerciseCard(removed)
        ? {
            ...removed,
            amrapBlockId: targetBlockType === "amrap" ? targetContainerId : null,
            emomBlockId: targetBlockType === "emom" ? targetContainerId : null,
          }
        : removed

    const insertIndex =
      typeof targetIndex === "number" ? targetIndex : targetList.length
    targetList.splice(insertIndex, 0, updatedCard)

    const updatedCards = rebuildCards(root, blockMap)
    onCardsChange(updatedCards)
  }

  const reorderWithinContainer = (
    containerId: string,
    activeId: string,
    overId: string
  ) => {
    const { root, blockMap } = splitCardsByContainer()
    const list =
      containerId === ROOT_CONTAINER_ID ? root : blockMap[containerId] || []

    const oldIndex = list.findIndex((item) => item.id === activeId)
    const newIndex = list.findIndex((item) => item.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(list, oldIndex, newIndex)
    if (containerId === ROOT_CONTAINER_ID) {
      onCardsChange(rebuildCards(reordered, blockMap))
    } else {
      onCardsChange(rebuildCards(root, { ...blockMap, [containerId]: reordered }))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const activeCard = getCardById(activeId)
    if (!activeCard) return

    if (overId === "root-drop") {
      if (getContainerId(activeId) !== ROOT_CONTAINER_ID && isExerciseCard(activeCard)) {
        moveCardToContainer(activeId, ROOT_CONTAINER_ID)
      }
      return
    }

    if (overId.startsWith("amrap-drop-")) {
      const targetBlockId = overId.replace("amrap-drop-", "")
      if (isExerciseCard(activeCard)) {
        moveCardToContainer(activeId, targetBlockId)
      }
      return
    }

    if (overId.startsWith("emom-drop-")) {
      const targetBlockId = overId.replace("emom-drop-", "")
      if (isExerciseCard(activeCard)) {
        moveCardToContainer(activeId, targetBlockId)
      }
      return
    }

    const overCard = getCardById(overId)
    if (!overCard) return

    const activeContainer = getContainerId(activeId)
    const overContainer = getContainerId(overId)

    if (activeContainer === overContainer) {
      reorderWithinContainer(activeContainer, activeId, overId)
      return
    }

    if (isExerciseCard(activeCard)) {
      const { root, blockMap } = splitCardsByContainer()
      const targetList =
        overContainer === ROOT_CONTAINER_ID
          ? root
          : blockMap[overContainer] || []
      const targetIndex = targetList.findIndex((item) => item.id === overId)
      moveCardToContainer(activeId, overContainer, Math.max(targetIndex, 0))
    }
  }

  const handleAddMove = () => {
    handleAddExercise()
    setIsAddMenuOpen(false)
  }

  const handleAddAMRAP = () => {
    setIsAddMenuOpen(false)
    setEditingBlockId(null)
    setTimingMinutes("12")
    setIsTimingDialogOpen(true)
  }

  const handleAddEMOM = () => {
    if (!onEmomBlocksChange) {
      setIsAddMenuOpen(false)
      return
    }

    const nextOrder = emomBlocks.length
      ? Math.max(...emomBlocks.map((block) => block.order)) + 1
      : 1
    const newBlock: EMOMBlockDraft = {
      id: `emom-${Date.now()}-${Math.random()}`,
      label: "EMOM",
      intervalSeconds: 60,
      order: nextOrder,
    }
    onEmomBlocksChange([...emomBlocks, newBlock])
    setIsAddMenuOpen(false)
  }

  const handleAddRest = () => {
    setIsAddMenuOpen(false)
    setRestSeconds("60")
    setIsRestDialogOpen(true)
  }

  const handleConfirmRest = () => {
    const seconds = Math.max(5, Math.min(3600, parseInt(restSeconds, 10) || 60))
    const restCard = createRestCard(seconds)
    const { root, blockMap } = splitCardsByContainer()
    const updatedRoot = [...root, restCard]
    onCardsChange(rebuildCards(updatedRoot, blockMap))
    setIsRestDialogOpen(false)
  }

  const showEmptyState =
    cards.length === 0 && orderedAmrapBlocks.length === 0 && orderedEmomBlocks.length === 0

  if (showEmptyState) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No moves yet</p>
          {showAddButton && (
            <AddMenuButton
              isOpen={isAddMenuOpen}
              onOpenChange={setIsAddMenuOpen}
              onAddMove={handleAddMove}
              onAddAMRAP={handleAddAMRAP}
              onAddEMOM={handleAddEMOM}
              onAddRest={handleAddRest}
            />
          )}
        </div>

        <TimingDialog
          isOpen={isTimingDialogOpen}
          minutes={timingMinutes}
          onMinutesChange={setTimingMinutes}
          onClose={() => {
            setIsTimingDialogOpen(false)
            setEditingBlockId(null)
          }}
          onConfirm={handleConfirmBlockTime}
          isEditing={Boolean(editingBlockId)}
        />

        <RestTimingDialog
          isOpen={isRestDialogOpen}
          seconds={restSeconds}
          onSecondsChange={setRestSeconds}
          onClose={() => setIsRestDialogOpen(false)}
          onConfirm={handleConfirmRest}
        />
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {orderedEmomBlocks.map((block) => {
            const blockCards = blockCardsMap[block.id] || []
            const blockItems = blockCards.map((card) => card.id)

            return (
              <EMOMBlockCard
                key={block.id}
                block={block}
                isEmpty={blockCards.length === 0}
                onDelete={() => handleDeleteEmomBlock(block.id)}
              >
                <SortableContext
                  items={blockItems}
                  strategy={verticalListSortingStrategy}
                >
                  {blockCards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      containerId={block.id}
                    >
                      {isExerciseCard(card) ? (
                        <ExerciseCard
                          card={card}
                          onChange={(updatedCard) =>
                            handleCardUpdate(card.id, updatedCard)
                          }
                          onDuplicate={(updatedCard) =>
                            handleCardDuplicate(card.id, updatedCard)
                          }
                          onDelete={handleCardDelete}
                        />
                      ) : isRestCard(card) ? (
                        <RestCard card={card} onDelete={handleCardDelete} />
                      ) : null}
                    </SortableCard>
                  ))}
                </SortableContext>
              </EMOMBlockCard>
            )
          })}

          {orderedAmrapBlocks.map((block) => {
            const blockCards = blockCardsMap[block.id] || []
            const blockItems = blockCards.map((card) => card.id)

            return (
              <AMRAPBlockCard
                key={block.id}
                block={block}
                isEmpty={blockCards.length === 0}
                onDelete={() => handleDeleteAmrapBlock(block.id)}
                onEditTime={() => handleEditBlockTime(block.id)}
              >
                <SortableContext
                  items={blockItems}
                  strategy={verticalListSortingStrategy}
                >
                  {blockCards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      containerId={block.id}
                    >
                      {isExerciseCard(card) ? (
                        <ExerciseCard
                          card={card}
                          onChange={(updatedCard) =>
                            handleCardUpdate(card.id, updatedCard)
                          }
                          onDuplicate={(updatedCard) =>
                            handleCardDuplicate(card.id, updatedCard)
                          }
                          onDelete={handleCardDelete}
                        />
                      ) : isRestCard(card) ? (
                        <RestCard card={card} onDelete={handleCardDelete} />
                      ) : null}
                    </SortableCard>
                  ))}
                </SortableContext>
              </AMRAPBlockCard>
            )
          })}

          <SortableContext items={rootItems} strategy={verticalListSortingStrategy}>
            <div
              ref={setRootDropRef}
              className={cn(
                "space-y-3 rounded-2xl",
                isOverRoot && "ring-2 ring-primary/40"
              )}
            >
              {rootCards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  containerId={ROOT_CONTAINER_ID}
                >
                  {isExerciseCard(card) ? (
                    <ExerciseCard
                      card={card}
                      onChange={(updatedCard) => handleCardUpdate(card.id, updatedCard)}
                      onDuplicate={(updatedCard) =>
                        handleCardDuplicate(card.id, updatedCard)
                      }
                      onDelete={handleCardDelete}
                    />
                  ) : isRestCard(card) ? (
                    <RestCard card={card} onDelete={handleCardDelete} />
                  ) : null}
                </SortableCard>
              ))}
            </div>
          </SortableContext>

          {showAddButton && (
            <AddMenuButton
              isOpen={isAddMenuOpen}
              onOpenChange={setIsAddMenuOpen}
              onAddMove={handleAddMove}
              onAddAMRAP={handleAddAMRAP}
              onAddEMOM={handleAddEMOM}
              onAddRest={handleAddRest}
            />
          )}
        </div>
      </DndContext>

      <TimingDialog
        isOpen={isTimingDialogOpen}
        minutes={timingMinutes}
        onMinutesChange={setTimingMinutes}
        onClose={() => {
          setIsTimingDialogOpen(false)
          setEditingBlockId(null)
        }}
        onConfirm={handleConfirmBlockTime}
        isEditing={Boolean(editingBlockId)}
      />

      <RestTimingDialog
        isOpen={isRestDialogOpen}
        seconds={restSeconds}
        onSecondsChange={setRestSeconds}
        onClose={() => setIsRestDialogOpen(false)}
        onConfirm={handleConfirmRest}
      />
    </>
  )
}

interface SortableCardProps {
  card: WorkoutCard
  children: ReactNode
  containerId: string
}

function SortableCard({ card, children, containerId }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { containerId },
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

interface AddMenuButtonProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddMove: () => void
  onAddAMRAP: () => void
  onAddEMOM: () => void
  onAddRest: () => void
}

function AddMenuButton({
  isOpen,
  onOpenChange,
  onAddMove,
  onAddAMRAP,
  onAddEMOM,
  onAddRest,
}: AddMenuButtonProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          onClick={() => onOpenChange(true)}
          variant="outline"
          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4 mr-2" />
          + Add
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Add to workout</SheetTitle>
        </SheetHeader>
        <div className="mt-6 grid gap-3">
          <Button variant="outline" className="justify-start" onClick={onAddAMRAP}>
            <Timer className="mr-2 h-4 w-4" />
            AMRAP
          </Button>
          <Button variant="outline" className="justify-start" onClick={onAddEMOM}>
            <Repeat className="mr-2 h-4 w-4" />
            EMOM
          </Button>
          <Button
            variant="outline"
            className="justify-start border-emerald-400/40 text-emerald-100 hover:bg-emerald-950/40"
            onClick={onAddRest}
          >
            <Moon className="mr-2 h-4 w-4" />
            Rest
          </Button>
          <Button className="justify-start" onClick={onAddMove}>
            <Dumbbell className="mr-2 h-4 w-4" />
            Move
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface TimingDialogProps {
  isOpen: boolean
  minutes: string
  onMinutesChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  isEditing: boolean
}

function TimingDialog({
  isOpen,
  minutes,
  onMinutesChange,
  onClose,
  onConfirm,
  isEditing,
}: TimingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Update AMRAP timing" : "AMRAP timing"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="amrap-minutes">
            Minutes
          </label>
          <Input
            id="amrap-minutes"
            type="number"
            min="1"
            max="120"
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
            placeholder="12"
          />
          <p className="text-xs text-muted-foreground">
            This becomes the block timer shown in the AMRAP view.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RestTimingDialogProps {
  isOpen: boolean
  seconds: string
  onSecondsChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

function RestTimingDialog({
  isOpen,
  seconds,
  onSecondsChange,
  onClose,
  onConfirm,
}: RestTimingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rest timing</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="rest-seconds">
            Seconds
          </label>
          <Input
            id="rest-seconds"
            type="number"
            min="5"
            max="3600"
            value={seconds}
            onChange={(event) => onSecondsChange(event.target.value)}
            placeholder="60"
          />
          <p className="text-xs text-muted-foreground">
            This becomes a dedicated rest move in the workout.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
