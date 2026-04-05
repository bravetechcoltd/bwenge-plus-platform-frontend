"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import CourseInstructorManagement from "@/components/course/CourseInstructorManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Users, BookOpen, Building } from "lucide-react";
import toast from "react-hot-toast";

function InstructorsPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  
  const courseId = params.courseId as string;
  const institutionId = params.institutionId as string;
  
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !institutionId || !user) {
        return;
      }

      try {
        setLoading(true);
        
        // Fetch course details
        const courseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        const courseData = await courseResponse.json();
        
        if (courseData.success) {
          setCourse(courseData.data);
          
          // Fetch institution details
          const institutionResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          const institutionData = await institutionResponse.json();
          if (institutionData.success) {
            setInstitution(institutionData.data);
          }
        } else {
          toast.error("Failed to fetch course details");
          router.push(`/dashboard/institution-admin/${institutionId}/courses/assign-instructors`);
        }
      } catch (error) {
        toast.error("Failed to load course information");
        router.push(`/dashboard/institution-admin/${institutionId}/courses/assign-instructors`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, institutionId, user, token, router]);
  
  // Check if user can manage instructors
  const canManage = user?.bwenge_role === "SYSTEM_ADMIN" || 
                    user?.bwenge_role === "INSTITUTION_ADMIN" ||
                    user?.id === course?.created_by_institution_admin_id;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The course you are looking for does not exist or you don't have access.
            </p>
            <Button onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/assign-instructors`)}>
              Back to Assign Instructors
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Back Button and Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/assign-instructors`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assign Instructors
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Instructor Management
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">{course.title}</span>
              </div>
              {institution && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4" />
                  <span>{institution.name}</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              Manage and assign instructors for this course
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/courses/${courseId}`)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              View Course
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <CourseInstructorManagement
            courseId={courseId}
            institutionId={institutionId}
            courseName={course.title}
            canManage={canManage}
          />
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Course Type</p>
                <p className="text-lg font-semibold capitalize">
                  {course.course_type}
                </p>
              </div>
              {course.course_type === "MOOC" ? (
                <div className="p-2 bg-primary/15 rounded-lg">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              ) : (
                <div className="p-2 bg-primary/15 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">
                  {course.status}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${
                course.status === "PUBLISHED" ? "bg-success/15" :
                course.status === "DRAFT" ? "bg-warning/15" :
                "bg-muted"
              }`}>
                <BookOpen className={`w-6 h-6 ${
                  course.status === "PUBLISHED" ? "text-success" :
                  course.status === "DRAFT" ? "text-warning" :
                  "text-muted-foreground"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enrollments</p>
                <p className="text-lg font-semibold">
                  {course.enrollment_count || 0}
                </p>
              </div>
              <div className="p-2 bg-primary/15 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CourseInstructorsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <InstructorsPageContent />
    </Suspense>
  );
}