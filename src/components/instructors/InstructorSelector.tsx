// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchAvailableInstructors, selectAvailableInstructors, selectIsLoadingAvailable } from "@/lib/features/courseInstructors/courseInstructorSlice";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InstructorSelectorProps {
  institutionId: string;
  excludeIds?: string[];
  value: string | null;
  onChange: (instructorId: string, instructor: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InstructorSelector({
  institutionId,
  excludeIds = [],
  value,
  onChange,
  placeholder = "Select instructor...",
  disabled = false,
}: InstructorSelectorProps) {
  const dispatch = useAppDispatch();
  const availableInstructors = useAppSelector(selectAvailableInstructors);
  const isLoading = useAppSelector(selectIsLoadingAvailable);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter instructors based on excludeIds
  const filteredInstructors = availableInstructors.filter(
    instructor => !excludeIds.includes(instructor.user_id)
  );

  // Find selected instructor
  const selectedInstructor = filteredInstructors.find(
    instructor => instructor.user_id === value
  );

  useEffect(() => {
    if (open && institutionId) {
      dispatch(fetchAvailableInstructors({ institutionId, search }));
    }
  }, [dispatch, institutionId, open, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedInstructor ? (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage
                  src={selectedInstructor.profile_picture_url}
                  alt={selectedInstructor.first_name}
                />
                <AvatarFallback>
                  {selectedInstructor.first_name?.[0]}
                  {selectedInstructor.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span>
                {selectedInstructor.first_name} {selectedInstructor.last_name}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedInstructor.institution_role}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search instructors..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            ) : filteredInstructors.length === 0 ? (
              <CommandEmpty>No instructors found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredInstructors.map((instructor) => (
                  <CommandItem
                    key={instructor.user_id}
                    value={instructor.user_id}
                    onSelect={() => {
                      onChange(instructor.user_id, instructor);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {instructor.first_name} {instructor.last_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {instructor.institution_role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {instructor.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instructor.courses_tached} courses taught
                        </p>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === instructor.user_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}