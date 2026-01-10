"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Minus, Plus, Info } from "lucide-react"

interface AMRAPHeaderCardProps {
  timeLimit: number  // in seconds
  onTimeLimitChange: (seconds: number) => void
  isEditable?: boolean
}

export function AMRAPHeaderCard({
  timeLimit,
  onTimeLimitChange,
  isEditable = true
}: AMRAPHeaderCardProps) {
  const minutes = Math.floor(timeLimit / 60)

  const adjustTime = (delta: number) => {
    const newMinutes = Math.max(1, Math.min(60, minutes + delta))
    onTimeLimitChange(newMinutes * 60)
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <Badge className="mb-1 bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400">
              AMRAP Workout
            </Badge>
            <h3 className="text-lg font-bold text-text-primary">
              As Many Rounds As Possible
            </h3>
          </div>
        </div>

        {isEditable ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Time Limit
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustTime(-1)}
                disabled={minutes <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-4xl font-bold text-amber-500">
                  {minutes}:00
                </div>
                <div className="text-sm text-text-secondary">minutes</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustTime(1)}
                disabled={minutes >= 60}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center">
            <div className="text-5xl font-bold text-amber-500">
              {minutes}:00
            </div>
            <div className="text-sm text-text-secondary">Time Limit</div>
          </div>
        )}

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-400">
              <strong>How it works:</strong> Perform exercises below in order, repeating as many times as possible within time limit.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
