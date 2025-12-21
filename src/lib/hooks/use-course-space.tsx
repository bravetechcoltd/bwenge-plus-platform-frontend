
// @ts-nocheck
"use client"

import { useState, useCallback, useEffect } from "react"
import type { SpaceMessage, Message } from "@/types"
import useSWR from "swr"
import { useAuth } from "@/hooks/use-auth"
import { getSocket } from "@/lib/socket"

interface UseCourseSpaceProps {
  courseId: string
  conversationId?: string
}

export function useCourseSpace({ courseId, conversationId }: UseCourseSpaceProps) {
  const [error, setError] = useState<string | null>(null)
  const { token, user: currentUser } = useAuth()
  const [optimisticMessages, setOptimisticMessages] = useState<SpaceMessage[]>([])
  const [optimisticPrivateMessages, setOptimisticPrivateMessages] = useState<Message[]>([])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Fetch course space messages
  const {
    data: spaceMessages,
    isLoading: isLoadingSpace,
    mutate: mutateSpace,
  } = useSWR<{ data: SpaceMessage[] }>(
    token && courseId ? `${apiUrl}/course-spaces/${courseId}/messages` : null,
    async (url) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to fetch space messages")
      const data = await response.json()
      return data
    },
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  // Fetch private messages with instructor
  const {
    data: privateMessages,
    isLoading: isLoadingPrivate,
    mutate: mutatePrivate,
  } = useSWR<{ data: Message[] }>(
    token && conversationId ? `${apiUrl}/messages/${conversationId}/convo` : null,
    async (url) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to fetch private messages")
      const data = await response.json()
      return data
    },
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  // Fetch enrolled student count
  const {
    data: enrollmentData,
  } = useSWR<{ count: number }>(
    token && courseId ? `${apiUrl}/courses/${courseId}/enrollments-count` : null,
    async (url) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return { count: 0 }
      const data = await response.json()
      return data
    },
    { revalidateOnFocus: false }
  )

  // WebSocket listener for new space messages
  useEffect(() => {
    const socket = getSocket()
    
    const handleNewSpaceMessage = (message: SpaceMessage) => {
      if (message.spaceId === courseId) {
        mutateSpace()
      }
    }

    socket.on("new-space-message", handleNewSpaceMessage)

    return () => {
      socket.off("new-space-message", handleNewSpaceMessage)
    }
  }, [courseId, mutateSpace])

  // WebSocket listener for new private messages
  useEffect(() => {
    const socket = getSocket()
    
    const handleNewPrivateMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        mutatePrivate()
      }
    }

    socket.on("new-message", handleNewPrivateMessage)

    return () => {
      socket.off("new-message", handleNewPrivateMessage)
    }
  }, [conversationId, mutatePrivate])

  // Send message to course space
  const sendSpaceMessage = useCallback(
    async (content: string) => {
      if (!token || !currentUser) throw new Error("Not authenticated")

      // Create optimistic message
      const tempId = generateTempId()
      const optimisticMessage: SpaceMessage = {
        id: tempId,
        spaceId: courseId,
        senderId: currentUser.id,
        sender: currentUser,
        content,
        isRead: false,
        readAt: null,
        status: "sent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setOptimisticMessages(prev => [...prev, optimisticMessage])

      try {
        const response = await fetch(`${apiUrl}/course-spaces/${courseId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        })

        if (!response.ok) throw new Error("Failed to send message")

        const newMessage = await response.json()
        
        // Remove optimistic message and refresh with real one
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
        mutateSpace()
        setError(null)
      } catch (err) {
        // Remove optimistic message on error
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
        const message = err instanceof Error ? err.message : "Failed to send message"
        setError(message)
        throw err
      }
    },
    [token, currentUser, courseId, mutateSpace, apiUrl]
  )

  // Send private message to instructor
  const sendPrivateMessage = useCallback(
    async (content: string, convoId: string) => {
      if (!token || !currentUser) throw new Error("Not authenticated")

      // Create optimistic message
      const tempId = generateTempId()
      const optimisticMessage: Message = {
        id: tempId,
        conversationId: convoId,
        senderId: currentUser.id,
        sender: currentUser,
        content,
        isRead: false,
        readAt: null,
        status: "sent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setOptimisticPrivateMessages(prev => [...prev, optimisticMessage])

      try {
        const response = await fetch(`${apiUrl}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            conversationId: convoId,
          }),
        })

        if (!response.ok) throw new Error("Failed to send message")

        // Remove optimistic message and refresh with real one
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
        mutatePrivate()
        setError(null)
      } catch (err) {
        // Remove optimistic message on error
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
        const message = err instanceof Error ? err.message : "Failed to send message"
        setError(message)
        throw err
      }
    },
    [token, currentUser, mutatePrivate, apiUrl]
  )

  // Mark space message as read
  const markSpaceMessageAsRead = useCallback(
    async (messageId: string) => {
      if (!token) return

      try {
        await fetch(`${apiUrl}/course-spaces/${courseId}/messages/${messageId}/mark-read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (err) {
        console.error("Failed to mark message as read", err)
      }
    },
    [token, courseId, apiUrl]
  )

  // Combine real and optimistic messages
  const combinedSpaceMessages = [...(spaceMessages?.data || []), ...optimisticMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const combinedPrivateMessages = [...(privateMessages?.data || []), ...optimisticPrivateMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return {
    spaceMessages: combinedSpaceMessages,
    privateMessages: combinedPrivateMessages,
    enrolledStudentCount: enrollmentData?.count || 0,
    isLoadingSpace,
    isLoadingPrivate,
    error,
    sendSpaceMessage,
    sendPrivateMessage,
    markSpaceMessageAsRead,
    refetchSpace: mutateSpace,
    refetchPrivate: mutatePrivate,
  }
}

// Helper function to generate temp ID
const generateTempId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}