"use client";

import { FileText, Users, Edit, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface PermissionsConfigProps {
  value: {
    can_grade_assignments: boolean;
    can_manage_enrollments: boolean;
    can_edit_course_content: boolean;
  };
  onChange: (permissions: {
    can_grade_assignments: boolean;
    can_manage_enrollments: boolean;
    can_edit_course_content: boolean;
  }) => void;
  disabled?: boolean;
}

export function PermissionsConfig({
  value,
  onChange,
  disabled = false,
}: PermissionsConfigProps) {
  const handleChange = (key: keyof typeof value, checked: boolean) => {
    onChange({
      ...value,
      [key]: checked,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Grade Assignments Permission */}
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="grade-assignments" className="font-medium cursor-pointer">
                  Grade Assignments
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Allows instructor to grade student assignments and quizzes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-gray-500">
                Evaluate and score student submissions
              </p>
            </div>
          </div>
          <Switch
            id="grade-assignments"
            checked={value.can_grade_assignments}
            onCheckedChange={(checked) => handleChange("can_grade_assignments", checked)}
            disabled={disabled}
          />
        </div>

        {/* Manage Enrollments Permission */}
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="manage-enrollments" className="font-medium cursor-pointer">
                  Manage Enrollments
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Allows instructor to approve/reject student enrollments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-gray-500">
                Approve student requests and manage course roster
              </p>
            </div>
          </div>
          <Switch
            id="manage-enrollments"
            checked={value.can_manage_enrollments}
            onCheckedChange={(checked) => handleChange("can_manage_enrollments", checked)}
            disabled={disabled}
          />
        </div>

        {/* Edit Course Content Permission */}
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Edit className="w-4 h-4 text-purple-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-content" className="font-medium cursor-pointer">
                  Edit Course Content
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Allows instructor to modify course materials, lessons, and structure</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-gray-500">
                Update lessons, modules, and course materials
              </p>
            </div>
          </div>
          <Switch
            id="edit-content"
            checked={value.can_edit_course_content}
            onCheckedChange={(checked) => handleChange("can_edit_course_content", checked)}
            disabled={disabled}
          />
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <div className="space-y-2">
        <h4 className="font-medium">Permission Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">Current permissions:</span>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {value.can_grade_assignments && (
              <li>Can grade student assignments and assessments</li>
            )}
            {value.can_manage_enrollments && (
              <li>Can manage student enrollments and roster</li>
            )}
            {value.can_edit_course_content && (
              <li>Can edit course content and structure</li>
            )}
            {!value.can_grade_assignments &&
             !value.can_manage_enrollments &&
             !value.can_edit_course_content && (
              <li className="text-gray-400">No permissions assigned</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}