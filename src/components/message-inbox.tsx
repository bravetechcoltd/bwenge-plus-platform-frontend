// @ts-nocheck
"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import {
  Send, MessageSquare, Search, User, BookOpen, ChevronRight, Plus, MessageCircle,
  Clock, Users, Zap, Loader2, Paperclip, X, Pencil, Trash2, Check, CheckCheck,
  SmilePlus
} from "lucide-react"
import { PrivateMessage, CourseSpaceMessage } from "@/types"
import { getSocket, joinSpaceRoom, emitTypingStart, emitTypingStop, setupNotificationListener } from "@/lib/socket"
import { format } from "date-fns"

// ==================== TYPES ====================

interface UserInfo {
  id: string | number
  firstName: string
  lastName: string
  email?: string
  avatar?: string
  role?: string
  profilePicUrl?: string
}

interface Instructor extends UserInfo {
  courses: Array<{ id: string | number; title: string }>
}

interface Student extends UserInfo {
  courses: Array<{ id: string | number; title: string; level?: string }>
}

interface Course {
  id: string | number
  title: string
  level?: string
  instructor?: UserInfo
  course_instructors?: Array<{ instructor: UserInfo; is_primary_instructor?: boolean }>
}

interface Conversation {
  id: string
  otherUser?: any
  instructor?: Instructor
  student?: Student
  courseId: string | number
  courseTitle: string
  course?: { title: string }
  isTemporary?: boolean
  lastMessage?: PrivateMessage | null
  unreadCount?: number
  messages?: PrivateMessage[]
  originalId?: string
  conversationType?: string
}

interface Space {
  id: string
  courseSpaceId: string
  title: string
  name?: string
  courseId: string | number
  courseTitle: string
  spaceType?: string
  lastMessage?: CourseSpaceMessage | null
  unreadCount?: number
  messages?: CourseSpaceMessage[]
}

interface TemporaryConversation {
  id: string
  instructor?: Instructor
  student?: Student
  courseId: string | number
  courseTitle: string
  isTemporary: true
  lastMessage?: null
  unreadCount: 0
}

interface MessageInboxProps {
  enrolledCourses?: Course[]
  isStudent?: boolean
}

// ==================== HELPERS ====================

const formatMessageTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    return format(date, "h:mm a")
  } catch { return "" }
}

const normalizeUser = (user: any): UserInfo | null => {
  if (!user) return null
  return {
    id: user.id,
    firstName: user.first_name || user.firstName || "",
    lastName: user.last_name || user.lastName || "",
    email: user.email,
    avatar: user.avatar || user.profile_picture_url || user.profilePicUrl,
    profilePicUrl: user.profile_picture_url || user.profilePicUrl || user.avatar,
    role: user.bwenge_role || user.role,
  }
}

const getMessageSenderName = (message: any, currentUserId: string | number): string => {
  if (message.senderId === currentUserId) return "You"
  if (message.sender) {
    const n = `${message.sender.first_name || message.sender.firstName || ""} ${message.sender.last_name || message.sender.lastName || ""}`.trim()
    if (n) return n
  }
  return "Unknown"
}

const getMessageSenderAvatar = (message: any): string | undefined =>
  message.sender?.profile_picture_url || message.sender?.profilePicUrl || message.sender?.avatar

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

// ==================== MAIN COMPONENT ====================

export function MessageInbox({ enrolledCourses = [], isStudent = true }: MessageInboxProps) {
  const { user, token } = useAuth()

  // ── Core state ────────────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | number | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false)
  const [modalSearchTerm, setModalSearchTerm] = useState("")
  const [temporaryConversations, setTemporaryConversations] = useState<TemporaryConversation[]>([])
  const [modalStep, setModalStep] = useState<"user" | "course">("user")
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserInfo | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [isFetchingStudents, setIsFetchingStudents] = useState(false)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceMessages, setSpaceMessages] = useState<CourseSpaceMessage[]>([])
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [currentType, setCurrentType] = useState<"conversation" | "space">("conversation")
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [socketInstance, setSocketInstance] = useState<any>(null)

  // ── Enhancement #3: Infinite scroll state ─────────────────────────────────
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [hasMoreSpaceMessages, setHasMoreSpaceMessages] = useState(false)
  const [isFetchingOlder, setIsFetchingOlder] = useState(false)
  const [oldestCursor, setOldestCursor] = useState<string | null>(null)
  const [oldestSpaceCursor, setOldestSpaceCursor] = useState<string | null>(null)

  // ── Enhancement #2: Typing indicators state ────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({})
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const isTypingRef = useRef(false)

  // ── Enhancement #5: Message search state ──────────────────────────────────
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState("")
  const [msgSearchResults, setMsgSearchResults] = useState<PrivateMessage[]>([])
  const [isSearchingMsgs, setIsSearchingMsgs] = useState(false)

  // ── Enhancement #6: Attachment state ──────────────────────────────────────
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Enhancement #7: Emoji reactions state ─────────────────────────────────
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)

  // ── Enhancement #8: Online presence state ─────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // ── Enhancement #9: Edit / Delete state ───────────────────────────────────
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const selectedConvIdRef = useRef<string | null>(null)
  const selectedSpaceIdRef = useRef<string | null>(null)
  // Enhancement #10: track window focus to suppress in-app notifications
  const windowFocusedRef = useRef(true)

  useEffect(() => {
    selectedConvIdRef.current = selectedConversation
      ? ((selectedConversation as any).originalId || selectedConversation.id)
      : null
  }, [selectedConversation])

  useEffect(() => {
    selectedSpaceIdRef.current = selectedSpace
      ? (selectedSpace.courseSpaceId || selectedSpace.id)
      : null
  }, [selectedSpace])

  // ── Scroll helpers ────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current)
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }, 60)
    }
  }, [])

  // ── Enhancement #10: Browser notifications & window focus tracking ───────

  useEffect(() => {
    // Request permission
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission()
    }

    // Track focus/blur so we suppress sounds while the user is actively reading
    const onFocus = () => { windowFocusedRef.current = true }
    const onBlur = () => { windowFocusedRef.current = false }
    window.addEventListener("focus", onFocus)
    window.addEventListener("blur", onBlur)

    // Register the global socket-level notification listener (plays sound + fires
    // browser Notification) — as specified by guide item #10 for socket.ts frontend
    setupNotificationListener()

    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("blur", onBlur)
    }
  }, [])

  // In-component fallback notification (fires when window is focused but
  // the specific conversation is not the active one — complements socket.ts listener)
  const showBrowserNotification = useCallback((title: string, body: string) => {
    const hidden = typeof document !== "undefined" && document.hidden
    const unfocused = !windowFocusedRef.current
    if ((hidden || unfocused) && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" })
    }
  }, [])

  // ── Socket setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true
    let socket: any = null

    const setupSocket = async () => {
      try {
        const socketConnection = await getSocket()
        if (!mounted) return

        socket = socketConnection
        setSocketInstance(socket)
        if (!socket) return

        // Request current online users
        socket.emit("get-online-users")

        const handleNewMessage = (message: any) => {
          if (message.senderId === user?.id) return

          if (message.conversationId === selectedConvIdRef.current) {
            const enhanced = { ...message, sender: message.sender || null }
            setMessages(prev => prev.some(m => m.id === enhanced.id) ? prev : [...prev, enhanced])
            scrollToBottom()
          }

          setConversations(prev =>
            prev.map(conv =>
              conv.id === message.conversationId || (conv as any).originalId === message.conversationId
                ? { ...conv, lastMessage: message, unreadCount: (conv.unreadCount || 0) + 1 }
                : conv
            )
          )

          // Enhancement #10: notification
          const senderName = message.sender
            ? `${message.sender.first_name || ""} ${message.sender.last_name || ""}`.trim()
            : "Someone"
          showBrowserNotification(senderName, message.content || "📎 Attachment")
        }

        const handleNewSpaceMessage = (message: any) => {
          if (message.senderId === user?.id) return

          if (message.spaceId === selectedSpaceIdRef.current) {
            const enhanced = { ...message, sender: message.sender || null }
            setSpaceMessages(prev => prev.some(m => m.id === enhanced.id) ? prev : [...prev, enhanced])
            scrollToBottom()
          }

          setSpaces(prev =>
            prev.map(space =>
              space.courseSpaceId === message.spaceId || space.id === message.spaceId
                ? { ...space, lastMessage: message }
                : space
            )
          )
        }

        // Enhancement #1: Read receipts
        const handleMessageRead = ({ conversationId, readBy }: any) => {
          if (conversationId === selectedConvIdRef.current) {
            setMessages(prev =>
              prev.map(m => m.senderId === user?.id ? { ...m, status: "read", isRead: true } : m)
            )
          }
        }

        // Enhancement #2: Typing indicators
        const handleTypingStart = ({ conversationId, senderId }: any) => {
          setTypingUsers(prev => {
            const next = { ...prev }
            if (!next[conversationId]) next[conversationId] = new Set()
            next[conversationId] = new Set([...next[conversationId], senderId])
            return next
          })
        }

        const handleTypingStop = ({ conversationId, senderId }: any) => {
          setTypingUsers(prev => {
            const next = { ...prev }
            if (next[conversationId]) {
              const s = new Set(next[conversationId])
              s.delete(senderId)
              next[conversationId] = s
            }
            return next
          })
        }

        // Enhancement #7: Reactions
        const handleReactionUpdated = ({ messageId, conversationId, reactions }: any) => {
          if (conversationId === selectedConvIdRef.current) {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
          }
        }

        // Enhancement #8: Online presence
        const handleUserOnline = ({ userId }: any) => {
          setOnlineUsers(prev => new Set([...prev, userId]))
        }

        const handleUserOffline = ({ userId }: any) => {
          setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n })
        }

        const handleOnlineUsers = ({ users }: any) => {
          setOnlineUsers(new Set(users))
        }

        // Enhancement #9: Edit / Delete
        const handleMessageEdited = ({ messageId, conversationId, content, isEdited }: any) => {
          if (conversationId === selectedConvIdRef.current) {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited } : m))
          }
        }

        const handleMessageDeleted = ({ messageId, conversationId }: any) => {
          if (conversationId === selectedConvIdRef.current) {
            setMessages(prev => prev.filter(m => m.id !== messageId))
          }
        }

        const handleSpaceMsgEdited = ({ messageId, spaceId, content, isEdited }: any) => {
          if (spaceId === selectedSpaceIdRef.current) {
            setSpaceMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited } : m))
          }
        }

        const handleSpaceMsgDeleted = ({ messageId, spaceId }: any) => {
          if (spaceId === selectedSpaceIdRef.current) {
            setSpaceMessages(prev => prev.filter(m => m.id !== messageId))
          }
        }

        socket.on("new-message", handleNewMessage)
        socket.on("new-space-message", handleNewSpaceMessage)
        socket.on("message-sent", () => {})
        socket.on("message-read", handleMessageRead)
        socket.on("typing-start", handleTypingStart)
        socket.on("typing-stop", handleTypingStop)
        socket.on("reaction-updated", handleReactionUpdated)
        socket.on("user-online", handleUserOnline)
        socket.on("user-offline", handleUserOffline)
        socket.on("online-users", handleOnlineUsers)
        socket.on("message-edited", handleMessageEdited)
        socket.on("message-deleted", handleMessageDeleted)
        socket.on("space-message-edited", handleSpaceMsgEdited)
        socket.on("space-message-deleted", handleSpaceMsgDeleted)
        socket.on("error", (e: any) => console.error("Socket error:", e))

        return () => {
          socket.off("new-message", handleNewMessage)
          socket.off("new-space-message", handleNewSpaceMessage)
          socket.off("message-sent")
          socket.off("message-read", handleMessageRead)
          socket.off("typing-start", handleTypingStart)
          socket.off("typing-stop", handleTypingStop)
          socket.off("reaction-updated", handleReactionUpdated)
          socket.off("user-online", handleUserOnline)
          socket.off("user-offline", handleUserOffline)
          socket.off("online-users", handleOnlineUsers)
          socket.off("message-edited", handleMessageEdited)
          socket.off("message-deleted", handleMessageDeleted)
          socket.off("space-message-edited", handleSpaceMsgEdited)
          socket.off("space-message-deleted", handleSpaceMsgDeleted)
          socket.off("error")
        }
      } catch (error) {
        console.error("❌ Error setting up socket:", error)
      }
    }

    setupSocket()
    return () => { mounted = false }
  }, [user?.id, scrollToBottom, showBrowserNotification])

  // ── Auto-scroll on new messages ───────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 || spaceMessages.length > 0) scrollToBottom()
  }, [messages, spaceMessages, scrollToBottom])

  useEffect(() => {
    if (!isFetchingMessages && (messages.length > 0 || spaceMessages.length > 0)) scrollToBottom()
  }, [isFetchingMessages, messages.length, spaceMessages.length, scrollToBottom])

  // ── Enhancement #3: IntersectionObserver for infinite scroll ─────────────

  useEffect(() => {
    if (!topSentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingOlder) {
          if (currentType === "conversation" && hasMoreMessages && oldestCursor) {
            loadOlderMessages()
          } else if (currentType === "space" && hasMoreSpaceMessages && oldestSpaceCursor) {
            loadOlderSpaceMessages()
          }
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(topSentinelRef.current)
    return () => observer.disconnect()
  }, [currentType, hasMoreMessages, hasMoreSpaceMessages, oldestCursor, oldestSpaceCursor, isFetchingOlder])

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversation || isFetchingOlder || !oldestCursor || !token) return
    const convId = (selectedConversation as any).originalId || selectedConversation.id
    setIsFetchingOlder(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/${convId}/convo?limit=50&before=${encodeURIComponent(oldestCursor)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const older = data.data || []
        if (older.length > 0) {
          const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0
          setMessages(prev => [...older, ...prev])
          setOldestCursor(older[0]?.createdAt || null)
          setHasMoreMessages(data.pagination?.hasMore || false)
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight - prevScrollHeight
            }
          }, 50)
        } else {
          setHasMoreMessages(false)
        }
      }
    } catch (e) { console.error("Error loading older messages:", e) }
    finally { setIsFetchingOlder(false) }
  }, [selectedConversation, isFetchingOlder, oldestCursor, token])

  const loadOlderSpaceMessages = useCallback(async () => {
    if (!selectedSpace || isFetchingOlder || !oldestSpaceCursor || !token) return
    const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
    setIsFetchingOlder(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/space/${spaceId}/messages?limit=50&before=${encodeURIComponent(oldestSpaceCursor)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const older = data.data || []
        if (older.length > 0) {
          const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0
          setSpaceMessages(prev => [...older, ...prev])
          setOldestSpaceCursor(older[0]?.createdAt || null)
          setHasMoreSpaceMessages(data.pagination?.hasMore || false)
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight - prevScrollHeight
            }
          }, 50)
        } else {
          setHasMoreSpaceMessages(false)
        }
      }
    } catch (e) { console.error("Error loading older space messages:", e) }
    finally { setIsFetchingOlder(false) }
  }, [selectedSpace, isFetchingOlder, oldestSpaceCursor, token])

  // ── Fetch conversations ────────────────────────────────────────────────────

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) { setIsLoadingConversations(false); return }
      setIsLoadingConversations(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const normalized = (data.conversations || data.sanitized || []).map((conv: any) => ({
          ...conv,
          otherUser: conv.otherUser ? normalizeUser(conv.otherUser) : null,
          instructor: conv.instructor ? normalizeUser(conv.instructor) : null,
          student: conv.student ? normalizeUser(conv.student) : null,
          courseTitle: conv.course?.title || conv.courseTitle || "Course",
        }))
        setConversations(normalized)

        // Enhancement #8: seed online status from REST for immediate display
        const otherIds = normalized
          .map((c: any) => c.otherUser?.id || c.instructor?.id || c.student?.id)
          .filter(Boolean)
          .map(String)
        if (otherIds.length > 0) {
          try {
            const statusRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/users/online-status?userIds=${otherIds.join(",")}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              const newOnline = new Set<string>()
              Object.entries(statusData.onlineStatus || {}).forEach(([id, isOnline]) => {
                if (isOnline) newOnline.add(id)
              })
              setOnlineUsers(newOnline)
            }
          } catch { /* non-critical */ }
        }
      } catch (e) { console.error("Error fetching conversations:", e) }
      finally { setIsLoadingConversations(false) }
    }
    fetchConversations()
  }, [token])

  // ── Fetch spaces ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchSpaces = async () => {
      if (!token || !user?.id) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/user/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const spacesData = data.data || []
          setSpaces(spacesData.map((space: any) => ({
            ...space,
            courseSpaceId: space.id,
            title: space.name || space.course?.title || "Space",
            courseTitle: space.course?.title || space.name || "Course Space",
          })))
        } else {
          setSpaces([])
        }
      } catch { setSpaces([]) }
    }
    fetchSpaces()
  }, [token, user?.id])

  // ── Fetch students (for instructors) ──────────────────────────────────────

  useEffect(() => {
    const fetchStudents = async () => {
      if (!isStudent && user?.id && token) {
        setIsFetchingStudents(true)
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instructor/${user.id}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          if (data.success && data.students) {
            setAvailableStudents(data.students.map((apiStudent: any) => {
              const s = apiStudent.student || apiStudent
              return {
                id: s.id,
                firstName: s.first_name || s.firstName || "",
                lastName: s.last_name || s.lastName || "",
                email: s.email,
                avatar: s.profile_picture_url || s.profilePicUrl,
                profilePicUrl: s.profile_picture_url || s.profilePicUrl,
                courses: apiStudent.courses?.map((c: any) => ({ id: c.id, title: c.title, level: c.level })) || [],
              }
            }))
          }
        } catch (e) { console.error("Error fetching students:", e) }
        finally { setIsFetchingStudents(false) }
      }
    }
    fetchStudents()
  }, [isStudent, user?.id, token])

  // ── Unique instructors (for students) ─────────────────────────────────────

  const uniqueInstructors = useMemo(() => {
    if (!isStudent || !enrolledCourses?.length) return []
    const map = new Map<string, Instructor>()
    enrolledCourses.forEach(course => {
      const addInstructor = (ins: any) => {
        if (!ins?.id) return
        const id = String(ins.id)
        if (!map.has(id)) {
          map.set(id, {
            id, firstName: ins.first_name || ins.firstName || "Instructor",
            lastName: ins.last_name || ins.lastName || "",
            email: ins.email,
            avatar: ins.profile_picture_url || ins.avatar,
            profilePicUrl: ins.profile_picture_url || ins.profilePicUrl,
            courses: [],
          })
        }
        const existing = map.get(id)!
        if (!existing.courses.some(c => String(c.id) === String(course.id)))
          existing.courses.push({ id: course.id, title: course.title })
      }
      addInstructor(course.instructor)
      course.course_instructors?.forEach(ci => addInstructor(ci.instructor))
    })
    return Array.from(map.values())
  }, [enrolledCourses, isStudent])

  // ── Modal filters ──────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    const pool = isStudent ? uniqueInstructors : availableStudents
    if (!modalSearchTerm.trim()) return pool
    const search = modalSearchTerm.toLowerCase()
    return pool.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    )
  }, [isStudent, uniqueInstructors, availableStudents, modalSearchTerm])

  const userCourses = useMemo(() => {
    if (!selectedUserForModal) return []
    return isStudent
      ? (selectedUserForModal as Instructor).courses || []
      : (selectedUserForModal as Student).courses || []
  }, [selectedUserForModal, isStudent])

  // ── All conversations with dedup ──────────────────────────────────────────

  const allConversations = useMemo(() => {
    const map = new Map<string, Conversation>()
    conversations.forEach(c => map.set(c.id, c))
    temporaryConversations.forEach(t => {
      const k = `temp-${t.id}`
      map.set(k, {
        ...t, id: k, originalId: t.id,
        otherUser: isStudent ? t.instructor : t.student,
        courseTitle: t.courseTitle,
      })
    })
    return Array.from(map.values())
  }, [conversations, temporaryConversations, isStudent])

  const currentConversation = useMemo(() => {
    if (!selectedUser || !selectedCourseId) return null
    const real = conversations.find(c => {
      const other = c.otherUser || (isStudent ? c.instructor : c.student)
      return other?.id === selectedUser.id && c.courseId === selectedCourseId
    })
    if (real) return real
    const temp = temporaryConversations.find(t => {
      const other = isStudent ? t.instructor : t.student
      return other?.id === selectedUser.id && t.courseId === selectedCourseId
    })
    if (temp) return { ...temp, id: `temp-${temp.id}`, originalId: temp.id, isTemporary: true, otherUser: isStudent ? temp.instructor : temp.student }
    return null
  }, [selectedUser, selectedCourseId, conversations, temporaryConversations, isStudent])

  // ── Enhancement #1: Mark as read when conversation opens ──────────────────

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!token) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${conversationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      )
    } catch { /* non-critical */ }
  }, [token])

  // ── Fetch messages ─────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (conversationId: string, loading = true) => {
    if (!conversationId || !token) return
    if (loading) setIsFetchingMessages(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/${conversationId}/convo?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const msgs = data.data || []
        setMessages(msgs)
        setHasMoreMessages(data.pagination?.hasMore || false)
        setOldestCursor(msgs.length > 0 ? msgs[0]?.createdAt : null)
        setSelectedConversation(prev => prev ? { ...prev, messages: msgs, lastMessage: msgs[msgs.length - 1] || null } : prev)
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, messages: msgs, lastMessage: msgs[msgs.length - 1] || null } : c))
        // Mark as read
        markConversationAsRead(conversationId)
      }
    } catch (e) { console.error("Error fetching messages:", e) }
    finally { setIsFetchingMessages(false) }
  }, [token, markConversationAsRead])

  // ── Fetch space messages ───────────────────────────────────────────────────

  const fetchSpaceMessages = useCallback(async (spaceId: string, loading = true) => {
    if (!spaceId || !token) return
    if (loading) setIsFetchingMessages(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/space/${spaceId}/messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const msgs = data.data || []
        setSpaceMessages(msgs)
        setHasMoreSpaceMessages(data.pagination?.hasMore || false)
        setOldestSpaceCursor(msgs.length > 0 ? msgs[0]?.createdAt : null)
        setSelectedSpace(prev => prev ? { ...prev, messages: msgs, lastMessage: msgs[msgs.length - 1] || null } : prev)
        setSpaces(prev => prev.map(s => s.courseSpaceId === spaceId || s.id === spaceId ? { ...s, messages: msgs, lastMessage: msgs[msgs.length - 1] || null } : s))
      }
    } catch (e) { console.error("Error fetching space messages:", e) }
    finally { setIsFetchingMessages(false) }
  }, [token])

  useEffect(() => {
    if (selectedConversation?.id && !selectedConversation?.isTemporary) {
      const id = (selectedConversation as any).originalId || selectedConversation.id
      fetchMessages(id)
    }
  }, [selectedConversation?.id, token, fetchMessages])

  useEffect(() => {
    if (selectedSpace?.courseSpaceId || selectedSpace?.id) {
      const id = selectedSpace.courseSpaceId || selectedSpace.id
      if (id) fetchSpaceMessages(id)
    }
  }, [selectedSpace?.courseSpaceId, selectedSpace?.id, fetchSpaceMessages])

  // ── Enhancement #5: Message search (private conversations + spaces) ─────

  const handleMsgSearch = useCallback(async (query: string) => {
    if (!query.trim() || !token) {
      setMsgSearchResults([])
      return
    }
    setIsSearchingMsgs(true)
    try {
      let url = ""
      if (currentType === "conversation" && selectedConversation && !selectedConversation.isTemporary) {
        const convId = (selectedConversation as any).originalId || selectedConversation.id
        url = `${process.env.NEXT_PUBLIC_API_URL}/messages/${convId}/search?q=${encodeURIComponent(query)}`
      } else if (currentType === "space" && selectedSpace) {
        const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
        url = `${process.env.NEXT_PUBLIC_API_URL}/space/${spaceId}/search?q=${encodeURIComponent(query)}`
      }
      if (!url) { setMsgSearchResults([]); return }

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setMsgSearchResults(data.data || [])
      }
    } catch { /* non-critical */ }
    finally { setIsSearchingMsgs(false) }
  }, [currentType, selectedConversation, selectedSpace, token])

  useEffect(() => {
    const t = setTimeout(() => handleMsgSearch(msgSearchQuery), 400)
    return () => clearTimeout(t)
  }, [msgSearchQuery, handleMsgSearch])

  // ── Enhancement #2: Typing indicator emission ──────────────────────────────

  const handleTypingChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value)

    if (currentType !== "conversation" || !selectedConversation) return
    const otherUser = selectedConversation.otherUser || (isStudent ? selectedConversation.instructor : selectedConversation.student)
    if (!otherUser?.id) return

    const convId = (selectedConversation as any).originalId || selectedConversation.id
    const receiverId = String(otherUser.id)

    if (!isTypingRef.current) {
      isTypingRef.current = true
      emitTypingStart(convId, receiverId)
    }

    if (typingTimeoutRef.current[convId]) clearTimeout(typingTimeoutRef.current[convId])
    typingTimeoutRef.current[convId] = setTimeout(() => {
      isTypingRef.current = false
      emitTypingStop(convId, receiverId)
    }, 2000)
  }, [currentType, selectedConversation, isStudent])

  // ── Enhancement #6: Attachment handling ───────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentFile(file)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => setAttachmentPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setAttachmentPreview(null)
    }
  }

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachmentFile || !token) return null
    const formData = new FormData()
    formData.append("file", attachmentFile)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        return data.attachmentUrl || null
      }
    } catch (e) { console.error("Upload failed:", e) }
    return null
  }

  const clearAttachment = () => {
    setAttachmentFile(null)
    setAttachmentPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── Enhancement #7: Reactions ──────────────────────────────────────────────

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!token) return
    setReactionPickerMsgId(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m))
      }
    } catch { /* non-critical */ }
  }

  // ── Enhancement #9: Edit message ──────────────────────────────────────────

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent, isEdited: true } : m))
        setEditingMessageId(null)
        setEditContent("")
      }
    } catch { /* non-critical */ }
  }

  // ── Enhancement #9: Delete message ────────────────────────────────────────

  const handleDeleteMessage = async (messageId: string) => {
    if (!token) return
    setContextMenuMsgId(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch { /* non-critical */ }
  }

  // ── Enhancement #9: Edit/Delete space message ─────────────────────────────

  const handleEditSpaceMessage = async (messageId: string) => {
    if (!editContent.trim() || !token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/messages/${messageId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        setSpaceMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent, isEdited: true } : m))
        setEditingMessageId(null)
        setEditContent("")
      }
    } catch { /* non-critical */ }
  }

  const handleDeleteSpaceMessage = async (messageId: string) => {
    if (!token) return
    setContextMenuMsgId(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSpaceMessages(prev => prev.filter(m => m.id !== messageId))
    } catch { /* non-critical */ }
  }

  // ── Send private message ───────────────────────────────────────────────────

  const handleSendPrivateMessage = async () => {
    if ((!messageText.trim() && !attachmentFile) || !selectedUser || !selectedCourseId || !token || !user) return

    setIsSubmitting(true)
    const content = messageText.trim()

    // Upload attachment if present
    let attachUrl: string | null = null
    if (attachmentFile) {
      attachUrl = await uploadAttachment()
      if (!attachUrl && !content) { setIsSubmitting(false); return }
    }

    const isTempConversation = currentConversation?.isTemporary === true

    if (isTempConversation) {
      try {
        const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            courseId: selectedCourseId,
            instructorId: isStudent ? selectedUser.id : user.id,
            studentId: isStudent ? user.id : selectedUser.id,
          }),
        })
        if (!createRes.ok) throw new Error((await createRes.json()).message || "Failed to create conversation")

        const data = await createRes.json()
        const realId = data.conversation?.id || data.id
        if (!realId) throw new Error("No conversation ID returned")

        setTemporaryConversations(prev => prev.filter(t => {
          const o = isStudent ? t.instructor : t.student
          return !(o?.id === selectedUser.id && t.courseId === selectedCourseId)
        }))

        const newConv = { id: realId, otherUser: selectedUser, instructor: isStudent ? (selectedUser as Instructor) : undefined, student: isStudent ? undefined : (selectedUser as Student), courseId: selectedCourseId, courseTitle: selectedConversation?.courseTitle || "", lastMessage: null, unreadCount: 0, messages: [] }
        setConversations(prev => [...prev, newConv])
        setSelectedConversation(newConv)

        const msgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ conversationId: realId, content, attachmentUrl: attachUrl }),
        })
        if (!msgRes.ok) throw new Error("Failed to send message")
        const sent = await msgRes.json()
        const realMsg = sent.data || sent
        if (realMsg) setMessages(prev => [...prev, realMsg])
        setMessageText("")
        clearAttachment()
        scrollToBottom()

        const convRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
        if (convRes.ok) {
          const d = await convRes.json()
          setConversations((d.conversations || d.sanitized || []).map((c: any) => ({
            ...c, otherUser: c.otherUser ? normalizeUser(c.otherUser) : null,
            instructor: c.instructor ? normalizeUser(c.instructor) : null,
            student: c.student ? normalizeUser(c.student) : null,
          })))
        }
      } catch (e: any) {
        alert(e.message || "Failed to send message")
      } finally { setIsSubmitting(false) }
      return
    }

    if (!selectedConversation?.id || selectedConversation?.isTemporary) { setIsSubmitting(false); return }

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId, content, senderId: user.id,
      conversationId: selectedConversation.id,
      attachmentUrl: attachUrl || attachmentPreview,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      isRead: false, readAt: null, status: "sent", isEdited: false, reactions: {},
      _isOptimistic: true,
      sender: {
        id: user.id, first_name: user.first_name || user.firstName || "",
        last_name: user.last_name || user.lastName || "",
        profile_picture_url: user.profile_picture_url || user.profilePicUrl, email: user.email,
      },
    } as any

    setMessages(prev => [...prev, optimistic])
    setMessageText("")
    clearAttachment()
    scrollToBottom()

    try {
      const msgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: selectedConversation.id, content, attachmentUrl: attachUrl }),
      })
      if (!msgRes.ok) throw new Error("Failed to send message")
      const sent = await msgRes.json()
      const realMsg = sent.data || sent
      setMessages(prev => prev.map(m => (m as any)._isOptimistic && m.content === content && m.senderId === user.id ? realMsg : m))
      setSelectedConversation(prev => prev ? { ...prev, lastMessage: realMsg } : prev)
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, lastMessage: realMsg } : c))
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" as any } : m))
      alert(e.message || "Failed to send message")
    } finally { setIsSubmitting(false) }
  }

  // ── Send space message ─────────────────────────────────────────────────────

  const handleSendSpaceMessage = async () => {
    if ((!messageText.trim() && !attachmentFile) || !selectedSpace || !token || !user) return

    setIsSubmitting(true)
    const content = messageText.trim()
    const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
    const tempId = `temp-space-${Date.now()}`

    const optimistic = {
      id: tempId, content, senderId: user.id, spaceId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      isRead: false, readAt: null, status: "sent", isEdited: false, _isOptimistic: true,
      sender: {
        id: user.id, first_name: user.first_name || user.firstName || "",
        last_name: user.last_name || user.lastName || "",
        profile_picture_url: user.profile_picture_url || user.profilePicUrl, email: user.email,
      },
    } as any

    setSpaceMessages(prev => [...prev, optimistic])
    setMessageText("")
    scrollToBottom()

    try {
      const msgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spaceId, content }),
      })
      if (!msgRes.ok) throw new Error("Failed to send message")
      const sent = await msgRes.json()
      const realMsg = sent.data || sent
      setSpaceMessages(prev => prev.map(m => (m as any)._isOptimistic && m.content === content && m.senderId === user.id ? realMsg : m))
    } catch (e: any) {
      setSpaceMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" as any } : m))
      alert(e.message || "Failed to send message")
    } finally { setIsSubmitting(false) }
  }

  // ── Conversation / Space selection ────────────────────────────────────────

  const handleConversationSelect = useCallback(async (conversation: Conversation) => {
    setMessageText("")
    setMessages([])
    setCurrentType("conversation")
    setSelectedSpace(null)
    setShowMsgSearch(false)
    setMsgSearchQuery("")

    const otherUser = conversation.otherUser || (isStudent ? conversation.instructor : conversation.student)
    if (otherUser) setSelectedUser(otherUser)
    setSelectedCourseId(conversation.courseId)
    setSelectedConversation(conversation)

    if (!conversation.isTemporary) {
      const originalId = (conversation as any).originalId || conversation.id
      await fetchMessages(originalId)
    }
  }, [isStudent, fetchMessages])

  const handleSpaceSelect = useCallback(async (space: Space) => {
    setMessageText("")
    setSpaceMessages([])
    setCurrentType("space")
    setSelectedSpace(space)
    setSelectedUser(null)
    setSelectedCourseId(null)
    setSelectedConversation(null)
    setShowMsgSearch(false)
    setMsgSearchQuery("")

    const spaceId = space.courseSpaceId || space.id
    await joinSpaceRoom(spaceId)
    await fetchSpaceMessages(spaceId)
  }, [fetchSpaceMessages])

  // ── Create temporary conversation ─────────────────────────────────────────

  const handleSelectUser = (u: UserInfo) => {
    setSelectedUserForModal(u)
    const courses = isStudent ? (u as Instructor).courses : (u as Student).courses
    if (courses.length === 1) {
      createTemporaryConversation(u, courses[0].id, courses[0].title)
      setIsSelectModalOpen(false)
      resetModalState()
    } else {
      setModalStep("course")
    }
  }

  const handleSelectCourse = (courseId: string | number, courseTitle: string) => {
    if (!selectedUserForModal) return
    createTemporaryConversation(selectedUserForModal, courseId, courseTitle)
    setIsSelectModalOpen(false)
    resetModalState()
  }

  const createTemporaryConversation = (selUser: UserInfo, courseId: string | number, courseTitle: string) => {
    const tempId = `temp-${selUser.id}-${courseId}-${Date.now()}`
    const newTemp: TemporaryConversation = {
      id: tempId, instructor: isStudent ? (selUser as Instructor) : undefined,
      student: !isStudent ? (selUser as Student) : undefined,
      courseId, courseTitle, isTemporary: true, lastMessage: null, unreadCount: 0,
    }
    setTemporaryConversations(prev =>
      [...prev.filter(t => { const o = isStudent ? t.instructor : t.student; return !(o?.id === selUser.id && t.courseId === courseId) }), newTemp]
    )
    setSelectedUser(selUser)
    setSelectedCourseId(courseId)
    setSelectedConversation({ ...newTemp, id: tempId, isTemporary: true, otherUser: selUser, courseTitle })
    setCurrentType("conversation")
    setSelectedSpace(null)
  }

  const resetModalState = () => { setModalSearchTerm(""); setModalStep("user"); setSelectedUserForModal(null) }

  // ── Display helpers ───────────────────────────────────────────────────────

  const getUserDisplayName = (c: Conversation) => {
    const o = c.otherUser || (isStudent ? c.instructor : c.student)
    return o ? `${o.firstName || ""} ${o.lastName || ""}`.trim() || "User" : "Unknown User"
  }

  const getUserAvatar = (c: Conversation) => {
    const o = c.otherUser || (isStudent ? c.instructor : c.student)
    return o?.avatar || o?.profilePicUrl
  }

  const getUserInitials = (c: Conversation) => {
    const n = getUserDisplayName(c)
    return n.split(" ").map(p => p.charAt(0)).slice(0, 2).join("").toUpperCase()
  }

  // ── Enhancement #1: Status checkmarks ────────────────────────────────────

  const StatusIcon = ({ message }: { message: any }) => {
    if (message.status === "read") return <CheckCheck className="w-3 h-3 text-blue-400 inline ml-1" />
    if (message.status === "delivered") return <CheckCheck className="w-3 h-3 opacity-50 inline ml-1" />
    return <Check className="w-3 h-3 opacity-50 inline ml-1" />
  }

  // ── Enhancement #2: Typing indicator ──────────────────────────────────────

  const isPartnerTyping = useMemo(() => {
    if (!selectedConversation) return false
    const convId = (selectedConversation as any).originalId || selectedConversation.id
    const set = typingUsers[convId]
    if (!set || set.size === 0) return false
    const partnerId = String(selectedConversation.otherUser?.id || (isStudent ? selectedConversation.instructor?.id : selectedConversation.student?.id) || "")
    return set.has(partnerId)
  }, [typingUsers, selectedConversation, isStudent])

  // ── Enhancement #8: Online check helper ───────────────────────────────────

  const isOnline = (userId: string | number | undefined) =>
    userId ? onlineUsers.has(String(userId)) : false

  // ── Active display lists (search results or normal messages) ─────────────

  const displayMessages = showMsgSearch && msgSearchQuery.trim() ? msgSearchResults : messages
  const displaySpaceMessages = showMsgSearch && msgSearchQuery.trim() ? msgSearchResults : spaceMessages

  // ==================== RENDER ====================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-h-screen" onClick={() => { setContextMenuMsgId(null); setReactionPickerMsgId(null) }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <Card className="lg:col-span-1 flex flex-col rounded">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle className="text-base">Messages</CardTitle>
            </div>

            <Dialog open={isSelectModalOpen} onOpenChange={setIsSelectModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetModalState(); setIsSelectModalOpen(true) }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {modalStep === "user" ? (isStudent ? "Start New Conversation" : "Message a Student") : "Select Course"}
                  </DialogTitle>
                  <DialogDescription>
                    {modalStep === "user"
                      ? isStudent ? "Select an instructor to start messaging" : "Select a student to message"
                      : `Select a course to message ${selectedUserForModal?.firstName} about`}
                  </DialogDescription>
                </DialogHeader>

                {modalStep === "user" && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={isStudent ? "Search instructors..." : "Search students..."} value={modalSearchTerm} onChange={e => setModalSearchTerm(e.target.value)} className="pl-10 h-9" />
                    </div>
                    {isFetchingStudents && !isStudent ? (
                      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /><p className="text-muted-foreground">Loading...</p></div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-3">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{isStudent ? "No instructors found" : "No students found"}</p>
                          </div>
                        ) : filteredUsers.map(u => (
                          <button key={u.id} onClick={() => handleSelectUser(u)} className="w-full text-left p-4 rounded border border-border hover:bg-muted transition-all">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={u.avatar || u.profilePicUrl} />
                                  <AvatarFallback className="bg-primary/10 text-primary">{u.firstName.charAt(0)}{u.lastName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {isOnline(u.id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-sm">{u.firstName} {u.lastName}</p>
                                    {u.email && <p className="text-xs text-muted-foreground mt-1">{u.email}</p>}
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {isStudent ? `${(u as Instructor).courses.length} course(s)` : `${(u as Student).courses.length} course(s)`}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {modalStep === "course" && selectedUserForModal && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedUserForModal.avatar || selectedUserForModal.profilePicUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{selectedUserForModal.firstName.charAt(0)}{selectedUserForModal.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{selectedUserForModal.firstName} {selectedUserForModal.lastName}</p>
                          <p className="text-sm text-muted-foreground">Select a course</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {userCourses.map(course => (
                        <button key={course.id} onClick={() => handleSelectCourse(course.id, course.title)} className="w-full text-left p-4 rounded border border-border hover:bg-muted transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{course.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">Course with {selectedUserForModal.firstName}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {modalStep === "course" && (
                  <div className="pt-4 border-t mt-4">
                    <Button variant="outline" onClick={() => { setModalStep("user"); setSelectedUserForModal(null) }} className="w-full">
                      ← Back to {isStudent ? "instructors" : "students"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            {isStudent ? `${uniqueInstructors.length} instructor(s)` : `${availableStudents.length} student(s)`}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-9" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : allConversations.length === 0 && spaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-2">Click + to start a conversation</p>
              </div>
            ) : (
              <>
                {allConversations
                  .filter(c => {
                    const name = getUserDisplayName(c).toLowerCase()
                    const ct = (c.course?.title || c.courseTitle || "").toLowerCase()
                    const s = searchTerm.toLowerCase()
                    return name.includes(s) || ct.includes(s)
                  })
                  .map(conv => {
                    const isActive = currentType === "conversation" &&
                      selectedUser?.id === (conv.otherUser?.id || (isStudent ? conv.instructor?.id : conv.student?.id)) &&
                      selectedCourseId === conv.courseId
                    const otherId = conv.otherUser?.id || (isStudent ? conv.instructor?.id : conv.student?.id)
                    return (
                      <button key={conv.id} onClick={() => handleConversationSelect(conv)}
                        className={`w-full text-left p-3 rounded transition-all ${isActive ? "bg-muted" : "hover:bg-muted"}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getUserAvatar(conv)} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{getUserInitials(conv)}</AvatarFallback>
                            </Avatar>
                            {isOnline(otherId) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{getUserDisplayName(conv)}</p>
                              {!conv.isTemporary && conv.unreadCount && conv.unreadCount > 0 && (
                                <Badge variant="destructive" className="flex-shrink-0 text-xs">{conv.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-xs opacity-70 truncate mt-0.5">{conv.course?.title || conv.courseTitle}</p>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">{conv.lastMessage.content}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}

                {spaces
                  .filter(s => {
                    const n = (s.title || s.name || "").toLowerCase()
                    const ct = (s.courseTitle || "").toLowerCase()
                    const sq = searchTerm.toLowerCase()
                    return n.includes(sq) || ct.includes(sq)
                  })
                  .map(space => {
                    const isActive = currentType === "space" && selectedSpace?.id === space.id
                    return (
                      <button key={`space-${space.id}`} onClick={() => handleSpaceSelect(space)}
                        className={`w-full text-left p-3 rounded transition-all ${isActive ? "bg-muted" : "hover:bg-muted"}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-8 w-8 flex-shrink-0 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{space.title || space.name || "Space"}</p>
                              {space.unreadCount && space.unreadCount > 0 && (
                                <Badge variant="destructive" className="flex-shrink-0 text-xs">{space.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-xs opacity-70 truncate mt-0.5">{space.courseTitle || "Course Space"}</p>
                            {space.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">{space.lastMessage.content}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main chat area ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col rounded">

          {/* ── Private conversation ──────────────────────────────────────── */}
          {currentType === "conversation" && selectedUser && selectedCourseId && selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={selectedUser.avatar || selectedUser.profilePicUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(selectedUser.firstName || "").charAt(0)}{(selectedUser.lastName || "").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline(selectedUser.id) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm">
                        {selectedUser.firstName} {selectedUser.lastName}
                        {isOnline(selectedUser.id) && <span className="text-xs text-green-500 font-normal ml-2">Online</span>}
                      </CardTitle>
                      <CardDescription className="text-xs">{selectedConversation.course?.title || selectedConversation.courseTitle}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentConversation?.isTemporary && (
                      <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>
                    )}
                    {/* Enhancement #5: Search toggle */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowMsgSearch(!showMsgSearch); setMsgSearchQuery("") }}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Enhancement #5: Search bar */}
                {showMsgSearch && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search messages..."
                        value={msgSearchQuery}
                        onChange={e => setMsgSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm"
                        autoFocus
                      />
                    </div>
                    {isSearchingMsgs && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowMsgSearch(false); setMsgSearchQuery("") }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 p-0">
                <div ref={messagesContainerRef} className="h-[400px] min-h-[400px] max-h-[400px] overflow-y-auto space-y-4 p-4">
                  {/* Top sentinel for infinite scroll */}
                  <div ref={topSentinelRef} />
                  {isFetchingOlder && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {displayMessages.length === 0 && !isFetchingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground text-sm text-center">
                        {showMsgSearch && msgSearchQuery ? "No messages match your search." : currentConversation?.isTemporary ? "Send your first message to begin." : "No messages yet."}
                      </p>
                    </div>
                  ) : isFetchingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm">Loading messages...</p>
                    </div>
                  ) : (
                    <>
                      {displayMessages.map(message => {
                        const isCurrentUser = message.senderId === user?.id
                        const senderName = getMessageSenderName(message, user?.id)
                        const senderAvatar = getMessageSenderAvatar(message)
                        const isEditing = editingMessageId === message.id
                        const showContext = contextMenuMsgId === message.id
                        const showReactionPicker = reactionPickerMsgId === message.id

                        return (
                          <div key={message.id}
                            className={`group flex ${isCurrentUser ? "justify-end" : "justify-start"} relative`}
                            onClick={e => e.stopPropagation()}>
                            {!isCurrentUser && (
                              <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                                <AvatarImage src={senderAvatar} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">{senderName.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                            )}

                            <div className="max-w-md relative">
                              {/* Message bubble */}
                              <div className={`px-4 py-2 rounded-lg ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                                {!isCurrentUser && <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>}

                                {isEditing ? (
                                  <div className="flex gap-2 items-end">
                                    <Textarea
                                      value={editContent}
                                      onChange={e => setEditContent(e.target.value)}
                                      className="min-h-[40px] max-h-[120px] resize-none text-sm bg-background text-foreground"
                                      autoFocus
                                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(message.id) } if (e.key === "Escape") { setEditingMessageId(null); setEditContent("") } }}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button size="sm" className="h-7 px-2" onClick={() => handleEditMessage(message.id)}>Save</Button>
                                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingMessageId(null); setEditContent("") }}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Enhancement #6: Attachment preview */}
                                    {message.attachmentUrl && (
                                      <div className="mb-2">
                                        {message.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                          <img src={message.attachmentUrl} alt="attachment" className="max-w-[200px] rounded cursor-pointer" onClick={() => window.open(message.attachmentUrl, "_blank")} />
                                        ) : (
                                          <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline opacity-80">
                                            <Paperclip className="w-3 h-3" /> Attachment
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    <p className="break-words text-sm">{message.content}</p>
                                    {(message as any).isEdited && <span className="text-xs opacity-50 ml-1">(edited)</span>}
                                  </>
                                )}

                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <p className={`text-xs ${isCurrentUser ? "opacity-70" : "opacity-50"}`}>
                                    {formatMessageTime(typeof message.createdAt === "string" ? message.createdAt : message.createdAt?.toISOString?.() || "")}
                                  </p>
                                  {/* Enhancement #1: Checkmarks */}
                                  {isCurrentUser && !isEditing && <StatusIcon message={message} />}
                                </div>
                              </div>

                              {/* Enhancement #7: Reactions display */}
                              {(message as any).reactions && Object.keys((message as any).reactions).length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                                  {Object.entries((message as any).reactions as Record<string, string[]>).map(([emoji, users]) =>
                                    users.length > 0 && (
                                      <button key={emoji} onClick={() => handleReaction(message.id, emoji)}
                                        className={`text-xs px-1.5 py-0.5 rounded-full border ${users.includes(String(user?.id)) ? "bg-primary/10 border-primary/30" : "bg-background border-border"}`}>
                                        {emoji} {users.length}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Enhancement #7+9: Hover action buttons */}
                              {!isEditing && (
                                <div className={`absolute top-0 ${isCurrentUser ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} hidden group-hover:flex items-center gap-0.5`}>
                                  {/* Reaction picker button */}
                                  <button onClick={e => { e.stopPropagation(); setReactionPickerMsgId(showReactionPicker ? null : message.id); setContextMenuMsgId(null) }}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground">
                                    <SmilePlus className="w-3.5 h-3.5" />
                                  </button>
                                  {isCurrentUser && (
                                    <>
                                      <button onClick={() => { setEditingMessageId(message.id); setEditContent(message.content); setContextMenuMsgId(null) }}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteMessage(message.id)}
                                        className="p-1 rounded hover:bg-destructive/10 text-destructive">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Enhancement #7: Reaction picker */}
                              {showReactionPicker && (
                                <div className={`absolute z-10 top-full mt-1 ${isCurrentUser ? "right-0" : "left-0"} flex gap-1 p-1.5 bg-background border border-border rounded-full shadow-lg`}
                                  onClick={e => e.stopPropagation()}>
                                  {QUICK_EMOJIS.map(emoji => (
                                    <button key={emoji} onClick={() => handleReaction(message.id, emoji)}
                                      className="text-lg hover:scale-125 transition-transform px-0.5">
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Enhancement #2: Typing indicator */}
                      {isPartnerTyping && (
                        <div className="flex items-center gap-2 px-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedUser.avatar || selectedUser.profilePicUrl} />
                            <AvatarFallback className="text-xs">{(selectedUser.firstName || "").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground flex items-center gap-1">
                            <span className="inline-flex gap-0.5">
                              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                            <span>typing</span>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Enhancement #6: Attachment preview area */}
                {attachmentFile && (
                  <div className="px-3 pb-2 flex items-center gap-2 border-t pt-2">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="preview" className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground flex-1 truncate">{attachmentFile.name}</span>
                    <button onClick={clearAttachment} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    {/* Enhancement #6: Attachment button */}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
                    <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 self-end" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Textarea
                      placeholder={`Type your message to ${selectedUser.firstName}...`}
                      value={messageText}
                      onChange={handleTypingChange}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isSubmitting) { e.preventDefault(); handleSendPrivateMessage() } }}
                      className="min-h-[60px] max-h-[120px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button onClick={handleSendPrivateMessage} disabled={isSubmitting || (!messageText.trim() && !attachmentFile)} className="flex-shrink-0 self-end rounded">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Enter to send • Shift+Enter for new line</p>
                </div>
              </CardContent>
            </>

          ) : currentType === "space" && selectedSpace ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      {selectedSpace.title || selectedSpace.name || "Space"}
                    </CardTitle>
                    <CardDescription>{selectedSpace.courseTitle || "Course Space"} • Course Space</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowMsgSearch(!showMsgSearch); setMsgSearchQuery("") }}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {showMsgSearch && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search space messages..." value={msgSearchQuery} onChange={e => setMsgSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" autoFocus />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowMsgSearch(false); setMsgSearchQuery("") }}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 p-0">
                <div ref={messagesContainerRef} className="h-[400px] min-h-[400px] max-h-[400px] overflow-y-auto space-y-4 p-4">
                  <div ref={topSentinelRef} />
                  {isFetchingOlder && (
                    <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  )}

                  {isFetchingMessages && displaySpaceMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <p className="text-muted-foreground">Loading space messages...</p>
                    </div>
                  ) : displaySpaceMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-sm">
                        {showMsgSearch && msgSearchQuery ? "No messages match your search." : "No messages yet. Be the first!"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {displaySpaceMessages.map(msg => {
                        const isCurrentUser = msg.senderId === user?.id
                        const senderName = getMessageSenderName(msg, user?.id)
                        const senderAvatar = getMessageSenderAvatar(msg)
                        const isEditing = editingMessageId === msg.id

                        return (
                          <div key={msg.id} className="group space-y-1">
                            {!isCurrentUser && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={senderAvatar} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{senderName.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-xs">{senderName}</span>
                              </div>
                            )}
                            <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} relative`}>
                              <div className={`max-w-xs ${isCurrentUser ? "bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3" : "bg-muted rounded-lg rounded-tl-none p-3 ml-8"}`}>
                                {isEditing ? (
                                  <div className="flex gap-2 items-end">
                                    <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[40px] resize-none text-sm bg-background text-foreground" autoFocus
                                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSpaceMessage(msg.id) } if (e.key === "Escape") { setEditingMessageId(null); setEditContent("") } }} />
                                    <div className="flex flex-col gap-1">
                                      <Button size="sm" className="h-7 px-2" onClick={() => handleEditSpaceMessage(msg.id)}>Save</Button>
                                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingMessageId(null); setEditContent("") }}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="break-words text-sm">{msg.content}</p>
                                    {(msg as any).isEdited && <span className="text-xs opacity-50 ml-1">(edited)</span>}
                                  </>
                                )}
                                <p className={`text-xs mt-1 ${isCurrentUser ? "opacity-70" : "opacity-50"}`}>{formatMessageTime(msg.createdAt)}</p>
                              </div>

                              {/* Edit / Delete for own messages */}
                              {isCurrentUser && !isEditing && (
                                <div className={`absolute top-0 left-0 -translate-x-full pr-1 hidden group-hover:flex items-center gap-0.5`}>
                                  <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content) }} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteSpaceMessage(msg.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Share with the class..."
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isSubmitting) { e.preventDefault(); handleSendSpaceMessage() } }}
                      className="min-h-[60px] max-h-[120px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button onClick={handleSendSpaceMessage} disabled={isSubmitting || !messageText.trim()} className="flex-shrink-0 self-end rounded">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Enter to send • Shift+Enter for new line</p>
                </div>
              </CardContent>
            </>

          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] gap-4">
              <MessageCircle className="w-16 h-16 text-muted-foreground opacity-20" />
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select a Message</h3>
                <p className="text-muted-foreground max-w-md">Choose a conversation or space from the sidebar to start messaging.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
