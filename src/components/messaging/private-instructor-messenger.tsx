"use client"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, AlertCircle, Check, Clock } from "lucide-react"
import type { PrivateMessage, User } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {  formatMessageTime } from "@/lib/utils"

interface PrivateInstructorMessengerProps {
  instructor: User
  courseTitle: string
  messages: PrivateMessage[]
  isLoading: boolean
  onSendMessage: (content: string) => Promise<void>
  onOpenFullConversation: () => void
}

// Local type for optimistic messages
interface OptimisticMessage extends Omit<PrivateMessage, 'status'> {
  status: 'sending' | 'sent' | 'error'
}

export function PrivateInstructorMessenger({
  instructor,
  courseTitle,
  messages,
  isLoading,
  onSendMessage,
  onOpenFullConversation,
}: PrivateInstructorMessengerProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  // Combine real messages with optimistic ones
  const allMessages: OptimisticMessage[] = [
    ...messages.map(msg => ({ ...msg, status: 'sent' as const })),
    ...optimisticMessages
  ].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allMessages])

  const handleSend = async () => {
    if (!input.trim() || isSending) return

    const content = input.trim()
    setInput("")
    setError(null)

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      content,
      senderId: 'current-user', // This should match your current user's ID
      conversationId: messages[0]?.conversationId || 'temp',
      createdAt: new Date(),
      updatedAt: new Date(),
      readAt: null,
      isRead: false,
      status: 'sending'
    }

    // Add optimistic message to UI
    setOptimisticMessages(prev => [...prev, optimisticMessage])

    try {
      await onSendMessage(content)
      
      // Update optimistic message to 'sent'
      setOptimisticMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        )
      )

      // Remove optimistic message after a delay (it will be replaced by real message)
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      
      // Mark message as error
      setOptimisticMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'error' } : msg
        )
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const instructorInitials = `${instructor.first_name?.[0] || ""}${instructor.last_name?.[0] || ""}`.toUpperCase()

  const getStatusIcon = (status: 'sending' | 'sent' | 'error') => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />
      case 'sent':
        return <Check className="h-3 w-3 text-success" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-primary/30 p-0 rounded">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-500/5 to-cyan-500/5 dark:from-green-900/20 dark:to-cyan-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-success/30 dark:border-success/30">
              <AvatarImage src={instructor.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-primary/60 text-white font-semibold">{instructorInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate font-semibold">
                {instructor.first_name} {instructor.last_name}
              </CardTitle>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">{courseTitle}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 mb-3 overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            {isLoading && messages.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">Loading messages...</div>
            ) : allMessages.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No messages yet. Send your first message!
              </div>
            ) : (
              <>
                {allMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-xs p-3 rounded-lg max-w-[85%] shadow-sm ${
                      msg.senderId === instructor.id
                        ? "bg-muted rounded-full rounded-tl-none"
                        : "bg-gradient-to-br from-primary/60 to-primary/30 ml-auto shadow-md rounded-full rounded-tr-none"
                    } ${msg.senderId === instructor.id ? "" : "flex flex-col items-end"}`}
                  >
                    <p className="break-words leading-tight">{msg.content}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs ${
                        msg.senderId === instructor.id 
                          ? "text-muted-foreground dark:text-muted-foreground"
                          : "text-success"
                      }`}>
                        {msg.status === 'sending' 
                          ? 'Sending...' 
                          : msg.status === 'error'
                          ? 'Failed to send'
                          : formatMessageTime(msg.createdAt)
                        }
                      </span>
                      {msg.senderId !== instructor.id && getStatusIcon(msg.status)}
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 bg-accent/20 p-3 border-t">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="text-xs h-8 bg-card dark:bg-accent/40 border-border dark:border-border focus:border-success/60 dark:focus:border-success/60"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="h-8 min-w-[32px] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            {isSending ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
