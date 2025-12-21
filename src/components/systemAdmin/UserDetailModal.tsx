"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  BookOpen,
  Award,
  Clock,
  Building2,
  Shield,
  Activity,
  Users,
  Eye,
  Download
} from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { fetchUserDetails } from "@/lib/features/systemAdmin/userManagementSlice";

interface UserDetailModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function UserDetailModal({
  open,
  onClose,
  userId,
  onEdit,
  onDelete,
}: UserDetailModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    if (open && userId) {
      loadUserData();
    }
  }, [open, userId]);
  
  const loadUserData = async () => {
    setLoading(true);
    try {
      const result = await dispatch(fetchUserDetails(userId)).unwrap();
      setUserData(result);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SYSTEM_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'INSTITUTION_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'CONTENT_CREATOR':
        return 'bg-blue-100 text-blue-800';
      case 'INSTRUCTOR':
        return 'bg-green-100 text-green-800';
      case 'LEARNER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading User Details</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!userData) {
    return null;
  }
  
  const { user, detailed_statistics, enrollments, courses_taught, certificates, recent_activity, sessions } = userData;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">User Details</DialogTitle>
              <DialogDescription>
                Comprehensive information and activity for {user.first_name} {user.last_name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Header Info */}
        <div className="flex flex-col md:flex-row gap-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg">
          <div className="flex-shrink-0">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={user.profile_picture_url} />
              <AvatarFallback className="text-2xl">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user.first_name} {user.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getRoleColor(user.bwenge_role)}>
                  {user.bwenge_role.replace(/_/g, ' ')}
                </Badge>
                {user.institution_role && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {user.institution_role}
                  </Badge>
                )}
                {user.is_active ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Inactive
                  </Badge>
                )}
                {user.is_verified && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{user.email}</span>
              </div>
              {user.phone_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{user.phone_number}</span>
                </div>
              )}
              {(user.country || user.city) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{[user.city, user.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Joined {formatDate(user.date_joined)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="institutions">Institutions</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Learning</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {detailed_statistics?.learning.total_courses_enrolled || 0}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Courses enrolled</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.learning.completed_courses || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">In Progress:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.learning.in_progress_courses || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hours:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.learning.total_hours || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Certificates:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.learning.certificates || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Teaching</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {detailed_statistics?.teaching.courses_as_primary_instructor || 0}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Courses taught</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-gray-600">Students:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.teaching.total_students_taught || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.teaching.average_course_rating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reviews:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.teaching.total_reviews || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Institutions</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {detailed_statistics?.institutions.total_institutions || 0}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Institution memberships</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-gray-600">Admin:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.institutions.institutions_as_admin || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Instructor:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.institutions.institutions_as_instructor || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Member:</span>
                      <span className="font-medium ml-1">
                        {detailed_statistics?.institutions.institutions_as_member || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {recent_activity?.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {recent_activity?.map((activity: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        {index < recent_activity.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200"></div>
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Institutions Tab */}
          <TabsContent value="institutions" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Institution Memberships</h3>
                  <Button variant="outline" size="sm">
                    Manage Memberships
                  </Button>
                </div>
                <div className="space-y-3">
                  {user.institutions?.map((institution: any) => (
                    <div key={institution.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{institution.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge className={getRoleColor(institution.role)}>
                              {institution.role}
                            </Badge>
                            <span>Joined {formatDate(institution.joined_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {institution.is_primary && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Primary
                          </Badge>
                        )}
                        {institution.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enrollments */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Enrollments</h3>
                    <span className="text-sm text-gray-600">
                      {enrollments?.length || 0} total
                    </span>
                  </div>
                  <div className="space-y-3">
                    {enrollments?.slice(0, 5).map((enrollment: any) => (
                      <div key={enrollment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{enrollment.course.title}</h4>
                          <Badge variant="outline">{enrollment.status}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                          <span>Enrolled {formatDate(enrollment.enrolled_at)}</span>
                          <span>{enrollment.completion_percentage || 0}% complete</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Courses Taught */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Courses Taught</h3>
                    <span className="text-sm text-gray-600">
                      {courses_taught?.length || 0} total
                    </span>
                  </div>
                  <div className="space-y-3">
                    {courses_taught?.slice(0, 5).map((course: any) => (
                      <div key={course.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{course.title}</h4>
                          <Badge variant="outline">{course.role}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span>Students:</span>
                            <span className="font-medium ml-1">{course.enrollment_count}</span>
                          </div>
                          <div>
                            <span>Rating:</span>
                            <span className="font-medium ml-1">{course.average_rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Certificates */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Certificates Earned</h3>
                <div className="space-y-3">
                  {certificates?.map((certificate: any) => (
                    <div key={certificate.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{certificate.course_title}</h4>
                        <p className="text-sm text-gray-600">
                          Issued {formatDate(certificate.issued_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Active Sessions</h3>
                  <Button variant="outline" size="sm" className="text-red-600">
                    Terminate All Sessions
                  </Button>
                </div>
                <div className="space-y-3">
                  {sessions?.filter((s: any) => s.is_active).map((session: any) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{session.system}</h4>
                          <p className="text-sm text-gray-600">{session.device_info}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>IP: {session.ip_address}</span>
                            <span>Last active: {formatDate(session.last_active)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Active
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            Terminate
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Audit Log</h3>
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Audit log functionality coming soon</p>
                  <p className="text-sm mt-1">Track all changes made to this user account</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}