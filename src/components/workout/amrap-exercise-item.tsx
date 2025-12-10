"use client"

import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
}

interface AMRAPExerciseItemProps {
  exercise: Exercise
  exerciseNumber: number
  variant?: 'card' | 'compact'
  checked?: boolean
  onToggle?: (checked: boolean) => void
}

export function AMRAPExerciseItem({
  exercise,
  exerciseNumber,
  variant = 'card',
  checked = false,
  onToggle,
}: AMRAPExerciseItemProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-3 py-3 px-4 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30 transition-colors">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {exerciseNumber}
            </Badge>
            <h4 className="font-semibold text-white truncate">
              {exercise.name}
            </h4>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{exercise.reps} reps</span>
            {exercise.weight && (
              <>
                <span className="text-slate-600">•</span>
                <span>{exercise.weight}</span>
              </>
            )}
          </div>
          {exercise.notes && (
            <p className="text-xs text-text-secondary mt-1 italic line-clamp-2">
              {exercise.notes}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Card variant for larger screens
  return (
    <Card className="bg-slate-800 border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {exerciseNumber}
            </Badge>
            <h4 className="font-bold text-lg text-white">
              {exercise.name}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-text-secondary mb-1">Reps</p>
              <p className="font-semibold text-white">{exercise.reps}</p>
            </div>
            {exercise.weight && (
              <div>
                <p className="text-text-secondary mb-1">Weight</p>
                <p className="font-semibold text-white">{exercise.weight}</p>
              </div>
            )}
          </div>
          {exercise.notes && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-text-secondary italic">
                {exercise.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
