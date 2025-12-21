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
import { getSocket } from "@/lib/socket"
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
}

interface Conversation {
  id: string
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
}

interface Space {
  id: string
  courseSpaceId: string
  title: string
  courseId: string | number
  courseTitle: string
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

interface APIStudent {
  student: {
    id: number
    email: string
    firstName: string
    lastName: string
    role: string
    profilePicUrl: string | null
    createdAt: string
    updatedAt: string
  }
  courses: Array<{
    id: number
    title: string
    level: string
  }>
}

// ==================== HELPER FUNCTIONS ====================

const formatMessageTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid date"
    return format(date, "h:mm a")
  } catch (error) {
    console.error("Error formatting date:", error)
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

  // ==================== SOCKET SETUP ====================

  useEffect(() => {
    const socket = getSocket()

    socket.on("new-message", (message: PrivateMessage) => {
      if (message.conversationId === selectedConversation?.id) {
        setMessages((prevMessages) => [...prevMessages, message])
      }

      // Update the conversations list with the new last message
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === message.conversationId 
            ? { ...conv, lastMessage: message }
            : conv
        )
      )
    })

    return () => {
      socket.off("new-message")
    }
  }, [selectedConversation?.id])

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
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!isFetchingMessages && messages.length > 0) {
      scrollToBottom()
    }
  }, [isFetchingMessages, messages.length, scrollToBottom])

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
        setConversations(data.sanitized || [])
      } catch (error) {
        console.error("Error fetching conversations:", error)
      } finally {
        setIsLoadingConversations(false)
      }
    }

    fetchConversations()
  }, [token])

  // ==================== FETCH SPACES ====================

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
        const data = await res.json()
        setSpaces(data.spaces || [])
      } catch (error) {
        console.error("Error fetching spaces:", error)
      }
    }

    fetchSpaces()
  }, [token, user?.id])

  // ==================== FETCH STUDENTS (FOR INSTRUCTORS) ====================

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
            // Transform API response to Student format
            const students: Student[] = data.students.map((apiStudent: APIStudent) => ({
              id: apiStudent.student.id,
              firstName: apiStudent.student.firstName,
              lastName: apiStudent.student.lastName,
              email: apiStudent.student.email,
              avatar: apiStudent.student.profilePicUrl || undefined,
              role: apiStudent.student.role,
              profilePicUrl: apiStudent.student.profilePicUrl || undefined,
              courses: apiStudent.courses.map(course => ({
                id: course.id,
                title: course.title,
                level: course.level
              }))
            }))
            setAvailableStudents(students)
          }
        } catch (error) {
          console.error("Error fetching students:", error)
        } finally {
          setIsFetchingStudents(false)
        }
      }
    }

    fetchStudents()
  }, [isStudent, user?.id, token])

  // ==================== EXTRACT UNIQUE INSTRUCTORS (FOR STUDENTS) ====================

  const uniqueInstructors = useMemo(() => {
    if (isStudent && enrolledCourses && enrolledCourses.length > 0) {
      const instructorsMap = new Map<string, Instructor>()
      
      enrolledCourses.forEach(course => {
        const instructor = course.instructor
        
        if (instructor && instructor.id) {
          const instructorId = String(instructor.id)
          if (!instructorsMap.has(instructorId)) {
            instructorsMap.set(instructorId, {
              id: instructorId,
              firstName: instructor.firstName || 'Instructor',
              lastName: instructor.lastName || '',
              email: instructor.email,
              avatar: instructor.avatar || instructor.profilePicUrl,
              profilePicUrl: instructor.profilePicUrl || instructor.avatar,
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

  // ==================== ✅ FIXED: COMBINE CONVERSATIONS WITH UNIQUE KEYS ====================

  const allConversations = useMemo(() => {
    // Create a Map to ensure unique IDs
    const conversationMap = new Map<string, Conversation>()
    
    // Add real conversations first
    conversations.forEach(conv => {
      conversationMap.set(conv.id, conv)
    })
    
    // Add temporary conversations with unique keys (use prefix to avoid collisions)
    temporaryConversations.forEach(tempConv => {
      // Use a prefixed key to avoid collisions with real conversation IDs
      const tempKey = `temp-${tempConv.id}`
      conversationMap.set(tempKey, {
        ...tempConv,
        id: tempKey, // Override the ID with the prefixed version for rendering
        originalId: tempConv.id, // Store original ID for reference if needed
      })
    })
    
    return Array.from(conversationMap.values())
  }, [conversations, temporaryConversations])

  // ==================== GET CURRENT CONVERSATION ====================

  const currentConversation = useMemo(() => {
    if (!selectedUser || !selectedCourseId) return null
    
    // First check real conversations
    const realConversation = conversations.find(conv => {
      if (isStudent) {
        return conv.instructor?.id === selectedUser.id && 
               conv.courseId === selectedCourseId
      } else {
        return conv.student?.id === selectedUser.id && 
               conv.courseId === selectedCourseId
      }
    })
    
    if (realConversation) return realConversation
    
    // Then check temporary conversations
    const tempConversation = temporaryConversations.find(tempConv => {
      if (isStudent) {
        return tempConv.instructor?.id === selectedUser.id && 
               tempConv.courseId === selectedCourseId
      } else {
        return tempConv.student?.id === selectedUser.id && 
               tempConv.courseId === selectedCourseId
      }
    })
    
    if (tempConversation) {
      return {
        ...tempConversation,
        id: `temp-${tempConversation.id}`, // Use prefixed ID for consistency
        originalId: tempConversation.id,
        isTemporary: true,
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
        setMessages(data.data || [])
        
        // Update the conversation with new messages
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: data.messages || [],
          lastMessage: data.messages && data.messages.length > 0 
            ? data.messages[data.messages.length - 1] 
            : null
        } : prev)
        
        // Also update the conversations list
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? {
                ...conv,
                messages: data.messages || [],
                lastMessage: data.messages && data.messages.length > 0 
                  ? data.messages[data.messages.length - 1] 
                  : null
              }
            : conv
        ))
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/space/${spaceId}/messages`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        setSpaceMessages(data.data || data.messages || [])
        
        // Update the space with new messages
        setSelectedSpace(prev => prev ? {
          ...prev,
          messages: data.data || data.messages || [],
          lastMessage: (data.data || data.messages || []).length > 0
            ? (data.data || data.messages)[(data.data || data.messages).length - 1]
            : null
        } : prev)
        
        // Also update the spaces list
        setSpaces(prev => prev.map(space =>
          space.courseSpaceId === spaceId
            ? {
                ...space,
                messages: data.data || data.messages || [],
                lastMessage: (data.data || data.messages || []).length > 0
                  ? (data.data || data.messages)[(data.data || data.messages).length - 1]
                  : null
              }
            : space
        ))
      }
    } catch (error) {
      console.error("Error fetching space messages:", error)
    } finally {
      setIsFetchingMessages(false)
    }
  }, [token])

  // ==================== FETCH MESSAGES WHEN CONVERSATION SELECTED ====================

  useEffect(() => {
    if (selectedConversation?.id && !selectedConversation?.isTemporary) {
      // Extract original ID if it's a prefixed temporary ID
      const originalId = (selectedConversation as any).originalId || selectedConversation.id
      fetchMessages(originalId)
    }
  }, [selectedConversation?.id, token, fetchMessages])

  // ==================== HANDLE SEND MESSAGE ====================

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUser || !selectedCourseId || !token || !user) return

    setIsSubmitting(true)
    try {
      let conversationId = selectedConversation?.id
      let isNewConversation = false
      
      // If this is a temporary conversation, create it first
      if (currentConversation?.isTemporary) {
        isNewConversation = true
        
        // Use the original ID for API calls
        const originalId = (currentConversation as any).originalId || currentConversation.id
        
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
            if (isStudent) {
              return !(tempConv.instructor?.id === selectedUser.id && tempConv.courseId === selectedCourseId)
            } else {
              return !(tempConv.student?.id === selectedUser.id && tempConv.courseId === selectedCourseId)
            }
          })
        )
        
        // Add the new conversation to the list
        const newConversation = {
          id: conversationId,
          instructor: isStudent ? (selectedUser as Instructor) : undefined,
          student: isStudent ? undefined : (selectedUser as Student),
          courseId: selectedCourseId,
          courseTitle: selectedConversation?.course?.title || "",
          lastMessage: null,
          unreadCount: 0,
          messages: []
        }
        
        setConversations(prev => [...prev, newConversation])
        setSelectedConversation(newConversation)
      }
      
      // Send the message (use the actual conversation ID, not the prefixed one)
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
      
      // Refresh messages for this conversation
      if (actualConversationId) {
        await fetchMessages(actualConversationId, false)
      }
      
      // Also refresh the conversations list if it was a new conversation
      if (isNewConversation) {
        const conversationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (conversationsRes.ok) {
          const data = await conversationsRes.json()
          setConversations(data.sanitized || data.conversations || [])
        }
      }
      
    } catch (error: any) {
      console.error("Error sending message:", error)
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
    
    // Set the selected user based on role
    if (isStudent && conversation.instructor) {
      setSelectedUser(conversation.instructor)
    } else if (!isStudent && conversation.student) {
      setSelectedUser(conversation.student)
    }
    
    setSelectedCourseId(conversation.courseId)
    setSelectedConversation(conversation)
    
    // If this is not a temporary conversation, fetch its messages
    if (!conversation.isTemporary) {
      // Extract original ID if needed
      const originalId = (conversation as any).originalId || conversation.id
      await fetchMessages(originalId)
    }
  }, [isStudent, fetchMessages])

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
        if (isStudent) {
          return !(tempConv.instructor?.id === user.id && tempConv.courseId === courseId)
        } else {
          return !(tempConv.student?.id === user.id && tempConv.courseId === courseId)
        }
      })
    )
    
    // Add new temporary conversation
    setTemporaryConversations(prev => [...prev, newTempConversation])
    
    // Select this conversation
    setSelectedUser(user)
    setSelectedCourseId(courseId)
  }

  // ==================== RESET MODAL STATE ====================

  const resetModalState = () => {
    setModalSearchTerm("")
    setModalStep("user")
    setSelectedUserForModal(null)
  }

  // ==================== GET DISPLAY NAME ====================

  const getUserDisplayName = (conversation: Conversation) => {
    if (isStudent) {
      return `${conversation.instructor?.firstName || ''} ${conversation.instructor?.lastName || ''}`.trim() || 'Instructor'
    } else {
      return `${conversation.student?.firstName || ''} ${conversation.student?.lastName || ''}`.trim() || 'Student'
    }
  }

  // ==================== GET USER AVATAR ====================

  const getUserAvatar = (conversation: Conversation) => {
    if (isStudent) {
      return conversation.instructor?.avatar || conversation.instructor?.profilePicUrl
    } else {
      return conversation.student?.avatar || conversation.student?.profilePicUrl
    }
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
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className="w-full text-left p-4 rounded border border-border hover:bg-muted transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.avatar || user.profilePicUrl} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {user.firstName.charAt(0)}
                                    {user.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-sm">
                                        {user.firstName} {user.lastName}
                                      </p>
                                      {user.email && (
                                        <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
                                      )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isStudent 
                                        ? `${(user as Instructor).courses.length} course${(user as Instructor).courses.length !== 1 ? 's' : ''}`
                                        : `${(user as Student).courses.length} course${(user as Student).courses.length !== 1 ? 's' : ''}`
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
                {/* Conversations - using unique keys from the Map */}
                {allConversations
                  .filter((conversation) => {
                    const userName = getUserDisplayName(conversation).toLowerCase()
                    const courseTitle = conversation.course?.title?.toLowerCase() || ""
                    const searchLower = searchTerm.toLowerCase()
                    
                    return userName.includes(searchLower) || courseTitle.includes(searchLower)
                  })
                  .map((conversation) => {
                    const isActive = 
                      currentType === "conversation" &&
                      selectedUser?.id === (isStudent ? conversation.instructor?.id : conversation.student?.id) &&
                      selectedCourseId === conversation.courseId
                    
                    const isTemporary = conversation.isTemporary
                    
                    return (
                      <button
                        key={conversation.id} // Now guaranteed to be unique due to Map
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
                                {!isTemporary && conversation.unreadCount && conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="flex-shrink-0 ml-2">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs opacity-70 truncate mt-1">
                                {conversation.course?.title}
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
                    const spaceName = space.title.toLowerCase()
                    const courseTitle = space.courseTitle?.toLowerCase() || ""
                    const searchLower = searchTerm.toLowerCase()
                    
                    return spaceName.includes(searchLower) || courseTitle.includes(searchLower)
                  })
                  .map((space) => {
                    const isActive = currentType === "space" && selectedSpace?.courseSpaceId === space.courseSpaceId
                    
                    return (
                      <button
                        key={`space-${space.courseSpaceId}`}
                        onClick={async () => {
                          setSelectedSpace(space)
                          setCurrentType("space")
                          await fetchSpaceMessages(space.courseSpaceId)
                          setSelectedUser(null)
                          setSelectedCourseId(null)
                          setMessages([])
                        }}
                        className={`w-full text-left p-3 rounded transition-all relative ${
                          isActive
                            ? "bg-muted"
                            : "hover:bg-muted border-transparent hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 flex-shrink-0 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">
                                  {space.title}
                                </p>
                                {space.unreadCount && space.unreadCount > 0 && (
                                  <Badge variant="destructive" className="flex-shrink-0 ml-2">
                                    {space.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs opacity-70 truncate mt-1">
                                <Zap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                <span>{space.courseTitle}</span>
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
                      About: {selectedConversation.course?.title}
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
                                {formatMessageTime(typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString())}
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
                          handleSendMessage()
                        }
                      }}
                      className="min-h-[60px] max-h-[40px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={handleSendMessage}
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
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      {selectedSpace.title}
                    </CardTitle>
                    <CardDescription>
                      {selectedSpace.courseTitle} • Course Space
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
                      <p className="text-muted-foreground">No messages in this space yet.</p>
                    </div>
                  ) : (
                    <>
                      {spaceMessages.map((msg) => {
                        const isCurrentUser = msg.senderId === user?.id
                        return (
                          <div key={msg.id} className="space-y-1">
                            {!isCurrentUser && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={msg.sender?.profile_picture_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {msg.sender ? `${msg.sender.first_name?.[0] || ''}${msg.sender.last_name?.[0] || ''}` : '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-xs">
                                  {msg.sender ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim() : "Unknown"}
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
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Space Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Share with the class..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
                          e.preventDefault()
                          // TODO: Implement sending space message
                        }
                      }}
                      className="min-h-[60px] max-h-[40px] resize-none rounded"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={() => {
                        // TODO: Implement sending space message
                      }}
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