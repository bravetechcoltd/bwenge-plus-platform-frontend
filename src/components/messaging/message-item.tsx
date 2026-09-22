"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { PrivateMessage } from "@/types"
import { Check, CheckCheck } from "lucide-react"
import { formatMessageTime } from "@/lib/utils"

interface MessageItemProps {
  message: PrivateMessage
  isCurrentUserSender: boolean
  onClick?: () => void
}

export function MessageItem({ message, isCurrentUserSender, onClick }: MessageItemProps) {
  // Get the other user from the conversation
  const otherUser = message.conversation?.getOtherUser?.(message.senderId) || message.sender
  const initials = `${otherUser?.first_name?.[0] || ""}${otherUser?.last_name?.[0] || ""}`.toUpperCase()

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={otherUser?.profile_picture_url || "/placeholder.svg"} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm">
            {otherUser?.first_name} {otherUser?.last_name}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatMessageTime(message.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">{message.content}</p>
        <div className="flex items-center gap-2 mt-1">
          {message.conversation?.course && (
            <Badge variant="secondary" className="text-xs">
              {message.conversation.course.title}
            </Badge>
          )}
          {isCurrentUserSender && (
            <>
              {message.status === "read" ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground" />
              )}
            </>
          )}
          {!isCurrentUserSender && message.status !== "read" && <Badge className="bg-primary text-xs">New</Badge>}
        </div>
      </div>
    </div>
  )
}
