"use client"

import { CheckCircle, Flame } from "lucide-react"

export default function StreakPopup({
  show,
  onClose,
  streak,
  dateLabel,
}: {
  show: boolean
  onClose: () => void
  streak: number
  dateLabel?: string
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
      <div className="mb-6 pointer-events-auto">
        <div className="bg-surface border border-border shadow-lg rounded-xl px-4 py-3 min-w-[280px] flex items-start gap-3">
          <div className="mt-0.5 text-success">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-text-primary">Great job!</div>
            <div className="text-sm text-text-secondary">
              {dateLabel ? `Workout completed on ${dateLabel}. ` : "Workout completed. "}
              <span className="inline-flex items-center gap-1 text-text-primary">
                <Flame className="h-4 w-4 text-orange-500" />
                {streak} day{streak === 1 ? '' : 's'} streak
              </span>
            </div>
            <button onClick={onClose} className="text-xs text-text-secondary mt-1 underline">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  )
}

