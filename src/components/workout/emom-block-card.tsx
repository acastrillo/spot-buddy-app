"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Clock, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EMOMBlockDraft } from "@/types/workout-card"

interface EMOMBlockCardProps {
  block: EMOMBlockDraft
  isEmpty: boolean
  onDelete: () => void
  children?: ReactNode
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function EMOMBlockCard({ block, isEmpty, onDelete, children }: EMOMBlockCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `emom-drop-${block.id}` })

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-green-500/40 bg-green-500/5 p-4 shadow-lg transition",
        isOver && "border-green-400 bg-green-500/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="border-green-400/40 bg-green-500/20 text-green-100">
            EMOM
          </Badge>
          <div className="flex items-center gap-1 text-sm font-medium text-green-100/80">
            <Clock className="h-4 w-4" />
            {formatTime(block.intervalSeconds)}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete EMOM block"
          className="rounded-full p-1.5 text-green-100/70 transition hover:bg-green-500/20 hover:text-green-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[84px] rounded-xl border border-dashed border-green-400/40 p-3 transition",
          isOver && "border-green-300 bg-green-500/10"
        )}
      >
        {isEmpty ? (
          <p className="text-center text-sm text-green-100/70">
            Drag moves here to build this EMOM
          </p>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    </div>
  )
}
