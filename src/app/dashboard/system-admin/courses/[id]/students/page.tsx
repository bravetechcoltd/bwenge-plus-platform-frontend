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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, UserPlus, MoreHorizontal, Trash2, Mail, Plus, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/types"

interface StudentFormData {
  email: string
}

interface StudentResponse {
  user: User
  enrollment: any
}

export default function StudentsManagement({ params }: { params: Promise<{ id: string }> }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStudents, setNewStudents] = useState<StudentFormData[]>([{ email: "" }])
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; email: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const { token } = useAuth()

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${params.id}/students`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setStudents(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch students:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [params.id, token])

  const filteredStudents = students.filter(
    (student) =>
      student.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "instructor":
        return "bg-blue-100 text-blue-800"
      case "student":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const addStudentField = () => {
    setNewStudents([...newStudents, { email: "" }])
  }

  const removeStudentField = (index: number) => {
    if (newStudents.length > 1) {
      const updatedStudents = newStudents.filter((_, i) => i !== index)
      setNewStudents(updatedStudents)
    }
  }

  const updateStudentField = (index: number, field: keyof StudentFormData, value: string) => {
    const updatedStudents = [...newStudents]
    updatedStudents[index][field] = value
    setNewStudents(updatedStudents)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const validStudents = newStudents.filter((student) => student.email.trim())

      if (validStudents.length === 0) {
        alert("Please add at least one valid student email")
        return
      }

      const payload = {
        course_id: params.id,
        student_emails: validStudents.map(s => s.email)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // Refresh the students list
        const fetchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${params.id}/students`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (fetchResponse.ok) {
          const data = await fetchResponse.json()
          setStudents(data.data || [])
        }

        setNewStudents([{ email: "" }])
        setIsAddDialogOpen(false)
      } else {
        const errorData = await response.json()
        alert(`Failed to add students: ${errorData.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to add students:", error)
      alert("Failed to add students. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openRemoveDialog = (student: StudentResponse) => {
    setStudentToRemove({
      id: student.user.id,
      email: student.user.email,
    })
    setRemoveDialogOpen(true)
  }

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return

    setIsRemoving(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/${studentToRemove.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: params.id,
        }),
      })

      if (response.ok) {
        // Refresh the students list
        const fetchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${params.id}/students`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (fetchResponse.ok) {
          const data = await fetchResponse.json()
          setStudents(data.data || [])
        }

        setRemoveDialogOpen(false)
        setStudentToRemove(null)
      } else {
        const errorData = await response.json()
        alert(`Failed to remove student: ${errorData.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to remove student:", error)
      alert("Failed to remove student. Please try again.")
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">Manage students who are enrolled in this course</p>
          </div>
          <Button disabled>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Students
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>Loading students...</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8 w-64" disabled />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage students who are enrolled in this course</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Students
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Students to Course</DialogTitle>
              <DialogDescription>
                Add one or more students to this course by entering their email addresses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Student Emails</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addStudentField}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  Add Another
                </Button>
              </div>

              {newStudents.map((student, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                  {newStudents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => removeStudentField(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}

                  <div>
                    <label htmlFor={`email-${index}`} className="text-sm font-medium">
                      Email Address *
                    </label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={student.email}
                      onChange={(e) => updateStudentField(index, "email", e.target.value)}
                      placeholder="student@example.com"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Adding Students..." : "Add Students"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>A list of all students enrolled in this course</CardDescription>
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
              <p className="text-muted-foreground">No students found in this course.</p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Students
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.user.id}>
                    <TableCell className="font-medium">
                      {student.user.first_name} {student.user.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {student.user.email}
                        {!student.user.is_verified && <Mail className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(student.user.account_type)}>
                        {student.user.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.user.is_active ? "default" : "secondary"}>
                        {student.user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(student.user.date_joined).toLocaleDateString()}
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => openRemoveDialog(student)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{studentToRemove?.email}</strong> from this course? 
              This action cannot be undone and the student will lose access to all course materials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStudent}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isRemoving ? "Removing..." : "Remove Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}