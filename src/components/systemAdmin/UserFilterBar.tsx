// @ts-nocheck
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UserFilterBarProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

const roleOptions = [
  { value: "SYSTEM_ADMIN", label: "System Admin" },
  { value: "INSTITUTION_ADMIN", label: "Institution Admin" },
  { value: "CONTENT_CREATOR", label: "Content Creator" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "LEARNER", label: "Learner" },
];

const institutionRoleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "CONTENT_CREATOR", label: "Content Creator" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "MEMBER", label: "Member" },
];

const accountTypeOptions = [
  { value: "Student", label: "Student" },
  { value: "Researcher", label: "Researcher" },
  { value: "Diaspora", label: "Diaspora" },
  { value: "Institution", label: "Institution" },
  { value: "admin", label: "Admin" },
];

const sortOptions = [
  { value: "created_at", label: "Date Joined" },
  { value: "email", label: "Email" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "last_login", label: "Last Login" },
];

export default function UserFilterBar({
  filters,
  onFilterChange,
  onClearFilters,
}: UserFilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sort_by' || key === 'sort_order' || key === 'search') return false;
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  // Handle input changes
  const handleInputChange = (key: string, value: any) => {
    onFilterChange({ [key]: value });
  };
  
  // Remove specific filter
  const removeFilter = (key: string) => {
    onFilterChange({ [key]: key === 'search' ? '' : null });
  };
  
  // Get active filters for display
  const getActiveFilters = () => {
    const active: { key: string; label: string; value: string }[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'sort_by' && key !== 'sort_order') {
        let label = key.replace(/_/g, ' ');
        let displayValue = value;
        
        switch (key) {
          case 'bwenge_role':
            label = 'Role';
            displayValue = roleOptions.find(r => r.value === value)?.label || value;
            break;
          case 'institution_role':
            label = 'Institution Role';
            displayValue = institutionRoleOptions.find(r => r.value === value)?.label || value;
            break;
          case 'account_type':
            label = 'Account Type';
            displayValue = accountTypeOptions.find(t => t.value === value)?.label || value;
            break;
          case 'is_institution_member':
            label = 'Institution Member';
            displayValue = value === 'true' ? 'Yes' : 'No';
            break;
          case 'is_active':
            label = 'Active';
            displayValue = value === 'true' ? 'Yes' : 'No';
            break;
          case 'is_verified':
            label = 'Verified';
            displayValue = value === 'true' ? 'Yes' : 'No';
            break;
        }
        
        active.push({ key, label, value: displayValue });
      }
    });
    
    return active;
  };
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or username..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
            {isAdvancedOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={onClearFilters}>
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      {/* Active Filters Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {getActiveFilters().map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <span className="font-medium">{filter.label}:</span>
              <span>{filter.value}</span>
              <button
                onClick={() => removeFilter(filter.key)}
                className="ml-1 hover:bg-secondary rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Role Filter */}
            <div className="space-y-2">
              <Label htmlFor="bwenge_role">BwengePlus Role</Label>
              <Select
                value={filters.bwenge_role || ''}
                onValueChange={(value) => handleInputChange('bwenge_role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Institution Role Filter */}
            <div className="space-y-2">
              <Label htmlFor="institution_role">Institution Role</Label>
              <Select
                value={filters.institution_role || ''}
                onValueChange={(value) => handleInputChange('institution_role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All institution roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All institution roles</SelectItem>
                  {institutionRoleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Account Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Select
                value={filters.account_type || ''}
                onValueChange={(value) => handleInputChange('account_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All account types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All account types</SelectItem>
                  {accountTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort Options */}
            <div className="space-y-2">
              <Label htmlFor="sort_by">Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={filters.sort_by}
                  onValueChange={(value) => handleInputChange('sort_by', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sort_order}
                  onValueChange={(value) => handleInputChange('sort_order', value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">ASC</SelectItem>
                    <SelectItem value="DESC">DESC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_institution_member">Institution Member</Label>
                <Select
                  value={filters.is_institution_member || ''}
                  onValueChange={(value) => handleInputChange('is_institution_member', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active Status</Label>
                <Select
                  value={filters.is_active || ''}
                  onValueChange={(value) => handleInputChange('is_active', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_verified">Verification Status</Label>
                <Select
                  value={filters.is_verified || ''}
                  onValueChange={(value) => handleInputChange('is_verified', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Institution Filter */}
          <div className="space-y-2">
            <Label htmlFor="institution_id">Institution</Label>
            <Select
              value={filters.institution_id || ''}
              onValueChange={(value) => handleInputChange('institution_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by institution..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All institutions</SelectItem>
                <SelectItem value="inst-1">University of Rwanda</SelectItem>
                <SelectItem value="inst-2">Rwanda Polytechnic</SelectItem>
                <SelectItem value="inst-3">AIMS Rwanda</SelectItem>
                <SelectItem value="inst-4">Carnegie Mellon Africa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}