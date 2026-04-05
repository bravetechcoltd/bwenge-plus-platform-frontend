// @ts-nocheck
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Text, Image as ImageIcon, Video, FileText } from 'lucide-react'
import { TextBlockEditor } from "./text-block-editor"
import { ImageBlockEditor } from "./image-block-editor"
import { VideoBlockEditor } from "./video-block-editor"
import type { ContentBlock } from "@/types"

interface ContentBlockBuilderProps {
  blocks: ContentBlock[]
  onBlocksChange: (blocks: ContentBlock[]) => void
  courseId?: string
  moduleId?: string
  lessonId?: string
}

export function ContentBlockBuilder({
  blocks,
  onBlocksChange,
  courseId,
  moduleId,
  lessonId,
}: ContentBlockBuilderProps) {
  const [blockType, setBlockType] = useState<"text" | "image" | "video" | "resource" | "">("")

  const addBlock = () => {
    if (!blockType) return

    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      order: blocks.length,
      data: blockType === "text" ? { text: "" } : { url: "" },
    }

    onBlocksChange([...blocks, newBlock])
    setBlockType("")
  }

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    const updated = blocks.map((block) =>
      block.id === blockId ? { ...block, ...updates } : block
    )
    onBlocksChange(updated)
  }

  const deleteBlock = (blockId: string) => {
    const updated = blocks
      .filter((block) => block.id !== blockId)
      .map((block, index) => ({
        ...block,
        order: index,
      }))
    onBlocksChange(updated)
  }

  const updateBlockData = (blockId: string, newData: any) => {
    const updated = blocks.map((block) =>
      block.id === blockId ? { ...block, data: { ...block.data, ...newData } } : block
    )
    onBlocksChange(updated)
  }

  const renderBlockIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Text className="w-5 h-5" />
      case "image":
        return <ImageIcon className="w-5 h-5" />
      case "video":
        return <Video className="w-5 h-5" />
      case "resource":
        return <FileText className="w-5 h-5" />
      default:
        return <Text className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Block Section */}
      <Card className="p-4 bg-muted/50 dark:bg-card/50 border-dashed border-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={blockType} onValueChange={(value: any) => setBlockType(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select content type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text" className="flex items-center gap-2">
                <Text className="w-4 h-4" />
                Text Block
              </SelectItem>
              <SelectItem value="image" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Block
              </SelectItem>
              <SelectItem value="video" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Block
              </SelectItem>
              <SelectItem value="resource" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resource Block
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addBlock} disabled={!blockType} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Block
          </Button>
        </div>
      </Card>

      {/* Blocks List */}
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.sort((a, b) => a.order - b.order).map((block) => (
            <div key={block.id} className="relative group">
              <div className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => {
                      const currentIndex = blocks.findIndex(b => b.id === block.id)
                      if (currentIndex > 0) {
                        const updated = [...blocks]
                        const temp = updated[currentIndex]
                        updated[currentIndex] = updated[currentIndex - 1]
                        updated[currentIndex - 1] = temp
                        updated.forEach((b, i) => b.order = i)
                        onBlocksChange(updated)
                      }
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => {
                      const currentIndex = blocks.findIndex(b => b.id === block.id)
                      if (currentIndex < blocks.length - 1) {
                        const updated = [...blocks]
                        const temp = updated[currentIndex]
                        updated[currentIndex] = updated[currentIndex + 1]
                        updated[currentIndex + 1] = temp
                        updated.forEach((b, i) => b.order = i)
                        onBlocksChange(updated)
                      }
                    }}
                  >
                    ↓
                  </Button>
                </div>
              </div>
              <div className="ml-2">
                {block.type === "text" && (
                  <TextBlockEditor
                    blockId={block.id}
                    content={block.data.text || ""}
                    onUpdate={(text) => updateBlockData(block.id, { text })}
                    onDelete={() => deleteBlock(block.id)}
                  />
                )}
                {block.type === "image" && (
                  <ImageBlockEditor
                    blockId={block.id}
                    imageUrl={block.data.url || ""}
                    onUpdate={(url) => updateBlockData(block.id, { url })}
                    onDelete={() => deleteBlock(block.id)}
                    courseId={courseId}
                    moduleId={moduleId}
                    lessonId={lessonId}
                  />
                )}
                {block.type === "video" && (
                  <VideoBlockEditor
                    blockId={block.id}
                    videoUrl={block.data.url || ""}
                    onUpdate={(url) => updateBlockData(block.id, { url })}
                    onDelete={() => deleteBlock(block.id)}
                    courseId={courseId}
                    moduleId={moduleId}
                    lessonId={lessonId}
                  />
                )}
                {block.type === "resource" && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {renderBlockIcon(block.type)}
                        <span className="font-medium">Resource Block</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlock(block.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={block.data.url || ""}
                      onChange={(e) => updateBlockData(block.id, { url: e.target.value })}
                      placeholder="Enter resource URL..."
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No content blocks yet. Add one to get started!</p>
        </div>
      )}
    </div>
  )
}