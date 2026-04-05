"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

export interface FilterConfig {
  key: string;
  label: string;
  type: 'search' | 'select' | 'multi-select';
  placeholder?: string;
  options?: Array<{
    value: string;
    label: string;
    count?: number;
  }>;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onClear: () => void;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  className,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleSearch = (value: string) => {
    onChange({ ...values, search: value });
  };

  const clearFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  const hasActiveFilters = Object.keys(values).some(key => {
    const value = values[key];
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <div className={className}>
      {/* Main Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Search Input */}
        {filters.find(f => f.type === 'search') && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={values.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {Object.keys(values).filter(k => values[k]).length}
            </Badge>
          )}
        </Button>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters
              .filter(f => f.type !== 'search')
              .map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {filter.label}
                  </label>
                  {filter.type === 'select' && (
                    <Select
                      value={values[filter.key] || ''}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            {option.count !== undefined && (
                              <span className="ml-2 text-muted-foreground">
                                ({option.count})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(values)
            .filter(([key, value]) => value && value !== '')
            .map(([key, value]) => {
              const filter = filters.find(f => f.key === key);
              if (!filter) return null;

              let displayValue = value;
              if (filter.type === 'select' && filter.options) {
                const option = filter.options.find(opt => opt.value === value);
                displayValue = option?.label || value;
              }

              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span>{displayValue}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => clearFilter(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
        </div>
      )}
    </div>
  );
}