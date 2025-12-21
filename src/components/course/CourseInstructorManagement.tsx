"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import {
  fetchAvailableInstructors,
  fetchCourseInstructors,
  assignInstructor,
  replacePrimaryInstructor,
  updateInstructorPermissions,
  removeInstructor,
  bulkAssignInstructors,
  clearOperationSuccess,
  clearOperationError,
  resetInstructorState,
  selectAvailableInstructors,
  selectCourseInstructors,
  selectIsLoadingInstructors,
  selectIsLoadingAvailable,
  selectOperationSuccess,
  selectOperationError,
} from "@/lib/features/courseInstructors/courseInstructorSlice";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
  CheckCircle,
  XCircle,
  BookOpen,
  Award,
  Shield,
  FileText,
  Users2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { InstructorCard } from "@/components/instructors/InstructorCard";
import { InstructorSelector } from "@/components/instructors/InstructorSelector";
import { PermissionsConfig } from "@/components/instructors/PermissionsConfig";

interface CourseInstructorManagementProps {
  courseId: string;
  institutionId: string;
  courseName: string;
  canManage: boolean;
}

export default function CourseInstructorManagement({
  courseId,
  institutionId,
  courseName,
  canManage,
}: CourseInstructorManagementProps) {
  const dispatch = useAppDispatch();

  // Redux state
  const availableInstructors = useAppSelector(selectAvailableInstructors);
  const courseInstructors = useAppSelector(selectCourseInstructors);
  const isLoadingInstructors = useAppSelector(selectIsLoadingInstructors);
  const isLoadingAvailable = useAppSelector(selectIsLoadingAvailable);
  const operationSuccess = useAppSelector(selectOperationSuccess);
  const operationError = useAppSelector(selectOperationError);

  // Local state
  const [activeTab, setActiveTab] = useState<"current" | "add" | "replace">("current");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [selectedInstructorForPermissions, setSelectedInstructorForPermissions] = useState<any>(null);
  
  const [newInstructorId, setNewInstructorId] = useState<string>("");
  const [newPrimaryInstructorId, setNewPrimaryInstructorId] = useState<string>("");
  const [keepAsAdditional, setKeepAsAdditional] = useState(true);
  
  const [permissionsForm, setPermissionsForm] = useState({
    can_grade_assignments: true,
    can_manage_enrollments: false,
    can_edit_course_content: true,
  });

  const [bulkSelectedInstructors, setBulkSelectedInstructors] = useState<Set<string>>(new Set());
  const [bulkPermissions, setBulkPermissions] = useState({
    can_grade_assignments: true,
    can_manage_enrollments: false,
    can_edit_course_content: true,
  });

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Initialize data
  useEffect(() => {
    if (courseId && institutionId) {
      dispatch(fetchCourseInstructors(courseId));
      dispatch(fetchAvailableInstructors({ institutionId, courseId }));
    }

    return () => {
      dispatch(resetInstructorState());
    };
  }, [dispatch, courseId, institutionId]);

  // Handle search
  useEffect(() => {
    if (debouncedSearchTerm) {
      dispatch(fetchAvailableInstructors({ 
        institutionId, 
        courseId, 
        search: debouncedSearchTerm 
      }));
    } else {
      dispatch(fetchAvailableInstructors({ institutionId, courseId }));
    }
  }, [dispatch, institutionId, courseId, debouncedSearchTerm]);

  // Handle operation success/error
  useEffect(() => {
    if (operationSuccess) {
      toast.success("Operation completed successfully");
      dispatch(clearOperationSuccess());
      
      // Refresh data
      dispatch(fetchCourseInstructors(courseId));
      dispatch(fetchAvailableInstructors({ institutionId, courseId }));
      
      // Close dialogs
      setShowAddDialog(false);
      setShowReplaceDialog(false);
      setShowPermissionsDialog(false);
      setShowBulkDialog(false);
    }

    if (operationError) {
      toast.error(operationError);
      dispatch(clearOperationError());
    }
  }, [operationSuccess, operationError, dispatch, courseId, institutionId]);

  // Filter available instructors based on search
  const filteredAvailableInstructors = useMemo(() => {
    return availableInstructors.filter(instructor => {
      const fullName = `${instructor.first_name} ${instructor.last_name}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        instructor.email.toLowerCase().includes(searchLower) ||
        instructor.institution_role.toLowerCase().includes(searchLower)
      );
    });
  }, [availableInstructors, searchTerm]);

  // Handle adding instructor
  const handleAddInstructor = async () => {
    if (!newInstructorId) {
      toast.error("Please select an instructor");
      return;
    }

    try {
      await dispatch(assignInstructor({
        courseId,
        instructorId: newInstructorId,
        permissions: permissionsForm,
      })).unwrap();
      
      setNewInstructorId("");
      setPermissionsForm({
        can_grade_assignments: true,
        can_manage_enrollments: false,
        can_edit_course_content: true,
      });
    } catch (error) {
      console.error("Failed to add instructor:", error);
    }
  };

  // Handle replacing primary instructor
  const handleReplacePrimaryInstructor = async () => {
    if (!newPrimaryInstructorId) {
      toast.error("Please select a new primary instructor");
      return;
    }

    if (newPrimaryInstructorId === courseInstructors.primary?.id) {
      toast.error("Selected instructor is already the primary instructor");
      return;
    }

    try {
      await dispatch(replacePrimaryInstructor({
        courseId,
        newInstructorId: newPrimaryInstructorId,
        keepAsAdditional,
        transferPermissions: permissionsForm,
      })).unwrap();
      
      setNewPrimaryInstructorId("");
      setKeepAsAdditional(true);
    } catch (error) {
      console.error("Failed to replace primary instructor:", error);
    }
  };

  // Handle updating permissions
  const handleUpdatePermissions = async () => {
    if (!selectedInstructorForPermissions) return;

    try {
      await dispatch(updateInstructorPermissions({
        courseId,
        instructorId: selectedInstructorForPermissions.id,
        permissions: permissionsForm,
      })).unwrap();
      
      setSelectedInstructorForPermissions(null);
      setPermissionsForm({
        can_grade_assignments: true,
        can_manage_enrollments: false,
        can_edit_course_content: true,
      });
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  const handleRemoveInstructor = async (instructorId: string, instructorName: string) => {
    if (!confirm(`Are you sure you want to remove ${instructorName} from this course?`)) {
      return;
    }

    try {
      await dispatch(removeInstructor({ courseId, instructorId })).unwrap();
      toast.success(`Instructor removed successfully`);
    } catch (error) {
      console.error("Failed to remove instructor:", error);
    }
  };

  // Handle bulk assignment
  const handleBulkAssignInstructors = async () => {
    if (bulkSelectedInstructors.size === 0) {
      toast.error("Please select at least one instructor");
      return;
    }

    const instructors = Array.from(bulkSelectedInstructors).map(instructorId => ({
      instructorId,
      permissions: bulkPermissions,
    }));

    try {
      await dispatch(bulkAssignInstructors({ courseId, instructors })).unwrap();
      setBulkSelectedInstructors(new Set());
    } catch (error) {
      console.error("Failed to bulk assign instructors:", error);
    }
  };

  // Handle bulk selection toggle
  const handleBulkSelectToggle = (instructorId: string) => {
    const newSelected = new Set(bulkSelectedInstructors);
    if (newSelected.has(instructorId)) {
      newSelected.delete(instructorId);
    } else {
      newSelected.add(instructorId);
    }
    setBulkSelectedInstructors(newSelected);
  };

  // Handle select all for bulk
  const handleBulkSelectAll = () => {
    if (bulkSelectedInstructors.size === filteredAvailableInstructors.length) {
      setBulkSelectedInstructors(new Set());
    } else {
      const allIds = new Set(filteredAvailableInstructors.map(instructor => instructor.user_id));
      setBulkSelectedInstructors(allIds);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    dispatch(fetchCourseInstructors(courseId));
    dispatch(fetchAvailableInstructors({ institutionId, courseId }));
    toast.success("Data refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Instructors</h2>
          <p className="text-gray-600">
            Manage instructors for <span className="font-semibold">{courseName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingInstructors || isLoadingAvailable}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInstructors ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDialog(true)}
              >
                <Users2 className="w-4 h-4 mr-2" />
                Bulk Assign
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="current">
            <Users className="w-4 h-4 mr-2" />
            Current Instructors
            <Badge variant="secondary" className="ml-2">
              {courseInstructors.additional.length + (courseInstructors.primary ? 1 : 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="add">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Instructor
          </TabsTrigger>
          <TabsTrigger value="replace">
            <UserCog className="w-4 h-4 mr-2" />
            Replace Primary
          </TabsTrigger>
        </TabsList>

        {/* Current Instructors Tab */}
        <TabsContent value="current" className="space-y-6">
          {isLoadingInstructors ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Primary Instructor Card */}
              {courseInstructors.primary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Primary Instructor
                    </CardTitle>
                    <CardDescription>
                      The main instructor responsible for this course
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={courseInstructors.primary.profile_picture_url}
                            alt={courseInstructors.primary.first_name}
                          />
                          <AvatarFallback>
                            {courseInstructors.primary.first_name?.[0]}
                            {courseInstructors.primary.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {courseInstructors.primary.first_name} {courseInstructors.primary.last_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {courseInstructors.primary.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-amber-100 text-amber-800">
                              Primary Instructor
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Assigned: {new Date(courseInstructors.primary.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInstructor(courseInstructors.primary);
                            setShowReplaceDialog(true);
                          }}
                        >
                          Replace
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Instructors Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Additional Instructors
                      </CardTitle>
                      <CardDescription>
                        Instructors with specific permissions for this course
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {courseInstructors.additional.length} instructors
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {courseInstructors.additional.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No Additional Instructors
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Add instructors to help manage this course
                      </p>
                      <Button onClick={() => setActiveTab("add")}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Instructor
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {courseInstructors.additional.map((instructor) => (
                        <InstructorCard
                          key={instructor.id}
                          instructor={instructor}
                          isPrimary={false}
                          showActions={canManage}
                          onEdit={() => {
                            setSelectedInstructorForPermissions(instructor);
                            setPermissionsForm({
                              can_grade_assignments: instructor.permissions?.can_grade_assignments ?? true,
                              can_manage_enrollments: instructor.permissions?.can_manage_enrollments ?? false,
                              can_edit_course_content: instructor.permissions?.can_edit_course_content ?? true,
                            });
                            setShowPermissionsDialog(true);
                          }}
                          onRemove={() => handleRemoveInstructor(
                            instructor.id,
                            `${instructor.first_name} ${instructor.last_name}`
                          )}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Add Instructor Tab */}
        <TabsContent value="add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Instructor</CardTitle>
              <CardDescription>
                Select an instructor from your institution and configure their permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label>Search Available Instructors</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Showing {filteredAvailableInstructors.length} available instructors
                </p>
              </div>

              {/* Available Instructors List */}
              <div className="space-y-2">
                <Label>Select Instructor</Label>
                {isLoadingAvailable ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredAvailableInstructors.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No instructors available for assignment</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredAvailableInstructors.map((instructor) => (
                      <div
                        key={instructor.user_id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          newInstructorId === instructor.user_id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => setNewInstructorId(instructor.user_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={instructor.profile_picture_url}
                              alt={instructor.first_name}
                            />
                            <AvatarFallback>
                              {instructor.first_name?.[0]}
                              {instructor.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {instructor.first_name} {instructor.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{instructor.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {instructor.institution_role}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {instructor.courses_taught} courses
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {newInstructorId === instructor.user_id ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions Configuration */}
              <div className="space-y-4">
                <Label>Permissions Configuration</Label>
                <PermissionsConfig
                  value={permissionsForm}
                  onChange={setPermissionsForm}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("current")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddInstructor}
                  disabled={!newInstructorId || isLoadingAvailable}
                >
                  {isLoadingAvailable ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Add Instructor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replace Primary Tab */}
        <TabsContent value="replace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Replace Primary Instructor</CardTitle>
              <CardDescription>
                Assign a new primary instructor for this course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warning Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">Important Notice</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Replacing the primary instructor will change course ownership.
                      The new instructor will have full administrative access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Primary Instructor */}
              {courseInstructors.primary && (
                <div className="space-y-2">
                  <Label>Current Primary Instructor</Label>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={courseInstructors.primary.profile_picture_url}
                          alt={courseInstructors.primary.first_name}
                        />
                        <AvatarFallback>
                          {courseInstructors.primary.first_name?.[0]}
                          {courseInstructors.primary.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {courseInstructors.primary.first_name} {courseInstructors.primary.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {courseInstructors.primary.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New Instructor Selection */}
              <div className="space-y-2">
                <Label htmlFor="new-instructor">New Primary Instructor *</Label>
                <InstructorSelector
                  institutionId={institutionId}
                  excludeIds={courseInstructors.primary ? [courseInstructors.primary.id] : []}
                  value={newPrimaryInstructorId}
                  onChange={(instructorId, instructor) => {
                    setNewPrimaryInstructorId(instructorId);
                  }}
                  placeholder="Select new primary instructor..."
                />
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="keep-additional"
                    checked={keepAsAdditional}
                    onCheckedChange={setKeepAsAdditional}
                  />
                  <Label htmlFor="keep-additional" className="cursor-pointer">
                    Keep current instructor as additional instructor
                  </Label>
                </div>

                {keepAsAdditional && (
                  <div className="pl-6 space-y-4">
                    <Separator />
                    <div>
                      <Label>Permissions for Current Instructor (as Additional)</Label>
                      <PermissionsConfig
                        value={permissionsForm}
                        onChange={setPermissionsForm}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("current")}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReplacePrimaryInstructor}
                  disabled={!newPrimaryInstructorId}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Replace Primary Instructor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS ==================== */}

      {/* Add Instructor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Instructor</DialogTitle>
            <DialogDescription>
              Assign a new instructor to this course
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructor-select">Select Instructor</Label>
              <InstructorSelector
                institutionId={institutionId}
                excludeIds={[
                  ...(courseInstructors.primary ? [courseInstructors.primary.id] : []),
                  ...courseInstructors.additional.map(i => i.id)
                ]}
                value={newInstructorId}
                onChange={(instructorId, instructor) => {
                  setNewInstructorId(instructorId);
                }}
                placeholder="Search and select instructor..."
              />
            </div>
            <div className="space-y-4">
              <Label>Permissions</Label>
              <PermissionsConfig
                value={permissionsForm}
                onChange={setPermissionsForm}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInstructor} disabled={!newInstructorId}>
              Add Instructor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Primary Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Replace Primary Instructor</DialogTitle>
            <DialogDescription>
              This action will change course ownership to the new instructor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Replacing the primary instructor is a significant change.
                    The new instructor will gain full control over this course.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Primary Instructor</Label>
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedInstructor?.profile_picture_url}
                      alt={selectedInstructor?.first_name}
                    />
                    <AvatarFallback>
                      {selectedInstructor?.first_name?.[0]}
                      {selectedInstructor?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedInstructor?.first_name} {selectedInstructor?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedInstructor?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-primary">New Primary Instructor *</Label>
              <InstructorSelector
                institutionId={institutionId}
                excludeIds={[selectedInstructor?.id]}
                value={newPrimaryInstructorId}
                onChange={(instructorId, instructor) => {
                  setNewPrimaryInstructorId(instructorId);
                }}
                placeholder="Select new primary instructor..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="keep-old"
                checked={keepAsAdditional}
                onCheckedChange={setKeepAsAdditional}
              />
              <Label htmlFor="keep-old" className="cursor-pointer">
                Keep current instructor as additional instructor
              </Label>
            </div>

            {keepAsAdditional && (
              <div className="space-y-4 pl-6">
                <Separator />
                <div>
                  <Label>Permissions for Current Instructor</Label>
                  <PermissionsConfig
                    value={permissionsForm}
                    onChange={setPermissionsForm}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReplacePrimaryInstructor}
              disabled={!newPrimaryInstructorId}
            >
              Replace Instructor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Instructor Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedInstructorForPermissions?.first_name}{" "}
              {selectedInstructorForPermissions?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <PermissionsConfig
              value={permissionsForm}
              onChange={setPermissionsForm}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Assign Instructors</DialogTitle>
            <DialogDescription>
              Select multiple instructors to assign to this course with the same permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 py-1">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label>Search Instructors</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="select-all"
                    checked={bulkSelectedInstructors.size === filteredAvailableInstructors.length}
                    onCheckedChange={handleBulkSelectAll}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    Select All ({filteredAvailableInstructors.length} instructors)
                  </Label>
                </div>
                <Badge>
                  {bulkSelectedInstructors.size} selected
                </Badge>
              </div>

              {/* Instructors List */}
              <div className="border rounded-lg overflow-y-auto flex-1 min-h-[200px]">
                {filteredAvailableInstructors.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No instructors available</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAvailableInstructors.map((instructor) => (
                      <div
                        key={instructor.user_id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50"
                      >
                        <Switch
                          checked={bulkSelectedInstructors.has(instructor.user_id)}
                          onCheckedChange={() => handleBulkSelectToggle(instructor.user_id)}
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={instructor.profile_picture_url}
                            alt={instructor.first_name}
                          />
                          <AvatarFallback>
                            {instructor.first_name?.[0]}
                            {instructor.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{instructor.email}</p>
                        </div>
                        <Badge variant="outline">
                          {instructor.institution_role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div className="space-y-4 pt-4">
                <Label>Permissions for Selected Instructors</Label>
                <PermissionsConfig
                  value={bulkPermissions}
                  onChange={setBulkPermissions}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssignInstructors}
              disabled={bulkSelectedInstructors.size === 0}
            >
              <Users2 className="w-4 h-4 mr-2" />
              Assign {bulkSelectedInstructors.size} Instructors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}