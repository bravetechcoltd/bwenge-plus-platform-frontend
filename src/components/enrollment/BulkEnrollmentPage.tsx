// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  BookOpen,
  Search,
  Filter,
  Mail,
  UserPlus,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface Course {
  id: string;
  title: string;
  course_type: "MOOC" | "SPOC";
  thumbnail_url: string | null;
  enrollment_count: number;
  max_enrollments: number | null;
  status: string;
  access_codes: string[];
  requires_approval: boolean;
}

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  is_active: boolean;
  is_verified: boolean;
}

interface BulkEnrollmentResult {
  successful: {
    email: string;
    enrollment_id: string;
    access_code?: string;
  }[];
  failed: {
    email: string;
    reason: string;
  }[];
  total_successful: number;
  total_failed: number;
}

export default function BulkEnrollmentPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  const institutionId = user?.primary_institution_id;

  const [activeTab, setActiveTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedCourseData, setSelectedCourseData] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [emailsText, setEmailsText] = useState("");
  const [enrollmentResults, setEnrollmentResults] = useState<BulkEnrollmentResult | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [processingEnrollment, setProcessingEnrollment] = useState(false);
  const [stats, setStats] = useState({
    total_courses: 0,
    total_students: 0,
    pending_enrollments: 0,
    active_enrollments: 0,
  });

  useEffect(() => {
    if (institutionId) {
      fetchCourses();
      fetchStats();
    }
  }, [institutionId]);

  useEffect(() => {
    if (selectedCourse) {
      const course = courses.find(c => c.id === selectedCourse);
      setSelectedCourseData(course || null);
    }
  }, [selectedCourse, courses]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/institution/${institutionId}/owned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data?.courses || []);
        setStats(prev => ({ ...prev, total_courses: data.data?.courses?.length || 0 }));
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch students count
      const studentsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}/members?role=MEMBER`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStats(prev => ({ ...prev, total_students: studentsData.data?.length || 0 }));
      }

      // Fetch pending enrollments
      const pendingResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/pending?institution_id=${institutionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setStats(prev => ({ ...prev, pending_enrollments: pendingData.data?.length || 0 }));
      }

      // Fetch active enrollments
      const activeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            institution_id: institutionId,
            status: "ACTIVE",
            limit: 1 
          }),
        }
      );

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setStats(prev => ({ ...prev, active_enrollments: activeData.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}/members?role=MEMBER`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      } else {
        toast.error("Failed to load students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') {
        setFile(file);
        toast.success(`File "${file.name}" uploaded successfully`);
      } else {
        toast.error("Please upload a valid CSV or Excel file");
      }
    }
  };

  const parseFile = async (): Promise<string[]> => {
    if (!file) return [];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let emails: string[] = [];

          if (file.name.endsWith('.csv')) {
            // Parse CSV
            const text = data as string;
            const lines = text.split('\n');
            emails = lines
              .map(line => line.trim())
              .filter(line => line && line.includes('@'))
              .map(line => line.split(',')[0].trim()); // Assume email is first column
          } else {
            // Parse Excel
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            // Assume first column contains emails
            emails = rows
              .slice(1) // Skip header row
              .map((row: any) => row[0]?.toString().trim())
              .filter(email => email && email.includes('@'));
          }

          resolve(emails);
        } catch (error) {
          reject(error);
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleBulkEnroll = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    let emails: string[] = [];

    if (file) {
      try {
        emails = await parseFile();
        if (emails.length === 0) {
          toast.error("No valid email addresses found in file");
          return;
        }
      } catch (error) {
        toast.error("Failed to parse file");
        return;
      }
    } else if (emailsText.trim()) {
      emails = emailsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('@'));
      
      if (emails.length === 0) {
        toast.error("No valid email addresses found");
        return;
      }
    } else {
      toast.error("Please upload a file or enter email addresses");
      return;
    }

    setProcessingEnrollment(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course_id: selectedCourse,
            student_emails: emails,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setEnrollmentResults(data.data);
        setShowResultsDialog(true);
        toast.success(`Successfully enrolled ${data.data.successful.length} students`);
        fetchStats();
        fetchCourses(); // Refresh course enrollment counts
      } else {
        toast.error(data.message || "Failed to enroll students");
      }
    } catch (error) {
      console.error("Error in bulk enrollment:", error);
      toast.error("Failed to process bulk enrollment");
    } finally {
      setProcessingEnrollment(false);
    }
  };

  const handleGenerateAccessCodes = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    if (!selectedCourseData || selectedCourseData.course_type !== "SPOC") {
      toast.error("Access codes can only be generated for SPOC courses");
      return;
    }

    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${selectedCourse}/access-codes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            count: 50, // Generate 50 codes by default
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`Generated ${data.data.codes.length} access codes`);
        fetchCourses(); // Refresh to show updated codes
      } else {
        toast.error(data.message || "Failed to generate access codes");
      }
    } catch (error) {
      console.error("Error generating access codes:", error);
      toast.error("Failed to generate access codes");
    }
  };

  const filteredStudents = students.filter(student =>
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Email', 'First Name', 'Last Name'],
      ['student1@example.com', 'John', 'Doe'],
      ['student2@example.com', 'Jane', 'Smith'],
      ['student3@example.com', 'Bob', 'Johnson'],
    ]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'bulk_enrollment_template.xlsx');
    
    toast.success("Template downloaded successfully");
  };

  const downloadResults = () => {
    if (!enrollmentResults) return;

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Status', 'Email', 'Details'],
      ...enrollmentResults.successful.map(s => ['SUCCESSFUL', s.email, `Enrollment ID: ${s.enrollment_id}${s.access_code ? `, Code: ${s.access_code}` : ''}`]),
      ...enrollmentResults.failed.map(f => ['FAILED', f.email, f.reason]),
    ]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `bulk_enrollment_results_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bulk Enrollment</h1>
          <p className="text-gray-600">
            Enroll multiple students in courses at once
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCourses}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Courses</p>
                <p className="text-2xl font-bold">{stats.total_courses}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{stats.total_students}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Enrollments</p>
                <p className="text-2xl font-bold">{stats.active_enrollments}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats.pending_enrollments}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload & Enroll
          </TabsTrigger>
          <TabsTrigger value="manual">
            <FileText className="w-4 h-4 mr-2" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="w-4 h-4 mr-2" />
            Student List
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Student List</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing student email addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Select Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.title}</span>
                            <Badge variant="outline" className="ml-2">
                              {course.course_type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCourseData?.course_type === "SPOC" && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={handleGenerateAccessCodes}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Access Codes
                      <Badge className="ml-2 bg-purple-100 text-purple-800">
                        {selectedCourseData.access_codes?.length || 0} available
                      </Badge>
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {file ? file.name : "Upload your file"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {file 
                    ? `${(file.size / 1024).toFixed(2)} KB • Ready to upload`
                    : "Drag and drop or click to browse (CSV, XLSX, XLS)"}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {file ? "Change File" : "Browse Files"}
                  </Button>
                  {file && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {file && selectedCourse && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">File Preview</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>• File: {file.name}</p>
                    <p>• Size: {(file.size / 1024).toFixed(2)} KB</p>
                    <p>• Course: {selectedCourseData?.title}</p>
                    {selectedCourseData?.course_type === "SPOC" && (
                      <p className="text-purple-700">
                        • Access codes will be assigned automatically
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleBulkEnroll}
                  disabled={!selectedCourse || !file || processingEnrollment}
                >
                  {processingEnrollment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Enroll Students
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Email Entry</CardTitle>
              <CardDescription>
                Enter email addresses manually (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>{course.title}</span>
                          <Badge variant="outline" className="ml-2">
                            {course.course_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email Addresses</Label>
                <textarea
                  rows={8}
                  className="w-full mt-2 p-3 border rounded-md font-mono text-sm"
                  placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter one email address per line
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>• Course: {selectedCourseData?.title || "Not selected"}</p>
                  <p>• Emails entered: {emailsText.split('\n').filter(e => e.trim()).length}</p>
                  <p>• Valid emails: {emailsText.split('\n').filter(e => e.includes('@')).length}</p>
                  {selectedCourseData?.course_type === "SPOC" && (
                    <p className="text-purple-700">
                      • Access codes: {selectedCourseData.access_codes?.length || 0} available
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleBulkEnroll}
                  disabled={!selectedCourse || !emailsText.trim() || processingEnrollment}
                >
                  {processingEnrollment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Enroll Students
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student List Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Institution Students</CardTitle>
                  <CardDescription>
                    Select students from your institution to enroll
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchStudents}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course to enroll" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.title}</span>
                              <Badge variant="outline" className="ml-2">
                                {course.course_type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      // Implement bulk enroll from selected
                      const selectedEmails = filteredStudents
                        .filter(s => s.is_active)
                        .map(s => s.email);
                      
                      setEmailsText(selectedEmails.join('\n'));
                      setActiveTab("manual");
                      toast.success(`${selectedEmails.length} students selected`);
                    }}
                    disabled={!selectedCourse || filteredStudents.length === 0}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enroll All Shown
                  </Button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No Students Found
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Try a different search term"
                        : "No students are currently members of your institution"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">
                            <input type="checkbox" className="rounded" />
                          </TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <input type="checkbox" className="rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={student.profile_picture_url || undefined} />
                                  <AvatarFallback>
                                    {student.first_name?.[0]}{student.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {student.first_name} {student.last_name}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              {student.is_active ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(student.date_joined), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEmailsText(student.email);
                                  setActiveTab("manual");
                                }}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Enroll
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Enrollment Results</DialogTitle>
            <DialogDescription>
              Summary of the bulk enrollment process
            </DialogDescription>
          </DialogHeader>

          {enrollmentResults && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {enrollmentResults.total_successful}
                  </p>
                  <p className="text-sm text-green-600">Successful</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">
                    {enrollmentResults.total_failed}
                  </p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {/* Successful Enrollments */}
              {enrollmentResults.successful.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Successful Enrollments ({enrollmentResults.successful.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Enrollment ID</TableHead>
                          {enrollmentResults.successful[0]?.access_code && (
                            <TableHead>Access Code</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollmentResults.successful.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.email}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {result.enrollment_id.slice(0, 8)}...
                            </TableCell>
                            {result.access_code && (
                              <TableCell className="font-mono">
                                {result.access_code}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Failed Enrollments */}
              {enrollmentResults.failed.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    Failed Enrollments ({enrollmentResults.failed.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollmentResults.failed.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.email}</TableCell>
                            <TableCell className="text-red-600">
                              {result.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResultsDialog(false)}
            >
              Close
            </Button>
            <Button onClick={downloadResults}>
              <Download className="w-4 h-4 mr-2" />
              Download Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}