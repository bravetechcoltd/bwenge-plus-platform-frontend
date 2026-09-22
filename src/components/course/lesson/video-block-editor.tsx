// @ts-nocheck
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Video } from 'lucide-react'
import { LessonVideoUpload } from "./lesson-video-upload"

interface VideoBlockEditorProps {
  blockId: string
  videoUrl: string
  onUpdate: (url: string) => void
  onDelete: () => void
}

export function VideoBlockEditor({
  blockId,
  videoUrl,
  onUpdate,
  onDelete,
}: VideoBlockEditorProps) {
  return (
    <Card className="p-4 border border-border dark:border-border relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Video Block</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <LessonVideoUpload
        currentVideoUrl={videoUrl}
        onUpdate={(updates) => onUpdate(updates.videoUrl || "")}
      />
    </Card>
  )
}
