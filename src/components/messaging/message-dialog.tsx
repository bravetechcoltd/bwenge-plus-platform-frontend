"use client"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Send } from "lucide-react"
import type { PrivateMessage, User } from "@/types"
import { formatMessageTime } from "@/lib/utils"

interface MessageConversationProps {
  recipient: User
  courseTitle: string
  messages: PrivateMessage[]
  isLoading: boolean
  onSendMessage: (content: string) => Promise<void>
  onBack: () => void
}

export function MessageConversation({
  recipient,
  courseTitle,
  messages,
  isLoading,
  onSendMessage,
  onBack,
}: MessageConversationProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    setIsSending(true)
    try {
      await onSendMessage(input)
      setInput("")
    } finally {
      setIsSending(false)
    }
  }

  const initials = `${recipient.first_name?.[0] || ""}${recipient.last_name?.[0] || ""}`.toUpperCase()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.profile_picture_url || "/placeholder.svg"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {recipient.first_name} {recipient.last_name}
              </CardTitle>
              <p className="text-xs text-gray-600">{courseTitle}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center text-sm text-gray-500 py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-xs break-words">
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isSending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
