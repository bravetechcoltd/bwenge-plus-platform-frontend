"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  Calendar,
  Award,
  Globe,
  Lock,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserPlus,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Users2,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface InstitutionCourse {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  course_type: string;
  status: string;
  enrollment_count: number;
  average_rating: number;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string;
  };
  created_at: string;
  updated_at: string;
  total_instructors?: number;
}

export default function AssignInstructorsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const institutionId = params.institutionId as string;

  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (institutionId && user?.bwenge_role === "INSTITUTION_ADMIN") {
      fetchInstitutionCourses();
    }
  }, [institutionId, user]);

  const fetchInstitutionCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/institution/${institutionId}/owned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // Fetch instructor counts for each course
        const coursesWithInstructorCounts = await Promise.all(
          data.data.courses.map(async (course: InstitutionCourse) => {
            try {
              const instructorResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/course-instructors/courses/${course.id}/instructors`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              
              const instructorData = await instructorResponse.json();
              if (instructorData.success) {
                return {
                  ...course,
                  total_instructors: instructorData.data.total_instructors || 0
                };
              }
            } catch (error) {
            }
            
            return {
              ...course,
              total_instructors: 0
            };
          })
        );
        
        setCourses(coursesWithInstructorCounts);
      } else {
        toast.error(data.message || "Failed to fetch courses");
      }
    } catch (error) {
      toast.error("Failed to fetch institution courses");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    // Search filter
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === "all" || course.course_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-success/15 text-success";
      case "DRAFT":
        return "bg-warning/15 text-warning";
      case "ARCHIVED":
        return "bg-muted text-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getCourseTypeIcon = (type: string) => {
    return type === "MOOC" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
  };

  const getCourseTypeColor = (type: string) => {
    return type === "MOOC" ? "bg-primary/15 text-primary" : "bg-primary/15 text-primary";
  };

  if (!user || user.bwenge_role !== "INSTITUTION_ADMIN") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You need to be an institution administrator to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-5 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Assign Instructors</h1>
          <p className="text-muted-foreground">
            Manage instructors for your institution's courses
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInstitutionCourses}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-card"
              >
                <option value="all">All Status</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-card"
              >
                <option value="all">All Types</option>
                <option value="MOOC">MOOC</option>
                <option value="SPOC">SPOC</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-[#0158B7]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.status === "PUBLISHED").length}
                </p>
              </div>
              <Globe className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Instructors</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((sum, course) => sum + (course.total_instructors || 0), 0)}
                </p>
              </div>
              <Users2 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SPOC Courses</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.course_type === "SPOC").length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Courses Grid (Card Layout) */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0158B7]" />
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base line-clamp-1 break-words min-w-0">{course.title}</CardTitle>
                 
                  </div>
                  <Badge className={getStatusColor(course.status)}>
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Course Image */}
                <div className="relative h-32 w-full rounded-lg overflow-hidden bg-muted">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={getCourseTypeColor(course.course_type)}>
                      {getCourseTypeIcon(course.course_type)}
                      <span className="ml-1">{course.course_type}</span>
                    </Badge>
                  </div>
                </div>

                {/* Course Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{course.enrollment_count} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{course.total_instructors || 0} instructors</span>
                    </div>
                  </div>

                  {/* Instructor Info */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {course.instructor?.profile_picture_url ? (
                        <img
                          src={course.instructor.profile_picture_url}
                          alt={course.instructor.first_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium truncate max-w-[120px]">
                          {course.instructor?.first_name} {course.instructor?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Primary Instructor</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                      Primary
                    </Badge>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {format(new Date(course.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/${course.id}/instructors`)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Manage Instructors
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No Courses Found
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
              ? "Try different search criteria" 
              : "No courses available for instructor assignment"}
          </p>
          <Button onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses`)}>
            View All Courses
          </Button>
        </div>
      )}


    </div>
  );
}