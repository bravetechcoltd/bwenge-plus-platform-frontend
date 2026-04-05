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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  DownloadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";
import * as XLSX from "xlsx";

interface ExportOptions {
  format: "csv" | "excel" | "json";
  dateRange: "all" | "7d" | "30d" | "90d" | "custom";
  startDate?: string;
  endDate?: string;
  courseFilter: "all" | "specific";
  courseId?: string;
  statusFilter: string[];
  includeFields: {
    studentInfo: boolean;
    courseInfo: boolean;
    enrollmentDetails: boolean;
    progressData: boolean;
    certificates: boolean;
  };
}

export default function ExportEnrollmentPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  const institutionId = user?.primary_institution_id;

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [options, setOptions] = useState<ExportOptions>({
    format: "csv",
    dateRange: "all",
    courseFilter: "all",
    statusFilter: ["ACTIVE", "COMPLETED", "PENDING"],
    includeFields: {
      studentInfo: true,
      courseInfo: true,
      enrollmentDetails: true,
      progressData: true,
      certificates: true,
    },
  });

  useEffect(() => {
    if (institutionId) {
      fetchCourses();
      fetchEnrollmentCount();
      fetchExportHistory();
    }
  }, [institutionId]);

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
      }
    } catch (error) {
    }
  };

  const fetchEnrollmentCount = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/enrollments/count?institution_id=${institutionId}`;
      
      if (options.courseFilter === "specific" && options.courseId) {
        url += `&course_id=${options.courseId}`;
      }
      
      if (options.dateRange !== "all" && options.dateRange !== "custom") {
        const days = options.dateRange === "7d" ? 7 : options.dateRange === "30d" ? 30 : 90;
        const startDate = subDays(new Date(), days).toISOString();
        url += `&start_date=${startDate}`;
      } else if (options.dateRange === "custom" && options.startDate && options.endDate) {
        url += `&start_date=${new Date(options.startDate).toISOString()}`;
        url += `&end_date=${new Date(options.endDate).toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEnrollmentCount(data.data?.count || 0);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/export-history?institution_id=${institutionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExportHistory(data.data || []);
      }
    } catch (error) {
    }
  };

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/enrollments/export-preview?institution_id=${institutionId}&limit=10`;
      
      if (options.courseFilter === "specific" && options.courseId) {
        url += `&course_id=${options.courseId}`;
      }
      
      if (options.statusFilter.length > 0) {
        url += `&status=${options.statusFilter.join(',')}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.data || []);
        setShowPreview(true);
      }
    } catch (error) {
      toast.error("Failed to load preview data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (enrollmentCount === 0) {
      toast.error("No enrollment data to export");
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Build query parameters
      const params = new URLSearchParams({
        institution_id: institutionId!,
        format: options.format,
      });

      if (options.courseFilter === "specific" && options.courseId) {
        params.append("course_id", options.courseId);
      }

      if (options.dateRange !== "all") {
        if (options.dateRange === "custom" && options.startDate && options.endDate) {
          params.append("start_date", new Date(options.startDate).toISOString());
          params.append("end_date", new Date(options.endDate).toISOString());
        } else {
          const days = options.dateRange === "7d" ? 7 : options.dateRange === "30d" ? 30 : 90;
          const startDate = subDays(new Date(), days).toISOString();
          params.append("start_date", startDate);
        }
      }

      if (options.statusFilter.length > 0) {
        params.append("status", options.statusFilter.join(','));
      }

      // Add field selection
      params.append("fields", JSON.stringify(options.includeFields));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle different formats
      const contentType = response.headers.get("content-type");
      const blob = await response.blob();
      
      let filename = `enrollments_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
      
      if (options.format === "csv") {
        filename += ".csv";
      } else if (options.format === "excel") {
        filename += ".xlsx";
      } else if (options.format === "json") {
        filename += ".json";
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Export successful: ${enrollmentCount} records exported`);
      fetchExportHistory(); // Refresh history
    } catch (error) {
      toast.error("Failed to export enrollment data");
    } finally {
      setExporting(false);
    }
  };

  const handleExportTemplate = () => {
    const template = [
      {
        'Student Email': 'student@example.com',
        'Student First Name': 'John',
        'Student Last Name': 'Doe',
        'Course Title': 'Introduction to Programming',
        'Course Type': 'MOOC',
        'Status': 'ACTIVE',
        'Enrolled Date': format(new Date(), 'yyyy-MM-dd'),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'enrollment_import_template.xlsx');
    
    toast.success("Template downloaded successfully");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-success/15 text-success">Active</Badge>;
      case "COMPLETED":
        return <Badge className="bg-primary/15 text-primary">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-warning/15 text-warning">Pending</Badge>;
      case "DROPPED":
        return <Badge className="bg-destructive/15 text-destructive">Dropped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Export Enrollment Data</h1>
          <p className="text-muted-foreground">
            Export enrollment records for reporting and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportTemplate}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={fetchExportHistory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
              <CardDescription>
                Customize your export settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Selection */}
              <div>
                <Label>Export Format</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <Button
                    variant={options.format === "csv" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setOptions({ ...options, format: "csv" })}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={options.format === "excel" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setOptions({ ...options, format: "excel" })}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    variant={options.format === "json" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setOptions({ ...options, format: "json" })}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>

              {/* Course Filter */}
              <div>
                <Label>Course Filter</Label>
                <Select
                  value={options.courseFilter}
                  onValueChange={(value: "all" | "specific") =>
                    setOptions({ ...options, courseFilter: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="specific">Specific Course</SelectItem>
                  </SelectContent>
                </Select>

                {options.courseFilter === "specific" && (
                  <Select
                    value={options.courseId}
                    onValueChange={(value) =>
                      setOptions({ ...options, courseId: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Date Range */}
              <div>
                <Label>Date Range</Label>
                <Select
                  value={options.dateRange}
                  onValueChange={(value: any) =>
                    setOptions({ ...options, dateRange: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {options.dateRange === "custom" && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={options.startDate}
                        onChange={(e) =>
                          setOptions({ ...options, startDate: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={options.endDate}
                        onChange={(e) =>
                          setOptions({ ...options, endDate: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <Label>Enrollment Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["ACTIVE", "COMPLETED", "PENDING", "DROPPED"].map((status) => (
                    <Button
                      key={status}
                      variant={options.statusFilter.includes(status) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newStatus = options.statusFilter.includes(status)
                          ? options.statusFilter.filter(s => s !== status)
                          : [...options.statusFilter, status];
                        setOptions({ ...options, statusFilter: newStatus });
                      }}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Fields to Include */}
              <div>
                <Label>Fields to Include</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { key: "studentInfo", label: "Student Information" },
                    { key: "courseInfo", label: "Course Information" },
                    { key: "enrollmentDetails", label: "Enrollment Details" },
                    { key: "progressData", label: "Progress Data" },
                    { key: "certificates", label: "Certificate Information" },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={field.key}
                        checked={options.includeFields[field.key as keyof typeof options.includeFields]}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            includeFields: {
                              ...options.includeFields,
                              [field.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor={field.key}>{field.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">Export Summary</h4>
                <div className="space-y-1 text-sm text-primary">
                  <p>• Format: {options.format.toUpperCase()}</p>
                  <p>• Records to export: {loading ? "Loading..." : enrollmentCount}</p>
                  <p>• Date range: {options.dateRange === "all" ? "All time" : options.dateRange}</p>
                  <p>• Status filter: {options.statusFilter.join(", ")}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={fetchPreview}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Preview Data
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={exporting || enrollmentCount === 0}
                  size="lg"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export {enrollmentCount} Records
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Data */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Preview of the first 10 records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.user?.first_name} {item.user?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{item.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{item.course?.title}</p>
                            <p className="text-sm text-muted-foreground">{item.course?.course_type}</p>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{format(new Date(item.enrolled_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${item.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-sm">{item.progress_percentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Export History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
              <CardDescription>
                Your recent export activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <DownloadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No Exports Yet
                  </h3>
                  <p className="text-muted-foreground">
                    Your export history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exportHistory.map((export_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/15 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {export_.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {export_.record_count} records • {format(new Date(export_.exported_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Download existing export
                          window.open(export_.download_url, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Total Students</span>
                </div>
                <span className="font-semibold">{enrollmentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Total Courses</span>
                </div>
                <span className="font-semibold">{courses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Active Enrollments</span>
                </div>
                <span className="font-semibold text-success">1,234</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-semibold text-warning">56</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}