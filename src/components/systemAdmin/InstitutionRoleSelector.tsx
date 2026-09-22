"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Edit, GraduationCap, User, AlertCircle, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InstitutionRoleSelectorProps {
  value: string | null;
  onChange: (role: string | null) => void;
  disabled?: boolean;
  bwengeRole?: string;
}

const institutionRoleOptions = [
  {
    value: "ADMIN",
    label: "Administrator",
    icon: Shield,
    color: "text-primary bg-primary/10",
    description: "Full administrative access to the institution",
    compatibleWith: ["SYSTEM_ADMIN", "INSTITUTION_ADMIN"],
  },
  {
    value: "CONTENT_CREATOR",
    label: "Content Creator",
    icon: Edit,
    color: "text-primary bg-primary/10",
    description: "Can create and manage course content",
    compatibleWith: ["SYSTEM_ADMIN", "INSTITUTION_ADMIN", "CONTENT_CREATOR", "INSTRUCTOR"],
  },
  {
    value: "INSTRUCTOR",
    label: "Instructor",
    icon: GraduationCap,
    color: "text-success bg-success/10",
    description: "Teaches courses, manages enrollments",
    compatibleWith: ["SYSTEM_ADMIN", "INSTITUTION_ADMIN", "CONTENT_CREATOR", "INSTRUCTOR"],
  },
  {
    value: "MEMBER",
    label: "Member",
    icon: User,
    color: "text-muted-foreground bg-muted/50",
    description: "Basic access to institution resources",
    compatibleWith: ["SYSTEM_ADMIN", "INSTITUTION_ADMIN", "CONTENT_CREATOR", "INSTRUCTOR", "LEARNER"],
  },
];

export default function InstitutionRoleSelector({
  value,
  onChange,
  disabled = false,
  bwengeRole,
}: InstitutionRoleSelectorProps) {
  const selectedRole = institutionRoleOptions.find(role => role.value === value);
  
  // Determine compatible roles based on bwengeRole
  const compatibleRoles = bwengeRole 
    ? institutionRoleOptions.filter(role => 
        role.compatibleWith.includes(bwengeRole)
      )
    : institutionRoleOptions;
  
  // Check if current value is compatible with bwengeRole
  const isCurrentValueCompatible = value ? 
    compatibleRoles.some(role => role.value === value) : true;
  
  // Get role suggestions based on bwengeRole
  const getSuggestedRole = () => {
    if (!bwengeRole) return null;
    
    switch (bwengeRole) {
      case "SYSTEM_ADMIN":
        return "ADMIN";
      case "INSTITUTION_ADMIN":
        return "ADMIN";
      case "CONTENT_CREATOR":
        return "CONTENT_CREATOR";
      case "INSTRUCTOR":
        return "INSTRUCTOR";
      case "LEARNER":
        return "MEMBER";
      default:
        return "MEMBER";
    }
  };
  
  const suggestedRole = getSuggestedRole();
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Institution Role</label>
        {suggestedRole && !value && (
          <button
            type="button"
            onClick={() => onChange(suggestedRole)}
            className="text-xs text-primary hover:text-primary"
          >
            Use suggested role
          </button>
        )}
      </div>
      
      <Select
        value={value || ""}
        onValueChange={(value) => onChange(value || null)}
        disabled={disabled}
      >
        <SelectTrigger className={`w-full ${!isCurrentValueCompatible ? 'border-warning/40' : ''}`}>
          <SelectValue>
            {selectedRole ? (
              <div className="flex items-center gap-2">
                <selectedRole.icon className="w-4 h-4" />
                <span>{selectedRole.label}</span>
                <Badge className={`text-xs ${selectedRole.color}`}>
                  {selectedRole.value}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>Select institution role</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None (Not assigned to institution)</SelectItem>
          {compatibleRoles.map((role) => (
            <SelectItem key={role.value} value={role.value} className="py-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <role.icon className="w-4 h-4" />
                  <span className="font-medium">{role.label}</span>
                  <Badge className={`text-xs ${role.color}`}>
                    {role.value}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {role.description}
                </p>
              </div>
            </SelectItem>
          ))}
          
          {/* Show incompatible roles as disabled */}
          {bwengeRole && institutionRoleOptions
            .filter(role => !role.compatibleWith.includes(bwengeRole))
            .map((role) => (
              <div
                key={role.value}
                className="px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <role.icon className="w-4 h-4" />
                    <span className="font-medium">{role.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {role.value}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-warning mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Incompatible with {bwengeRole.replace(/_/g, ' ')} role</span>
                  </div>
                </div>
              </div>
            ))}
        </SelectContent>
      </Select>
      
      {/* Warnings and suggestions */}
      {bwengeRole && !isCurrentValueCompatible && value && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">
                Incompatible Role Assignment
              </p>
              <p className="text-xs text-warning mt-1">
                {value} is not typically assigned to users with {bwengeRole.replace(/_/g, ' ')} role.
                {suggestedRole && (
                  <>
                    {" "}
                    Suggested role: <span className="font-medium">{suggestedRole}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {bwengeRole && suggestedRole && !value && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">
                Suggested Role
              </p>
              <p className="text-xs text-primary mt-1">
                Based on the user's BwengePlus role ({bwengeRole.replace(/_/g, ' ')}), 
                we suggest assigning them as <span className="font-medium">{suggestedRole}</span> in the institution.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Role compatibility info */}
      {bwengeRole && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">Compatible roles for {bwengeRole.replace(/_/g, ' ')}:</span>
            {" "}
            {compatibleRoles.map(r => r.label).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}