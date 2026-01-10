"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/amrap-migration"
import type { AMRAPBlock } from "@/types/amrap"

interface BlockTransitionDialogProps {
  open: boolean
  currentBlock: AMRAPBlock
  nextBlock: AMRAPBlock
  roundsCompleted: number
  onContinue: () => void
  onSkip: () => void
}

export function BlockTransitionDialog({
  open,
  currentBlock,
  nextBlock,
  roundsCompleted,
  onContinue,
  onSkip,
}: BlockTransitionDialogProps) {
  const [restRemaining, setRestRemaining] = useState(60) // 60 second rest

  // Reset rest timer when dialog opens
  useEffect(() => {
    if (open) {
      setRestRemaining(60)
    }
  }, [open])

  // Countdown timer
  useEffect(() => {
    if (!open || restRemaining === 0) return

    const interval = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, restRemaining])

  // Auto-continue when timer expires
  useEffect(() => {
    if (restRemaining === 0 && open) {
      onContinue()
    }
  }, [restRemaining, open, onContinue])

  // Color for countdown based on time remaining
  const getCountdownColor = () => {
    if (restRemaining > 40) return "text-green-500"
    if (restRemaining > 20) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Block Complete!
          </DialogTitle>
          <DialogDescription>
            Great work on {currentBlock.label}!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Completed block summary */}
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div>
              <p className="font-medium">{currentBlock.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(currentBlock.timeLimit)}
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
              {roundsCompleted} Round{roundsCompleted !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Rest countdown */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Rest Period</span>
            </div>
            <div className={cn("text-6xl font-bold tabular-nums transition-colors", getCountdownColor())}>
              {restRemaining}s
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${(restRemaining / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Next block preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Next: {nextBlock.label}</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time Limit:</span>
                <span className="font-medium">{formatTime(nextBlock.timeLimit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exercises:</span>
                <span className="font-medium">{nextBlock.exercises.length}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip Rest
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 gap-2"
            >
              Continue
              {restRemaining > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {restRemaining}s
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
