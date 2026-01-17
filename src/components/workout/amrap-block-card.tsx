"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Clock, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AMRAPBlockDraft } from "@/types/workout-card"

interface AMRAPBlockCardProps {
  block: AMRAPBlockDraft
  isEmpty: boolean
  onDelete: () => void
  onEditTime: () => void
  children?: ReactNode
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function AMRAPBlockCard({
  block,
  isEmpty,
  onDelete,
  onEditTime,
  children,
}: AMRAPBlockCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `amrap-drop-${block.id}` })

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-blue-500/40 bg-blue-500/5 p-4 shadow-lg transition",
        isOver && "border-blue-400 bg-blue-500/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="border-blue-400/40 bg-blue-500/20 text-blue-100">
            AMRAP
          </Badge>
          <button
            type="button"
            onClick={onEditTime}
            className="flex items-center gap-1 text-sm font-medium text-blue-100/80 transition hover:text-blue-50"
          >
            <Clock className="h-4 w-4" />
            {formatTime(block.timeLimitSeconds)}
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete AMRAP block"
          className="rounded-full p-1.5 text-blue-100/70 transition hover:bg-blue-500/20 hover:text-blue-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[84px] rounded-xl border border-dashed border-blue-400/40 p-3 transition",
          isOver && "border-blue-300 bg-blue-500/10"
        )}
      >
        {isEmpty ? (
          <p className="text-center text-sm text-blue-100/70">
            Drag moves here to build this AMRAP
          </p>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    </div>
  )
}
