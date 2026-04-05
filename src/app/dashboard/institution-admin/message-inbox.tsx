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
import { Send, MessageSquare, Search, User, BookOpen, ChevronRight, Plus, MessageCircle, Clock, Users, Zap, Loader2 } from "lucide-react"
import { PrivateMessage, CourseSpaceMessage } from "@/types"
import { getSocket, emitSpaceTypingStart, emitSpaceTypingStop } from "@/lib/socket"
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
  courses: Array<{
    id: string | number
    title: string
  }>
}

interface Student extends UserInfo {
  courses: Array<{
    id: string | number
    title: string
    level?: string
  }>
}

interface Course {
  id: string | number
  title: string
  level?: string
  instructor?: UserInfo
  course_instructors?: Array<{
    instructor: UserInfo
    is_primary_instructor?: boolean
  }>
}

interface Conversation {
  id: string
  otherUser?: UserInfo
  instructor?: Instructor
  student?: Student
  courseId: string | number
  courseTitle: string
  course?: {
    title: string
  }
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

// ==================== HELPER FUNCTIONS ====================

const formatMessageTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid date"
    return format(date, "h:mm a")
  } catch (error) {
    return "Invalid date"
  }
}

// ==================== MAIN COMPONENT ====================

export function MessageInbox({ enrolledCourses = [], isStudent = true }: MessageInboxProps) {
  const { user, token } = useAuth()

  // State
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

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const spaceTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ==================== SOCKET SETUP ====================

  const [spaceTypingUsers, setSpaceTypingUsers] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const socket = getSocket()

    // Listen for private messages
    const handleNewMessage = (message: PrivateMessage) => {
      if (message.conversationId === selectedConversation?.id) {
        setMessages((prevMessages) => [...prevMessages, message])
      }
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === message.conversationId
            ? { ...conv, lastMessage: message }
            : conv
        )
      )
    }

    // Listen for space messages
    const handleNewSpaceMessage = (message: CourseSpaceMessage) => {
      if (message.spaceId === selectedSpace?.courseSpaceId || message.spaceId === selectedSpace?.id) {
        setSpaceMessages((prevMessages) => [...prevMessages, message])
      }
      setSpaces(prevSpaces =>
        prevSpaces.map(space =>
          (space.courseSpaceId === message.spaceId || space.id === message.spaceId)
            ? { ...space, lastMessage: message }
            : space
        )
      )
    }

    // Conversation updated (reorder by last message)
    const handleConversationUpdated = ({ conversationId, lastMessage, updatedAt }: any) => {
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === conversationId ? { ...conv, lastMessage, updatedAt } : conv
        )
        return updated.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      })
    }

    // New conversation created by other user
    const handleNewConversation = (conversation: any) => {
      setConversations(prev => {
        if (prev.some(c => c.id === conversation.id)) return prev
        return [conversation, ...prev]
      })
    }

    // Message edited in private conversation
    const handleMessageEdited = ({ messageId, content }: any) => {
      setMessages(prev => prev.map(msg =>
        (msg.id === messageId) ? { ...msg, content, isEdited: true } : msg
      ))
    }

    // Message deleted in private conversation
    const handleMessageDeleted = ({ messageId }: any) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    }

    // Space message edited
    const handleSpaceMsgEdited = ({ messageId, content }: any) => {
      setSpaceMessages(prev => prev.map(msg =>
        (msg.id === messageId) ? { ...msg, content, isEdited: true } : msg
      ))
    }

    // Space message deleted
    const handleSpaceMsgDeleted = ({ messageId }: any) => {
      setSpaceMessages(prev => prev.filter(msg => msg.id !== messageId))
    }

    // Space settings updated (name change)
    const handleSpaceSettingsUpdated = ({ spaceId, name }: any) => {
      setSpaces(prev => prev.map(space =>
        (space.courseSpaceId === spaceId || space.id === spaceId)
          ? { ...space, title: name, name }
          : space
      ))
    }

    // Space typing indicators
    const handleSpaceTypingStart = ({ spaceId, senderId }: any) => {
      if (senderId === String(user?.id)) return
      setSpaceTypingUsers(prev => ({
        ...prev,
        [spaceId]: [...new Set([...(prev[spaceId] || []), senderId])]
      }))
    }

    const handleSpaceTypingStop = ({ spaceId, senderId }: any) => {
      setSpaceTypingUsers(prev => ({
        ...prev,
        [spaceId]: (prev[spaceId] || []).filter((id: string) => id !== senderId)
      }))
    }

    socket.on("new-message", handleNewMessage)
    socket.on("new-space-message", handleNewSpaceMessage)
    socket.on("conversation-updated", handleConversationUpdated)
    socket.on("new-conversation", handleNewConversation)
    socket.on("message-edited", handleMessageEdited)
    socket.on("message-deleted", handleMessageDeleted)
    socket.on("space-message-edited", handleSpaceMsgEdited)
    socket.on("space-message-deleted", handleSpaceMsgDeleted)
    socket.on("space-settings-updated", handleSpaceSettingsUpdated)
    socket.on("space-typing-start", handleSpaceTypingStart)
    socket.on("space-typing-stop", handleSpaceTypingStop)

    return () => {
      socket.off("new-message", handleNewMessage)
      socket.off("new-space-message", handleNewSpaceMessage)
      socket.off("conversation-updated", handleConversationUpdated)
      socket.off("new-conversation", handleNewConversation)
      socket.off("message-edited", handleMessageEdited)
      socket.off("message-deleted", handleMessageDeleted)
      socket.off("space-message-edited", handleSpaceMsgEdited)
      socket.off("space-message-deleted", handleSpaceMsgDeleted)
      socket.off("space-settings-updated", handleSpaceSettingsUpdated)
      socket.off("space-typing-start", handleSpaceTypingStart)
      socket.off("space-typing-stop", handleSpaceTypingStop)
    }
  }, [selectedConversation?.id, selectedSpace?.courseSpaceId, selectedSpace?.id, user?.id])

  // ==================== SCROLLING ====================

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0 || spaceMessages.length > 0) {
      scrollToBottom()
    }
  }, [messages, spaceMessages, scrollToBottom])

  useEffect(() => {
    if (!isFetchingMessages && (messages.length > 0 || spaceMessages.length > 0)) {
      scrollToBottom()
    }
  }, [isFetchingMessages, messages.length, spaceMessages.length, scrollToBottom])

  // ==================== FETCH CONVERSATIONS ====================

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) {
        setIsLoadingConversations(false)
        return
      }
      
      setIsLoadingConversations(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await res.json()
        setConversations(data.conversations || data.sanitized || [])
      } catch (error) {
      } finally {
        setIsLoadingConversations(false)
      }
    }

    fetchConversations()
  }, [token])
useEffect(() => {
  const fetchSpaces = async () => {
    if (!token || !user?.id) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/user/${user.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    } catch (error) {
      // Don't show error to user, just set empty spaces
      setSpaces([])
    }
  }

  fetchSpaces()
}, [token, user?.id])
  useEffect(() => {
    const fetchStudents = async () => {
      if (!isStudent && user?.id && token) {
        setIsFetchingStudents(true)
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instructor/${user.id}/students`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
          const data = await res.json()
          
          if (data.success && data.students) {
            const students: Student[] = data.students.map((apiStudent: any) => ({
              id: apiStudent.student?.id || apiStudent.id,
              firstName: apiStudent.student?.firstName || apiStudent.firstName || '',
              lastName: apiStudent.student?.lastName || apiStudent.lastName || '',
              email: apiStudent.student?.email || apiStudent.email,
              avatar: apiStudent.student?.profilePicUrl || apiStudent.profilePicUrl,
              role: apiStudent.student?.role || apiStudent.role,
              profilePicUrl: apiStudent.student?.profilePicUrl || apiStudent.profilePicUrl,
              courses: apiStudent.courses?.map((course: any) => ({
                id: course.id,
                title: course.title,
                level: course.level
              })) || []
            }))
            setAvailableStudents(students)
          }
        } catch (error) {
        } finally {
          setIsFetchingStudents(false)
        }
      }
    }

    fetchStudents()
  }, [isStudent, user?.id, token])

  // ==================== EXTRACT UNIQUE INSTRUCTORS (FOR STUDENTS) ====================
  // FIX: Include both primary instructor and additional course instructors

  const uniqueInstructors = useMemo(() => {
    if (isStudent && enrolledCourses && enrolledCourses.length > 0) {
      const instructorsMap = new Map<string, Instructor>()
      
      enrolledCourses.forEach(course => {
        // Add primary instructor
        const primaryInstructor = course.instructor
        
        if (primaryInstructor && primaryInstructor.id) {
          const instructorId = String(primaryInstructor.id)
          if (!instructorsMap.has(instructorId)) {
            instructorsMap.set(instructorId, {
              id: instructorId,
              firstName: primaryInstructor.firstName || 'Instructor',
              lastName: primaryInstructor.lastName || '',
              email: primaryInstructor.email,
              avatar: primaryInstructor.avatar || primaryInstructor.profilePicUrl,
              profilePicUrl: primaryInstructor.profilePicUrl || primaryInstructor.avatar,
              courses: []
            })
          }
          
          // Add course to instructor's course list
          const existingInstructor = instructorsMap.get(instructorId)!
          if (!existingInstructor.courses.some(c => String(c.id) === String(course.id))) {
            existingInstructor.courses.push({
              id: course.id,
              title: course.title
            })
          }
        }
        
        // Add additional instructors from course_instructors
        if (course.course_instructors && Array.isArray(course.course_instructors)) {
          course.course_instructors.forEach((ci: any) => {
            const instructor = ci.instructor
            if (instructor && instructor.id) {
              const instructorId = String(instructor.id)
              if (!instructorsMap.has(instructorId)) {
                instructorsMap.set(instructorId, {
                  id: instructorId,
                  firstName: instructor.firstName || instructor.first_name || 'Instructor',
                  lastName: instructor.lastName || instructor.last_name || '',
                  email: instructor.email,
                  avatar: instructor.avatar || instructor.profile_picture_url,
                  profilePicUrl: instructor.profile_picture_url || instructor.avatar,
                  courses: []
                })
              }
              
              // Add course to instructor's course list
              const existingInstructor = instructorsMap.get(instructorId)!
              if (!existingInstructor.courses.some(c => String(c.id) === String(course.id))) {
                existingInstructor.courses.push({
                  id: course.id,
                  title: course.title
                })
              }
            }
          })
        }
      })
      
      return Array.from(instructorsMap.values())
    }
    return []
  }, [enrolledCourses, isStudent])

  // ==================== FILTER USERS FOR MODAL ====================

  const filteredUsers = useMemo(() => {
    if (!modalSearchTerm.trim()) {
      return isStudent ? uniqueInstructors : availableStudents
    }
    
    const searchLower = modalSearchTerm.toLowerCase()
    
    if (isStudent) {
      return uniqueInstructors.filter(instructor => 
        `${instructor.firstName} ${instructor.lastName}`.toLowerCase().includes(searchLower) ||
        instructor.email?.toLowerCase().includes(searchLower) ||
        instructor.courses.some(course => 
          course.title.toLowerCase().includes(searchLower)
        )
      )
    } else {
      return availableStudents.filter(student => 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.courses.some(course => 
          course.title.toLowerCase().includes(searchLower)
        )
      )
    }
  }, [isStudent, uniqueInstructors, availableStudents, modalSearchTerm])

  // ==================== GET USER COURSES ====================

  const userCourses = useMemo(() => {
    if (!selectedUserForModal) return []
    
    if (isStudent) {
      return (selectedUserForModal as Instructor).courses || []
    } else {
      return (selectedUserForModal as Student).courses || []
    }
  }, [selectedUserForModal, isStudent])

  // ==================== COMBINE CONVERSATIONS WITH UNIQUE KEYS ====================

  const allConversations = useMemo(() => {
    // Create a Map to ensure unique IDs
    const conversationMap = new Map<string, Conversation>()
    
    // Add real conversations first
    conversations.forEach(conv => {
      conversationMap.set(conv.id, conv)
    })
    
    // Add temporary conversations with unique keys (use prefix to avoid collisions)
    temporaryConversations.forEach(tempConv => {
      const tempKey = `temp-${tempConv.id}`
      conversationMap.set(tempKey, {
        ...tempConv,
        id: tempKey,
        originalId: tempConv.id,
        otherUser: isStudent ? tempConv.instructor : tempConv.student,
        courseTitle: tempConv.courseTitle,
      })
    })
    
    return Array.from(conversationMap.values())
  }, [conversations, temporaryConversations, isStudent])

  // ==================== GET CURRENT CONVERSATION ====================

  const currentConversation = useMemo(() => {
    if (!selectedUser || !selectedCourseId) return null
    
    // First check real conversations
    const realConversation = conversations.find(conv => {
      const otherUser = conv.otherUser || (isStudent ? conv.instructor : conv.student)
      return otherUser?.id === selectedUser.id && conv.courseId === selectedCourseId
    })
    
    if (realConversation) return realConversation
    
    // Then check temporary conversations
    const tempConversation = temporaryConversations.find(tempConv => {
      const otherUser = isStudent ? tempConv.instructor : tempConv.student
      return otherUser?.id === selectedUser.id && tempConv.courseId === selectedCourseId
    })
    
    if (tempConversation) {
      return {
        ...tempConversation,
        id: `temp-${tempConversation.id}`,
        originalId: tempConversation.id,
        isTemporary: true,
        otherUser: isStudent ? tempConversation.instructor : tempConversation.student,
      }
    }
    
    return null
  }, [selectedUser, selectedCourseId, conversations, temporaryConversations, isStudent])

  // ==================== FETCH MESSAGES ====================

  const fetchMessages = useCallback(async (conversationId: string, loading = true) => {
    if (!conversationId || !token) return
    
    if (loading) {
      setIsFetchingMessages(true)
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${conversationId}/convo`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        const messagesData = data.data || []
        setMessages(messagesData)
        
        // Update the conversation with new messages
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: messagesData,
          lastMessage: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
        } : prev)
        
        // Also update the conversations list
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? {
                ...conv,
                messages: messagesData,
                lastMessage: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
              }
            : conv
        ))
      }
    } catch (error) {
    } finally {
      setIsFetchingMessages(false)
    }
  }, [token])

  // ==================== FETCH SPACE MESSAGES ====================

  const fetchSpaceMessages = useCallback(async (spaceId: string, loading = true) => {
    if (!spaceId || !token) return
    
    if (loading) {
      setIsFetchingMessages(true)
    }
    
    try {
      // Use the new paginated endpoint
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/${spaceId}/messages`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        const messagesData = data.data || []
        setSpaceMessages(messagesData)
        
        // Update the space with new messages
        setSelectedSpace(prev => prev ? {
          ...prev,
          messages: messagesData,
          lastMessage: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
        } : prev)
        
        // Also update the spaces list
        setSpaces(prev => prev.map(space =>
          (space.courseSpaceId === spaceId || space.id === spaceId)
            ? {
                ...space,
                messages: messagesData,
                lastMessage: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
              }
            : space
        ))
      }
    } catch (error) {
    } finally {
      setIsFetchingMessages(false)
    }
  }, [token])

  // ==================== FETCH MESSAGES WHEN CONVERSATION SELECTED ====================

  useEffect(() => {
    if (selectedConversation?.id && !selectedConversation?.isTemporary) {
      const originalId = (selectedConversation as any).originalId || selectedConversation.id
      fetchMessages(originalId)
    }
  }, [selectedConversation?.id, token, fetchMessages])

  // ==================== FETCH SPACE MESSAGES WHEN SPACE SELECTED ====================

  useEffect(() => {
    if (selectedSpace?.courseSpaceId || selectedSpace?.id) {
      const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
      if (spaceId) {
        fetchSpaceMessages(spaceId)
      }
    }
  }, [selectedSpace?.courseSpaceId, selectedSpace?.id, fetchSpaceMessages])

  // ==================== HANDLE SEND PRIVATE MESSAGE ====================

  const handleSendPrivateMessage = async () => {
    if (!messageText.trim() || !selectedUser || !selectedCourseId || !token || !user) return

    setIsSubmitting(true)
    try {
      let conversationId = selectedConversation?.id
      let isNewConversation = false
      
      // If this is a temporary conversation, create it first
      if (currentConversation?.isTemporary) {
        isNewConversation = true
        
        // Create the conversation in the database
        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId: selectedCourseId,
            instructorId: isStudent ? selectedUser.id : user.id,
            studentId: isStudent ? user.id : selectedUser.id,
          }),
        })
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.message || "Failed to create conversation")
        }

        const data = await createResponse.json()
        conversationId = data.conversation?.id || data.id
        
        if (!conversationId) {
          throw new Error("No conversation ID returned")
        }
        
        // Remove from temporary conversations
        setTemporaryConversations(prev => 
          prev.filter(tempConv => {
            const otherUser = isStudent ? tempConv.instructor : tempConv.student
            return !(otherUser?.id === selectedUser.id && tempConv.courseId === selectedCourseId)
          })
        )
        
        // Add the new conversation to the list
        const newConversation = {
          id: conversationId,
          otherUser: selectedUser,
          instructor: isStudent ? (selectedUser as Instructor) : undefined,
          student: isStudent ? undefined : (selectedUser as Student),
          courseId: selectedCourseId,
          courseTitle: selectedConversation?.courseTitle || "",
          lastMessage: null,
          unreadCount: 0,
          messages: []
        }
        
        setConversations(prev => [...prev, newConversation])
        setSelectedConversation(newConversation)
      }
      
      // Send the message
      const actualConversationId = conversationId?.replace('temp-', '') || conversationId
      
      const messageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: actualConversationId,
          content: messageText,
        }),
      })

      if (!messageRes.ok) {
        throw new Error("Failed to send message")
      }
      
      const sentMessage = await messageRes.json()
      setMessageText("")
      
      // Add message to local state immediately
      const newMessage = sentMessage.data || sentMessage
      if (newMessage) {
        setMessages(prev => [...prev, newMessage])
      }
      
      // Refresh the conversations list if it was a new conversation
      if (isNewConversation) {
        const conversationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (conversationsRes.ok) {
          const data = await conversationsRes.json()
          setConversations(data.conversations || data.sanitized || [])
        }
      }
      
    } catch (error: any) {
      alert(error.message || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==================== HANDLE SEND SPACE MESSAGE ====================

  const handleSendSpaceMessage = async () => {
    if (!messageText.trim() || !selectedSpace || !token || !user) return

    setIsSubmitting(true)
    try {
      const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
      
      const messageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spaceId: spaceId,
          content: messageText,
        }),
      })

      if (!messageRes.ok) {
        throw new Error("Failed to send message")
      }
      
      const sentMessage = await messageRes.json()
      setMessageText("")
      
      // Add message to local state immediately
      const newMessage = sentMessage.data || sentMessage
      if (newMessage) {
        setSpaceMessages(prev => [...prev, newMessage])
      }
      
    } catch (error: any) {
      alert(error.message || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==================== HANDLE CONVERSATION SELECT ====================

  const handleConversationSelect = useCallback(async (conversation: Conversation) => {
    setMessageText("")
    setMessages([])
    setCurrentType("conversation")
    setSelectedSpace(null)
    
    // Set the selected user based on the other participant
    const otherUser = conversation.otherUser || (isStudent ? conversation.instructor : conversation.student)
    if (otherUser) {
      setSelectedUser(otherUser)
    }
    
    setSelectedCourseId(conversation.courseId)
    setSelectedConversation(conversation)
    
    // If this is not a temporary conversation, fetch its messages
    if (!conversation.isTemporary) {
      const originalId = (conversation as any).originalId || conversation.id
      await fetchMessages(originalId)
    }
  }, [isStudent, fetchMessages])

  // ==================== HANDLE SPACE SELECT ====================

  const handleSpaceSelect = useCallback(async (space: Space) => {
    setMessageText("")
    setSpaceMessages([])
    setCurrentType("space")
    setSelectedSpace(space)
    setSelectedUser(null)
    setSelectedCourseId(null)
    setSelectedConversation(null)
    
    const spaceId = space.courseSpaceId || space.id
    await fetchSpaceMessages(spaceId)
  }, [fetchSpaceMessages])

  // ==================== HANDLE USER SELECTION ====================

  const handleSelectUser = (user: UserInfo) => {
    setSelectedUserForModal(user)
    
    // Get courses based on user type
    const userCourses = isStudent 
      ? (user as Instructor).courses 
      : (user as Student).courses
    
    // If user has only one course, auto-select it and create conversation
    if (userCourses.length === 1) {
      createTemporaryConversation(user, userCourses[0].id, userCourses[0].title)
      setIsSelectModalOpen(false)
      resetModalState()
    } else {
      // Move to course selection step
      setModalStep("course")
    }
  }

  // ==================== HANDLE COURSE SELECTION ====================

  const handleSelectCourse = (courseId: string | number, courseTitle: string) => {
    if (!selectedUserForModal) return
    
    createTemporaryConversation(selectedUserForModal, courseId, courseTitle)
    setIsSelectModalOpen(false)
    resetModalState()
  }

  // ==================== CREATE TEMPORARY CONVERSATION ====================

  const createTemporaryConversation = (user: UserInfo, courseId: string | number, courseTitle: string) => {
    const tempConvId = `temp-${user.id}-${courseId}-${Date.now()}`
    
    const newTempConversation: TemporaryConversation = {
      id: tempConvId,
      instructor: isStudent ? (user as Instructor) : undefined,
      student: !isStudent ? (user as Student) : undefined,
      courseId,
      courseTitle,
      isTemporary: true,
      lastMessage: null,
      unreadCount: 0
    }
    
    // Remove any existing temporary conversation for this user/course
    setTemporaryConversations(prev => 
      prev.filter(tempConv => {
        const otherUser = isStudent ? tempConv.instructor : tempConv.student
        return !(otherUser?.id === user.id && tempConv.courseId === courseId)
      })
    )
    
    // Add new temporary conversation
    setTemporaryConversations(prev => [...prev, newTempConversation])
    
    // Select this conversation
    setSelectedUser(user)
    setSelectedCourseId(courseId)
    setSelectedConversation({
      ...newTempConversation,
      id: tempConvId,
      isTemporary: true,
      otherUser: user,
      courseTitle: courseTitle,
    })
    setCurrentType("conversation")
    setSelectedSpace(null)
  }

  // ==================== RESET MODAL STATE ====================

  const resetModalState = () => {
    setModalSearchTerm("")
    setModalStep("user")
    setSelectedUserForModal(null)
  }

  // ==================== GET DISPLAY NAME ====================

  const getUserDisplayName = (conversation: Conversation) => {
    const otherUser = conversation.otherUser || (isStudent ? conversation.instructor : conversation.student)
    if (otherUser) {
      return `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'User'
    }
    return 'Unknown User'
  }

  // ==================== GET USER AVATAR ====================

  const getUserAvatar = (conversation: Conversation) => {
    const otherUser = conversation.otherUser || (isStudent ? conversation.instructor : conversation.student)
    return otherUser?.avatar || otherUser?.profilePicUrl
  }

  // ==================== GET USER INITIALS ====================

  const getUserInitials = (conversation: Conversation) => {
    const name = getUserDisplayName(conversation)
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // ==================== RENDER ====================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-h-screen">
      {/* Left Sidebar - Conversations List */}
      <Card className="lg:col-span-1 flex flex-col rounded">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle className="text-base">Messages</CardTitle>
            </div>
            
            {/* New Message Button */}
            <Dialog open={isSelectModalOpen} onOpenChange={setIsSelectModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => {
                    resetModalState()
                    setIsSelectModalOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">New message</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {modalStep === "user" 
                      ? isStudent 
                        ? "Start New Conversation" 
                        : "Message a Student"
                      : "Select Course"
                    }
                  </DialogTitle>
                  <DialogDescription>
                    {modalStep === "user" 
                      ? isStudent
                        ? "Select an instructor to start messaging"
                        : "Select a student to message"
                      : `Select a course to message ${selectedUserForModal?.firstName} about`
                    }
                  </DialogDescription>
                </DialogHeader>
                
                {/* Step 1: Select User (Instructor or Student) */}
                {modalStep === "user" && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={isStudent ? "Search instructors..." : "Search students..."}
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    
                    {isFetchingStudents && !isStudent ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <p className="text-muted-foreground">Loading students...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-3">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {isStudent ? (
                              <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            ) : (
                              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            )}
                            <p className="text-sm">
                              {isStudent ? "No instructors found" : "No students found"}
                            </p>
                          </div>
                        ) : (
                          filteredUsers.map((userItem) => (
                            <button
                              key={userItem.id}
                              onClick={() => handleSelectUser(userItem)}
                              className="w-full text-left p-4 rounded border border-border hover:bg-muted transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={userItem.avatar || userItem.profilePicUrl} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {userItem.firstName.charAt(0)}
                                    {userItem.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-sm">
                                        {userItem.firstName} {userItem.lastName}
                                      </p>
                                      {userItem.email && (
                                        <p className="text-xs text-muted-foreground mt-1">{userItem.email}</p>
                                      )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isStudent 
                                        ? `${(userItem as Instructor).courses.length} course${(userItem as Instructor).courses.length !== 1 ? 's' : ''}`
                                        : `${(userItem as Student).courses.length} course${(userItem as Student).courses.length !== 1 ? 's' : ''}`
                                      }
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Course */}
                {modalStep === "course" && selectedUserForModal && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedUserForModal.avatar || selectedUserForModal.profilePicUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {selectedUserForModal.firstName.charAt(0)}
                            {selectedUserForModal.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {selectedUserForModal.firstName} {selectedUserForModal.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">Select a course to message about</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {userCourses.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => handleSelectCourse(course.id, course.title)}
                          className="w-full text-left p-4 rounded border border-border hover:bg-muted transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{course.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Course with {selectedUserForModal.firstName}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back button for course selection step */}
                {modalStep === "course" && (
                  <div className="pt-4 border-t mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalStep("user")
                        setSelectedUserForModal(null)
                      }}
                      className="w-full"
                    >
                      ← Back to {isStudent ? 'instructors' : 'students'}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            {isStudent 
              ? `${uniqueInstructors.length} instructor${uniqueInstructors.length !== 1 ? 's' : ''}`
              : `${availableStudents.length} student${availableStudents.length !== 1 ? 's' : ''}`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 pb-3">
          {/* Search existing conversations */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Combined Conversations and Spaces List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : allConversations.length === 0 && spaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click the + icon to start a conversation
                </p>
              </div>
            ) : (
              <>
                {/* Conversations */}
                {allConversations
                  .filter((conversation) => {
                    const userName = getUserDisplayName(conversation).toLowerCase()
                    const courseTitle = conversation.course?.title?.toLowerCase() || conversation.courseTitle?.toLowerCase() || ""
                    const searchLower = searchTerm.toLowerCase()
                    
                    return userName.includes(searchLower) || courseTitle.includes(searchLower)
                  })
                  .map((conversation) => {
                    const isActive = 
                      currentType === "conversation" &&
                      selectedUser?.id === (conversation.otherUser?.id || (isStudent ? conversation.instructor?.id : conversation.student?.id)) &&
                      selectedCourseId === conversation.courseId
                    
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`w-full text-left p-3 rounded transition-all relative ${
                          isActive
                            ? "bg-muted"
                            : "hover:bg-muted border-transparent hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={getUserAvatar(conversation)} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getUserInitials(conversation)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">
                                  {getUserDisplayName(conversation)}
                                </p>
                                {!conversation.isTemporary && conversation.unreadCount && conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="flex-shrink-0 ml-2">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs opacity-70 truncate mt-1">
                                {conversation.course?.title || conversation.courseTitle}
                              </p>
                              {conversation.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate mt-2">
                                  {conversation.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                {/* Spaces */}
                {spaces
                  .filter((space) => {
                    const spaceName = (space.title || space.name || "").toLowerCase()
                    const courseTitle = (space.courseTitle || "").toLowerCase()
                    const searchLower = searchTerm.toLowerCase()
                    
                    return spaceName.includes(searchLower) || courseTitle.includes(searchLower)
                  })
                  .map((space) => {
                    const isActive = currentType === "space" && selectedSpace?.id === space.id
                    
                    return (
                      <button
                        key={`space-${space.id}`}
                        onClick={() => handleSpaceSelect(space)}
                        className={`w-full text-left p-3 rounded transition-all relative ${
                          isActive
                            ? "bg-muted"
                            : "hover:bg-muted border-transparent hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 flex-shrink-0 rounded bg-primary/15 dark:bg-primary/20/30 flex items-center justify-center">
                              <Zap className="h-4 w-4 text-primary dark:text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">
                                  {space.title || space.name || "Space"}
                                </p>
                                {space.unreadCount && space.unreadCount > 0 && (
                                  <Badge variant="destructive" className="flex-shrink-0 ml-2">
                                    {space.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs opacity-70 truncate mt-1">
                                <Zap className="h-3 w-3 text-primary dark:text-primary" />
                                <span>{space.courseTitle || "Course Space"}</span>
                              </div>
                              {space.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate mt-2">
                                  {space.lastMessage.content}
                                </p>
                              )}
                            </div>
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

      {/* Main Content Area - Message Thread */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col rounded">
          {currentType === "conversation" && selectedUser && selectedCourseId && selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {isStudent 
                        ? `Conversation with ${selectedUser.firstName} ${selectedUser.lastName}`
                        : `Conversation with student ${selectedUser.firstName} ${selectedUser.lastName}`
                      }
                    </CardTitle>
                    <CardDescription>
                      About: {selectedConversation.course?.title || selectedConversation.courseTitle}
                    </CardDescription>
                  </div>
                  {currentConversation?.isTemporary && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Draft
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 p-0">
                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="h-[400px] min-h-[400px] max-h-[400px] overflow-y-auto space-y-4 p-4"
                >
                  {messages.length === 0 && !isFetchingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground text-sm mb-4 text-center">
                        {currentConversation?.isTemporary 
                          ? "This conversation hasn't been started yet. Send your first message to begin."
                          : "No messages yet. Start the conversation!"
                        }
                      </p>
                    </div>
                  ) : isFetchingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm">
                        Loading messages...
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === user?.id
                        const senderName = message.sender 
                          ? `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() 
                          : (isCurrentUser ? 'You' : 'Unknown')
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            {!isCurrentUser && (
                              <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                                <AvatarImage src={message.sender?.profile_picture_url} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {senderName.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-md px-4 py-2 rounded-lg ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {!isCurrentUser && (
                                <p className="text-xs font-medium mb-1 opacity-70">
                                  {senderName}
                                </p>
                              )}
                              <p className="break-words text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${isCurrentUser ? "opacity-70" : "opacity-50"}`}>
                                {formatMessageTime(typeof message.createdAt === 'string' ? message.createdAt : message.createdAt?.toISOString?.() || new Date().toISOString())}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      {/* Invisible div at the bottom for auto-scrolling */}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={`Type your message to ${selectedUser.firstName}...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
                          e.preventDefault()
                          handleSendPrivateMessage()
                        }
                      }}
                      className="min-h-[60px] max-h-[40px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={handleSendPrivateMessage}
                      disabled={isSubmitting || !messageText.trim()}
                      className="flex-shrink-0 self-end rounded"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift + Enter for new line
                  </p>
                </div>
              </CardContent>
            </>
          ) : currentType === "space" && selectedSpace ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-5 w-5 text-primary dark:text-primary" />
                      {selectedSpace.title || selectedSpace.name || "Space"}
                    </CardTitle>
                    <CardDescription>
                      {selectedSpace.courseTitle || "Course Space"} • Course Space
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 p-0">
                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="h-[400px] min-h-[400px] max-h-[400px] overflow-y-auto space-y-4 p-4"
                >
                  {isFetchingMessages && spaceMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <p className="text-muted-foreground">Loading space messages...</p>
                    </div>
                  ) : spaceMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No messages in this space yet. Be the first to start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {spaceMessages.map((msg) => {
                        const isCurrentUser = msg.senderId === user?.id
                        const sender = msg.sender
                        const senderName = sender 
                          ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() 
                          : 'Unknown'
                        
                        return (
                          <div key={msg.id} className="space-y-1">
                            {!isCurrentUser && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={sender?.profile_picture_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {senderName.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-xs">
                                  {senderName}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs ${
                                isCurrentUser 
                                  ? 'bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3' 
                                  : 'bg-muted rounded-lg rounded-tl-none p-3 ml-8'
                              }`}>
                                <p className="break-words text-sm">{msg.content}</p>
                                {/* <p className={`text-xs mt-1 ${isCurrentUser ? "opacity-70" : "opacity-50"}`}>
                                  {formatMessageTime(msg.createdAt)}
                                </p> */}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Typing indicator for space */}
                {selectedSpace && (() => {
                  const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
                  const typingUsers = spaceTypingUsers[spaceId] || []
                  return typingUsers.length > 0 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground italic">
                      {typingUsers.length === 1 ? "Someone is typing..." : `${typingUsers.length} people are typing...`}
                    </div>
                  ) : null
                })()}

                {/* Space Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Share with the class..."
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value)
                        if (selectedSpace) {
                          const spaceId = selectedSpace.courseSpaceId || selectedSpace.id
                          emitSpaceTypingStart(spaceId)
                          if (spaceTypingTimeoutRef.current) clearTimeout(spaceTypingTimeoutRef.current)
                          spaceTypingTimeoutRef.current = setTimeout(() => emitSpaceTypingStop(spaceId), 2000)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
                          e.preventDefault()
                          handleSendSpaceMessage()
                        }
                      }}
                      className="min-h-[60px] max-h-[40px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={handleSendSpaceMessage}
                      disabled={isSubmitting || !messageText.trim()}
                      className="flex-shrink-0 self-end rounded"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] gap-4">
              <MessageCircle className="w-16 h-16 text-muted-foreground opacity-20" />
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select a Message</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a conversation or space from the sidebar to start messaging.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}