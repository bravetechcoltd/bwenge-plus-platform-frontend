"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, AlertCircle, MessageCircle, Users, Check, Clock } from "lucide-react"
import type { CourseSpaceMessage, User } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatMessageTime } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface CourseSpaceMessengerProps {
  spaceName: string
  enrolledStudentCount: number
  messages: CourseSpaceMessage[]
  currentUser: User
  isLoading: boolean
  onSendMessage: (content: string) => Promise<void>
  onOpenFullSpace: () => void
}

// Local type for optimistic messages
interface OptimisticMessage extends Omit<CourseSpaceMessage, 'status'> {
  status: 'sending' | 'sent' | 'error'
}

export function CourseSpaceMessenger({
  spaceName,
  enrolledStudentCount,
  messages,
  isLoading,
  onSendMessage,
  onOpenFullSpace,
}: CourseSpaceMessengerProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const { user: currentUser } = useAuth()

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
    if (!input.trim() || isSending || !currentUser) return

    const content = input.trim()
    setInput("")
    setError(null)

    // Create optimistic message with complete sender info
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      content,
      sender: currentUser,
      senderId: currentUser.id,
      spaceId: messages[0]?.spaceId || 'temp',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'sending',
      isRead: false,
      readAt: null,
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
      }, 500)
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

  const getAuthorInitials = (author?: User) => {
    if (!author) return "?"
    return `${author.first_name?.[0] || ""}${author.last_name?.[0] || ""}`.toUpperCase()
  }

  const isInstructor = (author?: User) => {
    return author?.bwenge_role === "INSTRUCTOR" || author?.institution_role === "INSTRUCTOR"
  }

  const getStatusIcon = (status: 'sending' | 'sent' | 'error') => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400 animate-pulse" />
      case 'sent':
        return <Check className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  // Helper to check if message is from current user
  const isCurrentUserMessage = (msg: OptimisticMessage) => {
    return msg.senderId === currentUser?.id || msg.sender?.id === currentUser?.id
  }

  return (
    <Card className="h-full flex flex-col border-0">
      <CardHeader className="border-b bg-gradient-to-r from-purple-500/5 to-pink-500/5 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm truncate font-semibold">{spaceName}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Users className="h-3 w-3" />
              <span>{enrolledStudentCount} enrolled</span>
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
          <div className="space-y-3">
            {isLoading && messages.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">Loading messages...</div>
            ) : allMessages.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No messages yet. Be the first to start the conversation!
              </div>
            ) : (
              allMessages.map((msg) => {
                const isCurrentUser = isCurrentUserMessage(msg)
                const sender = msg.sender
                
                return (
                  <div key={msg.id} className="text-xs space-y-1">
                    {/* Header with avatar and name - only show for other users' messages */}
                    {!isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={sender?.profile_picture_url} />
                          <AvatarFallback>{getAuthorInitials(sender)}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {sender?.first_name} {sender?.last_name}
                          </span>
                          {isInstructor(sender) && (
                            <Badge variant="secondary" className="text-xs">
                              Instructor
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div className={`
                          p-3 rounded-lg break-words shadow-sm
                          ${isCurrentUser 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          }
                          ${msg.status === 'error' 
                            ? 'border border-red-300 bg-red-100 text-red-900 dark:bg-red-900/30 dark:border-red-700' 
                            : ''
                          }
                        `}>
                          <p className="leading-tight">{msg.content}</p>
                          
                          {/* Timestamp and status */}
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            <span className="text-xs">
                              {msg.status === 'sending' 
                                ? 'Sending...' 
                                : msg.status === 'error'
                                ? 'Failed to send'
                                : formatMessageTime(msg.createdAt)
                              }
                            </span>
                            {isCurrentUser && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messageEndRef} />
          </div>
        </div>

        <div className="flex gap-2 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-gray-800/50 dark:to-gray-700/50 p-3 border-t">
          <Input
            placeholder= "Share with the class..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="text-xs h-8 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-400"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="h-8 min-w-[32px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
