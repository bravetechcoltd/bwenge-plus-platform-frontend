// @ts-nocheck
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
import { Search, Users, MoreHorizontal, Mail, Calendar, Award, TrendingUp, ChevronLeft, ChevronRight, User, BookOpen, Clock, BarChart3, GraduationCap, CheckCircle2, Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Course {
  id: number
  title: string
  level: string
}

interface Student {
  id: string
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
  courses?: Course[]
  enrolled_courses_count?: number
  completed_courses_count?: number
  total_learning_hours?: number
  certificates_earned?: number
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

  // Calculate completion rate if we have both counts
  const enrolledCount = student.enrolled_courses_count ?? student.courses?.length ?? 0
  const completedCount = student.completed_courses_count ?? 0
  const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Information</DialogTitle>
          <DialogDescription>
            Detailed information about {student.firstName} {student.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Profile */}
          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {student.profilePicUrl ? (
                <img 
                  src={student.profilePicUrl} 
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-16 h-16 rounded-full object-cover"
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
              <div className="flex items-center gap-2 mt-2">
                {student.isActive ? (
                  <Badge className="bg-success/15 text-success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
                {student.isEmailVerified && (
                  <Badge variant="outline" className="text-primary">
                    <Mail className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Learning Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{enrolledCount}</p>
              <p className="text-xs text-primary">Courses Enrolled</p>
            </div>
            <div className="bg-success/10 rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{(student.total_learning_hours ?? 0).toFixed(1)}</p>
              <p className="text-xs text-success">Learning Hours</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <GraduationCap className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{student.certificates_earned ?? 0}</p>
              <p className="text-xs text-primary">Certificates</p>
            </div>
          </div>

          {/* Course Completion Progress */}
          {enrolledCount > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Course Completion Progress
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completed: {completedCount} of {enrolledCount} courses</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-success h-2 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enrolled Courses */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Enrolled Courses ({enrolledCount})
            </h4>
            {student.courses && student.courses.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {student.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">Level: {course.level}</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10">
                      Enrolled
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No courses enrolled</p>
              </div>
            )}
          </div>

          {/* Account Information */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Account Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{new Date(student.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(student.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Level</p>
                <p className="font-medium">{student.level}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Points</p>
                <p className="font-medium">{student.totalPoints?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Streak Days</p>
                <p className="font-medium">{student.streakDays || 0} days</p>
              </div>
            </div>
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

  const institutionId = user?.primary_institution_id

  useEffect(() => {
    const fetchStudents = async () => {
      if (!institutionId || !token) return
      
      setIsLoading(true)
      
      try {
        // Fetch all members with MEMBER role
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}/members?role=MEMBER&page=1&limit=1000`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          const members = data.data?.members || []
          
          // Format students with all fields from backend
          const formatted = members.map((item: any) => ({
            id: item.user?.id || item.member_id || "",
            email: item.user?.email || "",
            firstName: item.user?.first_name || item.user?.username?.split('_')[0] || "",
            lastName: item.user?.last_name || "",
            totalPoints: item.user?.total_points ?? 0,
            level: item.user?.level ?? 1,
            streakDays: item.user?.streakDays ?? 0,
            profilePicUrl: item.user?.profile_picture_url ?? null,
            isActive: item.user?.is_active ?? item.is_active ?? true,
            isEmailVerified: item.user?.is_verified ?? false,
            createdAt: item.user?.date_joined ?? item.joined_at ?? new Date().toISOString(),
            updatedAt: item.user?.last_login ?? item.updated_at ?? new Date().toISOString(),
            courses: item.courses ?? [],
            // IMPORTANT: Map the exact fields from backend response
            enrolled_courses_count: item.user?.enrolled_courses_count ?? 0,
            completed_courses_count: item.user?.completed_courses_count ?? 0,
            total_learning_hours: item.user?.total_learning_hours ?? 0,
            certificates_earned: item.user?.certificates_earned ?? 0,
          }))

          setStudents(formatted)
        } else {
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [institutionId, token])

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
  const totalLearningHours = students.reduce((sum, student) => sum + (student.total_learning_hours ?? 0), 0)
  const totalCertificates = students.reduce((sum, student) => sum + (student.certificates_earned ?? 0), 0)
  const totalEnrolledCourses = students.reduce((sum, student) => sum + (student.enrolled_courses_count ?? 0), 0)
  const averageCompletionRate = totalEnrolledCourses > 0 
    ? Math.round((students.reduce((sum, student) => sum + (student.completed_courses_count ?? 0), 0) / totalEnrolledCourses) * 100)
    : 0

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
                  <TableHead>Courses</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Certificates</TableHead>
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
          <p className="text-muted-foreground">Manage students enrolled in your institution</p>
        </div>
      </div>

      {/* Stats Cards - Updated to show learning metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {activeStudents} active students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrolledCourses}</div>
            <p className="text-xs text-muted-foreground">
              {averageCompletionRate}% avg completion rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLearningHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Total hours spent learning
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCertificates}</div>
            <p className="text-xs text-muted-foreground">
              Across all students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Showing {filteredStudents.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
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
                Students will appear here when they join your institution.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Certificates</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                              {student.profilePicUrl ? (
                                <img 
                                  src={student.profilePicUrl} 
                                  alt={`${student.firstName} ${student.lastName}`}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}` || <User className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {student.isActive ? (
                                  <span className="text-success">Active</span>
                                ) : (
                                  <span className="text-destructive">Inactive</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{student.email}</span>
                            {!student.isEmailVerified && (
                              <Mail className="w-3 h-3 text-warning" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-primary/15 text-primary">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {student.enrolled_courses_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-success/15 text-success">
                            <Clock className="w-3 h-3 mr-1" />
                            {(student.total_learning_hours ?? 0).toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-primary/15 text-primary">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {student.certificates_earned ?? 0}
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-primary">
                                <BookOpen className="mr-2 h-4 w-4" />
                                View Courses ({student.enrolled_courses_count ?? 0})
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-success">
                                <Clock className="mr-2 h-4 w-4" />
                                Learning Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-primary">
                                <GraduationCap className="mr-2 h-4 w-4" />
                                Certificates ({student.certificates_earned ?? 0})
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
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
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8"
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