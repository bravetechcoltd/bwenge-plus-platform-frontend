
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, Edit, GraduationCap, User, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RoleSelectorProps {
  value: string;
  onChange: (role: string) => void;
  showDescriptions?: boolean;
  disabled?: boolean;
}

const roleOptions = [
  {
    value: "SYSTEM_ADMIN",
    label: "System Administrator",
    icon: Shield,
    color: "text-red-600 bg-red-50",
    description: "Full system access, can manage all users and institutions",
    warning: "This role has complete control over the entire platform",
  },
  {
    value: "INSTITUTION_ADMIN",
    label: "Institution Administrator",
    icon: Building2,
    color: "text-purple-600 bg-purple-50",
    description: "Manages institution, can create SPOC courses",
    requirement: "Must be assigned to an institution",
  },
  {
    value: "CONTENT_CREATOR",
    label: "Content Creator",
    icon: Edit,
    color: "text-blue-600 bg-blue-50",
    description: "Can create and manage course content",
    recommendation: "Recommended to assign to an institution",
  },
  {
    value: "INSTRUCTOR",
    label: "Instructor",
    icon: GraduationCap,
    color: "text-green-600 bg-green-50",
    description: "Teaches courses, manages enrollments",
    recommendation: "Recommended to assign to an institution",
  },
  {
    value: "LEARNER",
    label: "Learner",
    icon: User,
    color: "text-gray-600 bg-gray-50",
    description: "Enrolls in courses, takes lessons",
  },
];

export default function RoleSelector({
  value,
  onChange,
  showDescriptions = false,
  disabled = false,
}: RoleSelectorProps) {
  const selectedRole = roleOptions.find(role => role.value === value);
  
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedRole ? (
              <div className="flex items-center gap-2">
                <selectedRole.icon className="w-4 h-4" />
                <span>{selectedRole.label}</span>
                <Badge className={`text-xs ${selectedRole.color}`}>
                  {selectedRole.value.replace(/_/g, ' ')}
                </Badge>
              </div>
            ) : (
              "Select a role"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((role) => (
            <SelectItem key={role.value} value={role.value} className="py-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <role.icon className="w-4 h-4" />
                  <span className="font-medium">{role.label}</span>
                  <Badge className={`text-xs ${role.color}`}>
                    {role.value.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {showDescriptions && (
                  <p className="text-xs text-gray-500 mt-1">
                    {role.description}
                  </p>
                )}
                {role.warning && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{role.warning}</span>
                  </div>
                )}
                {role.requirement && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{role.requirement}</span>
                  </div>
                )}
                {role.recommendation && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{role.recommendation}</span>
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showDescriptions && selectedRole && (
        <div className="p-3 border rounded-lg bg-gray-50">
          <div className="flex items-start gap-2">
            <div className={`p-1 rounded ${selectedRole.color}`}>
              <selectedRole.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{selectedRole.label}</h4>
                <Badge className={`text-xs ${selectedRole.color}`}>
                  {selectedRole.value.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {selectedRole.description}
              </p>
              {selectedRole.warning && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedRole.warning}</span>
                </div>
              )}
              {selectedRole.requirement && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedRole.requirement}</span>
                </div>
              )}
              {selectedRole.recommendation && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedRole.recommendation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}