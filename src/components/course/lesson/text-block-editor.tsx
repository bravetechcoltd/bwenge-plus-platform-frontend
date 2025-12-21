"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { X, Type } from "lucide-react"

interface TextBlockEditorProps {
  blockId: string
  content: string
  onUpdate: (content: string) => void
  onDelete: () => void
}

export function TextBlockEditor({ blockId, content, onUpdate, onDelete }: TextBlockEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const richTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing && richTextRef.current) {
      // Auto-focus the editor when entering edit mode
      const editor = richTextRef.current.querySelector(".ProseMirror") as HTMLElement
      if (editor) {
        editor.focus()
      }
    }
  }, [isEditing])

  return (
    <Card className="p-4 border border-gray-200 dark:border-gray-700 relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Block</span>
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

      {!isEditing ? (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-24 p-3 bg-gray-50 dark:bg-gray-900 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: content || "<p class='text-gray-400'>Click to add text...</p>" }}
        />
      ) : (
        <div className="space-y-3">
          <div ref={richTextRef}>
            <RichTextEditor value={content} onChange={onUpdate} className="border-0" />
          </div>
          <Button onClick={() => setIsEditing(false)} className="w-full" variant="outline">
            Done Editing
          </Button>
        </div>
      )}
    </Card>
  )
}
