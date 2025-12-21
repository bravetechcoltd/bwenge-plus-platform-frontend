// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { 
  fetchSystemUsers, 
  fetchUserStatistics,
  setFilters,
  resetFilters,
  selectSystemUsers,
  selectIsLoadingUsers,
  selectUsersPagination,
  selectUserFilters,
  selectUserStatistics,
  createUser,
  selectIsCreating  
} from "@/lib/features/systemAdmin/userManagementSlice";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Building2,
  Shield,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import UserFormDialog from "@/components/systemAdmin/UserFormDialog";
import UserDetailModal from "@/components/systemAdmin/UserDetailModal";
import UserDeleteDialog from "@/components/systemAdmin/UserDeleteDialog";
import UserFilterBar from "@/components/systemAdmin/UserFilterBar";
import { toast } from "sonner";

export default function SystemAdminUsersPage() {
  const dispatch = useAppDispatch();
  
  const users = useAppSelector(selectSystemUsers);
  const isLoading = useAppSelector(selectIsLoadingUsers);
  const pagination = useAppSelector(selectUsersPagination);
  const filters = useAppSelector(selectUserFilters);
  const statistics = useAppSelector(selectUserStatistics);
  const [isCreating, setIsCreating] = useState(false); 
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeSystemTab, setActiveSystemTab] = useState<'all' | 'bwengeplus' | 'ongera'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToView, setUserToView] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filter users by system
  const filteredUsers = users.filter(user => {
    if (activeSystemTab === 'all') return true;
    const userSystem = user.isforwhich_system?.toLowerCase();
    return userSystem === activeSystemTab;
  });

  // Calculate system-specific statistics
  const bwengePlusUsers = users.filter(u => u.isforwhich_system?.toLowerCase() === 'bwengeplus');
  const ongeraUsers = users.filter(u => u.isforwhich_system?.toLowerCase() === 'ongera');
  
  // Fetch data on mount and when filters change
  useEffect(() => {
    dispatch(fetchSystemUsers({
      page: currentPage,
      limit: itemsPerPage,
      filters
    }));
    
    dispatch(fetchUserStatistics());
  }, [dispatch, currentPage, itemsPerPage, filters]);
  
  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    dispatch(setFilters(newFilters));
    setCurrentPage(1);
  };
  
  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleCreateUser = async (userData: any) => {
    try {
      setIsCreating(true); 
      await dispatch(createUser(userData)).unwrap();
      toast.success("User created successfully!");
      setShowCreateDialog(false);
    } catch (error: any) {
      toast.error(error || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };
   
  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || (pagination && page > pagination.totalPages)) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle refresh
  const handleRefresh = () => {
    dispatch(fetchSystemUsers({
      page: currentPage,
      limit: itemsPerPage,
      filters
    }));
    dispatch(fetchUserStatistics());
  };
  
  // Format date - NULL SAFE
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Get role badge color - NULL SAFE
  const getRoleColor = (role: string | null | undefined) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
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
  
  // Format role text - NULL SAFE
  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'No Role';
    return role.replace(/_/g, ' ');
  };
  
  // Get status badge - NULL SAFE
  const getStatusBadge = (user: any) => {
    if (!user.is_active) {
      return <Badge variant="destructive" className="text-xs">Inactive</Badge>;
    }
    if (!user.is_verified) {
      return <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">Unverified</Badge>;
    }
    return <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">Active</Badge>;
  };
  
  // Get user initials - NULL SAFE
  const getUserInitials = (firstName: string | null | undefined, lastName: string | null | undefined) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return first + last || 'U';
  };
  
  // Get full name - NULL SAFE
  const getFullName = (firstName: string | null | undefined, lastName: string | null | undefined) => {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown User';
  };

  // Check if user is from Ongera system
  const isOngeraUser = (user: any) => {
    return user.isforwhich_system?.toLowerCase() === 'ongera';
  };
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage all users, roles, and permissions across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>
      
      {/* Compact Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Users */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSystemTab('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_users}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* BwengePlus Users */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSystemTab('bwengeplus')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">BwengePlus</p>
                  <p className="text-2xl font-bold text-purple-600">{bwengePlusUsers.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* Ongera Users */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSystemTab('ongera')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Ongera</p>
                  <p className="text-2xl font-bold text-green-600">{ongeraUsers.length}</p>
                </div>
                <Shield className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleFilterChange({ is_active: true })}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.active_users}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* Verified Users */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleFilterChange({ is_verified: true })}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Verified</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.verified_users}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Signups */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Recent (30d)</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.recent_signups}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* System Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeSystemTab} onValueChange={(v) => setActiveSystemTab(v as any)} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all" className="text-sm">
                  All Users ({users.length})
                </TabsTrigger>
                <TabsTrigger value="bwengeplus" className="text-sm">
                  BwengePlus ({bwengePlusUsers.length})
                </TabsTrigger>
                <TabsTrigger value="ongera" className="text-sm">
                  Ongera ({ongeraUsers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="mb-4">
            <UserFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={() => dispatch(resetFilters())}
            />
          </div>

          {/* Users Display */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">User</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">System</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">Role</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">Institutions</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">Joined</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-2"><Skeleton className="w-4 h-4" /></td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="w-32 h-4" />
                              <Skeleton className="w-24 h-3" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2"><Skeleton className="w-16 h-6" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-20 h-6" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-16 h-6" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-8 h-4" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-3 px-2"><Skeleton className="w-24 h-8" /></td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No users found</p>
                        <p className="text-sm mt-1">
                          {activeSystemTab !== 'all' ? `No ${activeSystemTab} users found` : 'Try adjusting your filters'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleUserSelect(user.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.profile_picture_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(user.first_name, user.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {getFullName(user.first_name, user.last_name)}
                              </div>
                    
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={`text-xs ${
                            user.isforwhich_system?.toLowerCase() === 'bwengeplus' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {user.isforwhich_system || 'N/A'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={`${getRoleColor(user.bwenge_role)} text-xs`}>
                            {formatRole(user.bwenge_role)}
                          </Badge>
              
                        </td>

                        <td className="py-3 px-2">
                          {getStatusBadge(user)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              {user.institutions?.length || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs text-gray-600">
                          {formatDate(user.date_joined)}
                        </td>
                        <td className="py-3 px-2">
                          {isOngeraUser(user) ? (
                            // Ongera users - View only
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setUserToView(user);
                                setShowDetailsModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          ) : (
                            // BwengePlus users - Full actions
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setUserToView(user);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setUserToView(user);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    setUserToView(user);
                                    setShowDetailsModal(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <Skeleton className="w-12 h-12 rounded-full mx-auto" />
                        <Skeleton className="w-32 h-4 mx-auto" />
                        <Skeleton className="w-24 h-3 mx-auto" />
                        <Skeleton className="w-20 h-6 mx-auto" />
                        <Skeleton className="w-full h-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500">No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={user.profile_picture_url || undefined} />
                          <AvatarFallback>
                            {getUserInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-sm">
                            {getFullName(user.first_name, user.last_name)}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email || 'No email'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Badge variant="outline" className={`text-xs ${
                            user.isforwhich_system?.toLowerCase() === 'bwengeplus' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {user.isforwhich_system}
                          </Badge>
                          <Badge className={`${getRoleColor(user.bwenge_role)} text-xs`}>
                            {formatRole(user.bwenge_role)}
                          </Badge>
                          {getStatusBadge(user)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Building2 className="w-3 h-3" />
                          <span>{user.institutions?.length || 0} institutions</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Joined {formatDate(user.date_joined)}
                        </div>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setUserToView(user);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {!isOngeraUser(user) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, pagination.total)}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* User Form Dialog */}
      <UserFormDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        mode="create"
        onSubmit={handleCreateUser}
        isSubmitting={isCreating}
      />

      {/* User Details Modal */}
      {userToView && (
        <UserDetailModal
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setUserToView(null);
          }}
          userId={userToView.id}
        />
      )}
      
      {/* Delete User Dialog */}
      {userToDelete && (
        <UserDeleteDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setUserToDelete(null);
          }}
          user={userToDelete}
          onConfirm={(options) => {
            console.log('Delete user with options:', options);
            setShowDeleteDialog(false);
            setUserToDelete(null);
          }}
          isDeleting={false}
        />
      )}
    </div>
  );
}