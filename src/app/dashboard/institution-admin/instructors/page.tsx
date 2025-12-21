"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  BookOpen,
  UserPlus,
  Plus,
  Loader2,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface InstitutionInstructor {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  institution_role: string;
  courses_count: number;
  joined_at: string;
  is_active: boolean;
}

export default function InstitutionInstructorsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  const [instructors, setInstructors] = useState<InstitutionInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstitutionInstructor | null>(null);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institution-admin/${user?.primary_institution_id}/instructors`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("bwengeplus_token")}`,
          },
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setInstructors(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch instructors:", error);
      toast.error("Failed to load instructors");
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(instructor => {
    const matchesSearch = 
      instructor.first_name.toLowerCase().includes(search.toLowerCase()) ||
      instructor.last_name.toLowerCase().includes(search.toLowerCase()) ||
      instructor.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = filterRole === "all" || instructor.institution_role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const handleAddInstructor = async (email: string, role: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${user?.primary_institution_id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("bwengeplus_token")}`,
          },
          body: JSON.stringify({
            email,
            role,
            send_invitation: true,
          }),
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success("Instructor added successfully");
        setShowAddDialog(false);
        fetchInstructors();
      } else {
        toast.error(data.message || "Failed to add instructor");
      }
    } catch (error) {
      toast.error("Failed to add instructor");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Instructors</h1>
        <p className="text-gray-600">
          Manage all instructors in your institution
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Institution Instructors</CardTitle>
              <CardDescription>
                {filteredInstructors.length} instructors found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search instructors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full md:w-64"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructors</SelectItem>
                  <SelectItem value="CONTENT_CREATOR">Content Creators</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInstructors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Instructors Found
              </h3>
              <p className="text-gray-500 mb-4">
                {search || filterRole !== "all" 
                  ? "Try different search criteria" 
                  : "Add your first instructor to get started"}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Instructor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstructors.map((instructor) => (
                    <TableRow key={instructor.id}>
                      <TableCell>
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
                            <p className="text-sm text-gray-500">
                              {instructor.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          instructor.institution_role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                          instructor.institution_role === "INSTRUCTOR" ? "bg-green-100 text-green-700" :
                          "bg-blue-100 text-blue-700"
                        }>
                          {instructor.institution_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span>{instructor.courses_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {instructor.is_active ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(instructor.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedInstructor(instructor)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              Assign to Course
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Instructors</p>
                <p className="text-2xl font-bold">
                  {instructors.filter(i => i.institution_role === "INSTRUCTOR").length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Instructors</p>
                <p className="text-2xl font-bold">
                  {instructors.filter(i => i.is_active).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Courses</p>
                <p className="text-2xl font-bold">
                  {instructors.reduce((sum, i) => sum + i.courses_count, 0)}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="text-2xl font-bold">
                  {instructors.filter(i => i.institution_role === "ADMIN").length}
                </p>
              </div>
              <Users className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Instructor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Instructor</DialogTitle>
            <DialogDescription>
              Invite a new instructor to join your institution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="instructor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select defaultValue="INSTRUCTOR">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddInstructor("test@example.com", "INSTRUCTOR")}>
              Add Instructor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructor Details Dialog */}
      {selectedInstructor && (
        <Dialog open={!!selectedInstructor} onOpenChange={() => setSelectedInstructor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Instructor Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={selectedInstructor.profile_picture_url}
                    alt={selectedInstructor.first_name}
                  />
                  <AvatarFallback>
                    {selectedInstructor.first_name?.[0]}
                    {selectedInstructor.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedInstructor.first_name} {selectedInstructor.last_name}
                  </h3>
                  <p className="text-gray-500">{selectedInstructor.email}</p>
                  <Badge className={
                    selectedInstructor.institution_role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    selectedInstructor.institution_role === "INSTRUCTOR" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }>
                    {selectedInstructor.institution_role}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Courses Teaching</Label>
                  <p className="font-medium">{selectedInstructor.courses_count}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p>
                    {selectedInstructor.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Joined Date</Label>
                  <p>{new Date(selectedInstructor.joined_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Member Since</Label>
                  <p>{Math.floor((new Date().getTime() - new Date(selectedInstructor.joined_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} months</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInstructor(null)}>
                Close
              </Button>
              <Button>Edit Instructor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}