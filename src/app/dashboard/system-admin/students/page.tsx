"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Users, MoreHorizontal, Mail, Calendar, Award, TrendingUp, ChevronLeft, ChevronRight, User, BookOpen, Clock, BarChart3 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Course {
  id: number
  title: string
  level: string
}

interface Student {
  id: number
  email: string
  firstName: string
  lastName: string
  totalPoints: number
  level: number
  streakDays: number
  profilePicUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
  courses?: Course[] // Add courses to the student interface
}

interface StudentsResponse {
  success: boolean
  instructorId: string
  studentCount: number
  students: Array<{
    student: Student
    courses: Course[]
  }>
}

// Skeleton Loading Components
const SkeletonCard = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-2">
      <div className="h-4 bg-secondary dark:bg-card rounded w-1/3"></div>
    </CardHeader>
    <CardContent>
      <div className="h-6 bg-secondary dark:bg-card rounded w-1/4"></div>
    </CardContent>
  </Card>
)

const SkeletonTableRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-secondary dark:bg-card rounded-full"></div>
        <div className="space-y-1">
          <div className="h-4 bg-secondary dark:bg-card rounded w-24"></div>
          <div className="h-3 bg-secondary dark:bg-card rounded w-32"></div>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-secondary dark:bg-card rounded w-full"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 bg-secondary dark:bg-card rounded w-16"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 bg-secondary dark:bg-card rounded w-12"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 bg-secondary dark:bg-card rounded w-20"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-secondary dark:bg-card rounded w-20"></div>
    </TableCell>
    <TableCell className="text-right">
      <div className="h-8 bg-secondary dark:bg-card rounded w-8 ml-auto"></div>
    </TableCell>
  </TableRow>
)

// Student Info Modal Component
interface StudentInfoModalProps {
  student: Student | null
  isOpen: boolean
  onClose: () => void
}

const StudentInfoModal = ({ student, isOpen, onClose }: StudentInfoModalProps) => {
  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Student Information</DialogTitle>
          <DialogDescription>
            Detailed information about {student.firstName} {student.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Profile */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {student.profilePicUrl ? (
                <img 
                  src={student.profilePicUrl} 
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {student.firstName} {student.lastName}
              </h3>
              <p className="text-muted-foreground">{student.email}</p>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Enrolled Courses
            </h4>
            {student.courses && student.courses.length > 0 ? (
              <div className="space-y-2">
                {student.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">Course Level: {course.level}</p>
                    </div>
                    <Badge variant="outline">Enrolled</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border rounded-lg">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No courses enrolled</p>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function StudentsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { token, user } = useAuth()
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Available items per page options
  const itemsPerPageOptions = [5, 10, 25, 50, 100]

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id || !token) return
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/${user.id}/students`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )
        
        if (response.ok) {
          const data: StudentsResponse = await response.json()
          const formatted = data.students.map((s) => ({
            ...s.student,   // spread student fields
            courses: s.courses, // attach their courses
          }))

          setStudents(formatted)
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [user?.id, token])

  // Filter students based on search term
  const filteredStudents = students.filter(
    (student) =>
      student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStudents = filteredStudents.slice(startIndex, endIndex)

  // Reset to first page when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  const handleViewStudentInfo = (student: Student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStudent(null)
  }

  const getLevelBadgeColor = (level: number) => {
    if (level >= 10) return "bg-primary/15 text-primary"
    if (level >= 5) return "bg-primary/15 text-primary"
    if (level >= 3) return "bg-success/15 text-success"
    return "bg-muted text-foreground"
  }

  const getPointsBadgeColor = (points: number) => {
    if (points >= 1000) return "bg-warning/15 text-warning"
    if (points >= 500) return "bg-warning/15 text-warning"
    if (points >= 100) return "bg-success/15 text-success"
    return "bg-muted text-foreground"
  }

  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
  }

  // Format date to relative time or readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString()
  }

  // Calculate stats
  const totalStudents = students.length
  const activeStudents = students.filter(student => student.isActive).length
  const averageLevel = students.length > 0 
    ? students.reduce((sum, student) => sum + student.level, 0) / students.length 
    : 0
  const totalPoints = students.reduce((sum, student) => sum + student.totalPoints, 0)

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-secondary dark:bg-card rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-secondary dark:bg-card rounded w-80 animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Skeleton Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 bg-secondary dark:bg-card rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-secondary dark:bg-card rounded w-48 animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-9 bg-secondary dark:bg-card rounded w-64 animate-pulse"></div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonTableRow key={index} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage students enrolled in your courses</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all your courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageLevel.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Student progression</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined student points</p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {students.length === 0 ? "No students found." : "No students match your search."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Students will appear here when they enroll in your courses.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {student.profilePicUrl ? (
                              <img 
                                src={student.profilePicUrl} 
                                alt={`${student.firstName} ${student.lastName}`}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {student.email}
                          {!student.isEmailVerified && <Mail className="w-3 h-3 text-warning" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.courses?.length || 0} courses
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(student.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewStudentInfo(student)}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {itemsPerPage} per page
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {itemsPerPageOptions.map((option) => (
                            <DropdownMenuItem
                              key={option}
                              onClick={() => handleItemsPerPageChange(option)}
                              className={itemsPerPage === option ? "bg-accent" : ""}
                            >
                              {option} per page
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Info Modal */}
      <StudentInfoModal 
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  )
}