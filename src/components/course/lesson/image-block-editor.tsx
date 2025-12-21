// @ts-nocheck
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ImageIcon } from 'lucide-react'
import { LessonImageUpload } from "./lesson-image-upload"

interface ImageBlockEditorProps {
  blockId: string
  imageUrl: string
  onUpdate: (url: string) => void
  onDelete: () => void
}

export function ImageBlockEditor({
  blockId,
  imageUrl,
  onUpdate,
  onDelete,
}: ImageBlockEditorProps) {
  return (
    <Card className="p-4 border border-gray-200 dark:border-gray-700 relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Block</span>
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

      <LessonImageUpload
        currentImageUrl={imageUrl}
        onUpdate={(updates) => onUpdate(updates.imageUrl || "")}
      />
    </Card>
  )
}
