"use client"

import { Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { RestCard as RestCardType } from "@/types/workout-card"

interface RestCardProps {
  card: RestCardType
  onDelete?: (cardId: string) => void
}

/**
 * RestCard Component
 *
 * Displays a rest period between exercises with amber/rest-color theme.
 * Simpler than ExerciseCard - just shows duration and optional notes.
 */
export function RestCard({ card, onDelete }: RestCardProps) {
  // Format duration (seconds to human-readable)
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  return (
    <Card className="border-amber-600/40 bg-amber-950/30 hover:bg-amber-950/40 transition-colors shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Rest indicator */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-600/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-100">
                REST
              </div>
              <div className="text-sm text-amber-300">
                {formatDuration(card.duration)}
              </div>
            </div>
          </div>

          {/* Delete button (optional) */}
          {onDelete && (
            <button
              onClick={() => onDelete(card.id)}
              className="p-1 rounded hover:bg-amber-600/20 text-amber-400 hover:text-amber-300 transition-colors"
              aria-label="Delete rest period"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Optional notes */}
        {card.notes && (
          <div className="mt-3 text-sm text-amber-200/80 italic pl-11">
            {card.notes}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
