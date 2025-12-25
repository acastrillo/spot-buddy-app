"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AMRAPBlock } from "@/types/amrap"

interface AMRAPBlockNavigatorProps {
  blocks: AMRAPBlock[]
  currentIndex: number
  onNavigate: (index: number) => void
  completedBlocks: Set<string>
}

export function AMRAPBlockNavigator({
  blocks,
  currentIndex,
  onNavigate,
  completedBlocks,
}: AMRAPBlockNavigatorProps) {
  // Only show navigator for multi-block workouts
  if (blocks.length <= 1) {
    return null
  }

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < blocks.length - 1

  return (
    <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between gap-4">
      {/* Previous button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canGoPrevious}
        onClick={() => onNavigate(currentIndex - 1)}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* Progress dots and block info */}
      <div className="flex-1 flex flex-col items-center gap-3">
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {blocks.map((block, idx) => {
            const isCompleted = completedBlocks.has(block.id)
            const isCurrent = idx === currentIndex

            return (
              <button
                key={block.id}
                onClick={() => onNavigate(idx)}
                className={cn(
                  "h-3 w-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isCurrent && "ring-2 ring-primary ring-offset-2 scale-125",
                  isCompleted && !isCurrent && "bg-green-500",
                  !isCompleted && isCurrent && "bg-primary",
                  !isCompleted && !isCurrent && idx < currentIndex && "bg-muted-foreground/30",
                  !isCompleted && !isCurrent && idx > currentIndex && "bg-muted-foreground/20"
                )}
                aria-label={`Go to ${block.label}`}
                title={block.label}
              />
            )
          })}
        </div>

        {/* Block label and counter */}
        <div className="text-center">
          <p className="text-sm font-medium">
            {blocks[currentIndex].label}
          </p>
          <p className="text-xs text-muted-foreground">
            Block {currentIndex + 1} of {blocks.length}
          </p>
        </div>
      </div>

      {/* Next button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canGoNext}
        onClick={() => onNavigate(currentIndex + 1)}
        className="gap-1"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
