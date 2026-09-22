"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, ArrowRight, Users, Building } from "lucide-react"

interface CourseSelectionModalProps {
  onSelectMode: (mode: "course" | "document") => void
}

export function CourseSelectionModal({ onSelectMode }: CourseSelectionModalProps) {
  const router = useRouter()

  const handleDocumentMode = () => {
    router.push("/instructor/documents?new=true")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900/10 dark:to-gray-800/20 flex justify-center p-4">
      <div className="w-full max-w-2xl mt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Create New Content</h1>
          <p className="text-lg text-muted-foreground">Choose how you'd like to create your educational content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Course Mode */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => onSelectMode("course")}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle>Interactive Course</CardTitle>
              <CardDescription>Create structured courses with modules, lessons, and assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Support for MOOC and SPOC courses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Interactive assessments and quizzes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Institution-wide course management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Certificate generation</span>
                </li>
              </ul>
              <div className="flex gap-2">
                <Button className="w-full" onClick={() => onSelectMode("course")}>
                  Create Course <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document Mode */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:bg-primary/5"
            onClick={handleDocumentMode}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle>Document Mode</CardTitle>
              <CardDescription>Create content from uploaded documents or rich text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Upload existing documents (PDF, Word)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Rich text editor with formatting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Insert images and videos inline</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Convert to course content later</span>
                </li>
              </ul>
              <Button className="w-full" onClick={handleDocumentMode}>
                Create Document <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          You can switch between modes later from the instructor dashboard
        </p>
      </div>
    </div>
  )
}