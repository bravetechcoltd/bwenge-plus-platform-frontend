
// @ts-nocheck

"use client"

import { useAuth } from "@/hooks/use-auth"
import type { Message, ApiResponse, PaginatedResponse } from "@/types"
import useSWR from "swr"
import { fetcher, postFetcher } from "@/lib/fetcher"
import { useMessaging } from "./use-messaging"

export function useMessages() {
  const { token } = useAuth()
  const messaging = useMessaging()

  // Get inbox messages
  const {
    data: inboxData,
    mutate: mutateInbox,
    isLoading: inboxLoading,
  } = useSWR<ApiResponse<PaginatedResponse<Message>>>(
    token ? [`${process.env.NEXT_PUBLIC_API_URL}/messages/inbox`, token] : null,
    ([url, t]) => fetcher<ApiResponse<PaginatedResponse<Message>>>(url, t),
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  )

  // Get conversation with specific user (use messaging hook)
  const getConversation = (conversationId: string) => {
    return messaging.getConversation(conversationId)
  }

  // Send a message (use messaging hook)
  const sendMessage = async (conversationId: string, content: string) => {
    const result = await messaging.sendMessage(conversationId, content)
    await mutateInbox()
    return result
  }

  // Create a conversation (use messaging hook)
  const createConversation = async (instructorId: string, studentId: string, courseId: string) => {
    const result = await messaging.createConversation(instructorId, studentId, courseId)
    await mutateInbox()
    return result
  }

  // Mark message as read (use messaging hook)
  const markAsRead = async (messageIds: string[]) => {
    await messaging.markAsRead(messageIds)
    await mutateInbox()
  }

  // Get unread count
  const { data: unreadCount } = useSWR<{ count: number }>(
    token ? `${process.env.NEXT_PUBLIC_API_URL}/messages/unread-count` : null,
    (url) => fetcher(url, token!),
    { revalidateOnFocus: true, dedupingInterval: 30000 }
  )

  return {
    inbox: inboxData?.data?.courses || [],
    inboxLoading,
    sendMessage,
    getConversation,
    createConversation,
    markAsRead,
    unreadCount: unreadCount?.count || 0,
    mutateInbox,
  }
}