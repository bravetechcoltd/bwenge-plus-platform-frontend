"use client";

import { Award, Edit, FileText, Shield, Trash2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstructorDetail } from "@/lib/features/courseInstructors/courseInstructorSlice";

interface InstructorCardProps {
  instructor: InstructorDetail;
  isPrimary: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
  showActions: boolean;
}

export function InstructorCard({
  instructor,
  isPrimary,
  onEdit,
  onRemove,
  onReplace,
  showActions,
}: InstructorCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage
                src={instructor.profile_picture_url}
                alt={instructor.first_name}
              />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {instructor.first_name?.[0]}
                {instructor.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">
                  {instructor.first_name} {instructor.last_name}
                </h3>
                {isPrimary && (
                  <Badge className="bg-amber-100 text-amber-800">
                    <Award className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-500 truncate mb-2">
                {instructor.email}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge variant="outline" className="text-xs">
                  Instructor
                </Badge>
                <span className="text-xs text-gray-500">
                  Assigned: {new Date(instructor.assigned_at).toLocaleDateString()}
                </span>
              </div>
              
              {/* Permission Indicators */}
              {instructor.permissions && (
                <div className="flex items-center gap-3">
                  {instructor.permissions.can_grade_assignments && (
                    <div className="flex items-center gap-1" title="Can grade assignments">
                      <FileText className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-600">Grade</span>
                    </div>
                  )}
                  
                  {instructor.permissions.can_manage_enrollments && (
                    <div className="flex items-center gap-1" title="Can manage enrollments">
                      <Users className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-gray-600">Enrollments</span>
                    </div>
                  )}
                  
                  {instructor.permissions.can_edit_course_content && (
                    <div className="flex items-center gap-1" title="Can edit course content">
                      <Edit className="w-3 h-3 text-purple-600" />
                      <span className="text-xs text-gray-600">Content</span>
                    </div>
                  )}
                  
                  {!instructor.permissions.can_grade_assignments &&
                   !instructor.permissions.can_manage_enrollments &&
                   !instructor.permissions.can_edit_course_content && (
                    <span className="text-xs text-gray-500">No permissions</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {showActions && !isPrimary && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <Edit className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Permissions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={onRemove}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from Course
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {showActions && isPrimary && onReplace && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReplace}
            >
              Replace
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}