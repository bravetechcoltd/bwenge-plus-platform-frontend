
// @ts-nocheck

"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { useAuth } from "@/hooks/use-auth"
import { fetcher } from "@/lib/fetcher"
import type { Message, Conversation } from "@/types"
import { getSocket } from "@/lib/socket"

interface ConversationsResponse {
  success?: boolean
  conversations?: Conversation[]
  sanitized?: Conversation[]
}

interface ConversationResponse {
  success?: boolean
  data?: Message[]
  messages?: Message[]
}

export function useMessaging() {
  const { token, user } = useAuth()
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, Message[]>>(new Map())

  // Get all conversations
  const {
    data: conversationsData,
    error: conversationsError,
    isLoading: conversationsLoading,
    mutate: mutateConversations,
  } = useSWR<ConversationsResponse>(
    token ? `${process.env.NEXT_PUBLIC_API_URL}/conversations` : null,
    (url) => fetcher(url, token!),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  // Get messages in a conversation
  const getConversation = (conversationId: string) => {
    const {
      data,
      error,
      isLoading,
      mutate: mutateConversation,
    } = useSWR<ConversationResponse>(
      token && conversationId ? `${process.env.NEXT_PUBLIC_API_URL}/messages/${conversationId}/convo` : null,
      (url) => fetcher(url, token!),
      { revalidateOnFocus: false, dedupingInterval: 1000 }
    )

    // Combine real messages with optimistic ones
    const realMessages = data?.data || data?.messages || []
    const optimistic = optimisticMessages.get(conversationId) || []
    
    const allMessages = [...realMessages, ...optimistic].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return {
      messages: allMessages as Message[],
      loading: isLoading,
      error,
      mutate: mutateConversation,
    }
  }

  // Send a message
  const sendMessage = async (conversationId: string, content: string) => {
    if (!token) throw new Error("No token available")

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: user!.id,
      sender: user!,
      content,
      isRead: false,
      readAt: null,
      status: "sent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Add to optimistic messages
    setOptimisticMessages(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(conversationId) || []
      newMap.set(conversationId, [...existing, optimisticMessage])
      return newMap
    })

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, content }),
      })

      if (!response.ok) throw new Error("Failed to send message")
      
      const data = await response.json()

      // Remove optimistic message
      setOptimisticMessages(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(conversationId) || []
        newMap.set(conversationId, existing.filter(msg => msg.id !== tempId))
        return newMap
      })

      // Invalidate both inbox and conversation caches
      await mutate((key) => typeof key === "string" && key.includes("messages"), undefined, { revalidate: true })
      await mutate((key) => typeof key === "string" && key.includes("conversations"), undefined, { revalidate: true })

      return data.message || data.data
    } catch (error) {
      // Remove optimistic message on error
      setOptimisticMessages(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(conversationId) || []
        newMap.set(conversationId, existing.filter(msg => msg.id !== tempId))
        return newMap
      })
      console.error("Error sending message:", error)
      throw error
    }
  }

  // Create a conversation
  const createConversation = async (instructorId: string, studentId: string, courseId: string) => {
    if (!token) throw new Error("No token available")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instructorId,
          studentId,
          courseId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create conversation")
      
      const data = await response.json()
      
      // Refresh conversations list
      await mutateConversations()
      
      return data.conversation || data.data
    } catch (error) {
      console.error("Error creating conversation:", error)
      throw error
    }
  }

  // Mark messages as read
  const markAsRead = async (messageIds: string[]) => {
    if (!token) throw new Error("No token available")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/mark-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageIds }),
      })

      if (!response.ok) throw new Error("Failed to mark messages as read")
      
      await mutate((key) => typeof key === "string" && key.includes("messages"), undefined, { revalidate: true })
      await mutate((key) => typeof key === "string" && key.includes("conversations"), undefined, { revalidate: true })
    } catch (error) {
      console.error("Error marking messages as read:", error)
      throw error
    }
  }

  // Get unread count
  const { data: unreadCount } = useSWR(
    token ? `${process.env.NEXT_PUBLIC_API_URL}/messages/unread-count` : null,
    (url) => fetcher(url, token!),
    { revalidateOnFocus: true, dedupingInterval: 30000 }
  )

  // WebSocket listener for new messages
  useEffect(() => {
    const socket = getSocket()
    
    const handleNewMessage = (message: Message) => {
      // Refresh conversations and messages when new message arrives
      mutateConversations()
      mutate((key) => typeof key === "string" && key.includes(`messages/${message.conversationId}`))
    }

    socket.on("new-message", handleNewMessage)

    return () => {
      socket.off("new-message", handleNewMessage)
    }
  }, [mutateConversations])

  return {
    conversations: conversationsData?.sanitized || conversationsData?.conversations || [],
    conversationsLoading,
    conversationsError,
    getConversation,
    sendMessage,
    createConversation,
    markAsRead,
    unreadCount: (unreadCount as { count?: number })?.count || 0,
    mutateConversations,
  }
}