"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageCircle, Mail, Users, Plus, AlertCircle } from "lucide-react"
import type { PrivateMessage, CourseSpaceMessage, Course, User } from "@/types"
import { PrivateInstructorMessenger } from "./private-instructor-messenger"
import { CourseSpaceMessenger } from "./course-space-messenger"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "../ui/alert"
import { useAuth } from "@/hooks/use-auth"

interface CourseSpacePanelProps {
  instructor: User
  course: Course
  privateMessages: PrivateMessage[]
  spaceMessages: CourseSpaceMessage[]
  enrolledStudentCount?: number
  isLoadingSpace?: boolean
  isLoading: boolean
  loadingMessages: boolean
  onSendPrivateMessage: (content: string) => Promise<void>
  onSendSpaceMessage: (content: string) => Promise<void>
  onCreateSpace?: (courseId: string) => Promise<void>
  isCreatingSpace?: boolean
  isFullscreen?: boolean
}

export function CourseSpacePanel({
  instructor,
  course,
  privateMessages,
  spaceMessages,
  enrolledStudentCount,
  isLoadingSpace,
  isLoading = false,
  loadingMessages,
  onSendPrivateMessage,
  onSendSpaceMessage,
  onCreateSpace,
  isCreatingSpace = false,
  isFullscreen = false,
}: CourseSpacePanelProps) {
  const [activeTab, setActiveTab] = useState<"messages" | "space">("messages")
  const [spaceError, setSpaceError] = useState<string | null>(null)
  const { user } = useAuth()

  const hasSpace = !!course.space

  const handleCreateSpace = async () => {
    if (!onCreateSpace) return
    setSpaceError(null)
    try {
      await onCreateSpace(course.id)
      setActiveTab("space")
    } catch (err) {
      setSpaceError(err instanceof Error ? err.message : "Failed to create space")
    }
  }

  // Prevent tab clicks from bubbling to Sheet/Drawer close handlers
  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  const messengerContent = (
    <PrivateInstructorMessenger
      instructor={instructor}
      courseTitle={course.title}
      messages={privateMessages}
      isLoading={loadingMessages}
      onSendMessage={onSendPrivateMessage}
      onOpenFullConversation={() => {}}
    />
  )

  const spaceContent = hasSpace ? (
    <CourseSpaceMessenger
      currentUser={user!}
      spaceName={course.title}
      enrolledStudentCount={enrolledStudentCount ?? 0}
      messages={spaceMessages}
      isLoading={isLoadingSpace || isLoading}
      onSendMessage={onSendSpaceMessage}
      onOpenFullSpace={() => {}}
    />
  ) : (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-5 max-w-md">
        <div className="bg-gradient-to-br from-violet-100 to-green-100 dark:from-violet-900/30 dark:to-green-900/30 rounded-full p-5 mx-auto w-fit">
          <Users className="h-9 w-9 text-primary dark:text-primary" />
        </div>

        <div className="space-y-2">
          <h3 className={`font-semibold ${isFullscreen ? "text-xl" : "text-lg"}`}>
            No Course Space Yet
          </h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
            {user!.bwenge_role === "LEARNER"
              ? "This course doesn't have a space yet. Ask your instructor to create one for collaborative learning."
              : `Create a space for students to collaborate, ask questions, and share ideas about ${course.title}`}
          </p>
        </div>

        {spaceError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{spaceError}</AlertDescription>
          </Alert>
        )}

        {onCreateSpace && user!.bwenge_role !== "LEARNER" && (
          <Button
            onClick={handleCreateSpace}
            disabled={isCreatingSpace}
            className="cursor-pointer bg-gradient-to-r from-violet-600 to-green-600 hover:from-violet-700 hover:to-green-700 shadow-md hover:shadow-lg transition-all"
          >
            {isCreatingSpace ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Course Space
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full h-full flex flex-col bg-card dark:bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "messages" | "space")}
        className="h-full flex flex-col min-h-0"
      >
        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 border-b border-border dark:border-border bg-muted/50/60 dark:bg-green-300/20"
          onClick={stopProp}
        >
          <TabsList className="bg-transparent rounded-none p-0 h-auto w-full grid grid-cols-2 gap-0">
            <TabsTrigger
              value="messages"
              onClick={stopProp}
              className="
                rounded-none border-b-2 border-transparent px-4 py-3
                text-sm font-medium text-muted-foreground dark:text-muted-foreground
                transition-all duration-150
                data-[state=active]:border-success
                data-[state=active]:text-success dark:data-[state=active]:text-white
                data-[state=active]:bg-card dark:data-[state=active]:bg-primary/40
                hover:text-foreground dark:hover:text-foreground
                hover:bg-card/60 dark:hover:bg-primary/30
              "
            >
              <Mail className="h-4 w-4 mr-2 inline-block" />
              Messages
            </TabsTrigger>
            <TabsTrigger
              value="space"
              onClick={stopProp}
              className="
                rounded-none border-b-2 border-transparent px-4 py-3
                text-sm font-medium text-muted-foreground dark:text-muted-foreground
                transition-all duration-150
                data-[state=active]:border-success
                data-[state=active]:text-success dark:data-[state=active]:text-white
                data-[state=active]:bg-card dark:data-[state=active]:bg-primary/40
                hover:text-foreground dark:hover:text-foreground
                hover:bg-card/60 dark:hover:bg-primary/30
              "
            >
              <MessageCircle className="h-4 w-4 mr-2 inline-block" />
              Space
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Messages tab ─────────────────────────────────────────────────── */}
        <TabsContent
          value="messages"
          className="flex-1 min-h-0 overflow-hidden p-0 mt-0 data-[state=inactive]:hidden"
        >
          {messengerContent}
        </TabsContent>

        {/* ── Space tab ────────────────────────────────────────────────────── */}
        <TabsContent
          value="space"
          className="flex-1 min-h-0 overflow-hidden p-0 mt-0 data-[state=inactive]:hidden"
        >
          {isFullscreen ? (
            <div className="h-full flex justify-center overflow-hidden">
              <div className="w-full max-w-4xl flex flex-col min-h-0 h-full">
                {spaceContent}
              </div>
            </div>
          ) : (
            spaceContent
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}