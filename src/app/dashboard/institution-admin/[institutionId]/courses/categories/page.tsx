"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchInstitutionCategories,
  createInstitutionCategory,
  updateInstitutionCategory,
  deleteInstitutionCategory,
  toggleCategoryStatus,
  reorderInstitutionCategories,
  clearCategoriesError,
  clearCategoryOperationSuccess,
  setInstitutionCategories,
  CourseCategory,
  CategoryFilters,
} from "@/lib/features/institutions/institutionSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  GripVertical,
  BookOpen,
  CheckCircle,
  XCircle,
  Layers,
  Grid3x3,
  List,
  FolderOpen,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  FolderPlus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==================== COMPONENTS ====================

interface SortableCategoryItemProps {
  category: CourseCategory;
  onEdit: (category: CourseCategory) => void;
  onDelete: (category: CourseCategory) => void;
  onToggleStatus: (categoryId: string) => void;
  viewMode: "list" | "grid" | "tree";
}

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
  onToggleStatus,
  viewMode,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (viewMode === "grid") {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`relative ${isDragging ? "ring-2 ring-primary" : ""}`}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {category.name}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 line-clamp-2 mt-1">
                {category.description || "No description"}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleStatus(category.id)}>
                  {category.is_active ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(category)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge
              variant={category.is_active ? "default" : "secondary"}
              className={category.is_active ? "bg-green-100 text-green-800" : ""}
            >
              {category.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {category.course_count || 0} courses
            </Badge>
          </div>
          {category.subcategories && category.subcategories.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              <FolderOpen className="h-3 w-3 inline mr-1" />
              {category.subcategories.length} subcategories
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <div
          className="cursor-move flex items-center justify-center"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>


      <TableCell>
        <Badge
          variant={category.is_active ? "default" : "secondary"}
          className={category.is_active ? "bg-green-100 text-green-800" : ""}
        >
          {category.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">
          <BookOpen className="h-3 w-3 mr-1" />
          {category.course_count || 0}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(category.id)}>
              {category.is_active ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ==================== MAIN PAGE COMPONENT ====================

export default function InstitutionCategoriesPage() {
  const router = useRouter();
  const params = useParams();
  const institutionId = params.institutionId as string;
  const { user, token } = useAuth();
  
  const dispatch = useAppDispatch();
  const {
    institutionCategories,
    isLoadingCategories,
    categoriesError,
    categoryOperationSuccess,
    categoryPagination,
    selectedInstitution,
  } = useAppSelector((state) => state.institutions);

  // State variables
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    parent_category_id: "",
    order_index: 0,
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "order" | "courses">("order");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "tree">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isReordering, setIsReordering] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check authorization
  const hasAccess = useMemo(() => {
    if (!user) return false;
    if (user.bwenge_role === "SYSTEM_ADMIN") return true;
    if (user.bwenge_role === "INSTITUTION_ADMIN") {
      return user.primary_institution_id === institutionId;
    }
    return false;
  }, [user, institutionId]);

  // Fetch categories on mount
  useEffect(() => {
    if (institutionId && hasAccess) {
      fetchCategories();
    }
  }, [institutionId, hasAccess]);

  // Handle success/error toasts
  useEffect(() => {
    if (categoryOperationSuccess) {
      toast.success("Operation completed successfully");
      dispatch(clearCategoryOperationSuccess());
    }
    if (categoriesError) {
      toast.error(categoriesError);
      dispatch(clearCategoriesError());
    }
  }, [categoryOperationSuccess, categoriesError, dispatch]);

  // Fetch categories function
  const fetchCategories = useCallback(() => {
    const filters: CategoryFilters = {
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      is_active: filterActive === "all" ? undefined : filterActive === "active",
      sort_by: sortBy === "name" ? "name" : sortBy === "courses" ? "course_count" : "order_index",
      sort_order: sortBy === "name" ? "ASC" : "DESC",
      include_course_count: true,
      hierarchical: viewMode === "tree",
    };

    dispatch(fetchInstitutionCategories({ institutionId, filters }));
  }, [dispatch, institutionId, currentPage, itemsPerPage, searchTerm, filterActive, sortBy, viewMode]);

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = institutionCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = institutionCategories.findIndex((cat) => cat.id === over.id);

      const reorderedCategories = arrayMove(institutionCategories, oldIndex, newIndex);
      
      // Update order indices
      const categoryOrders = reorderedCategories.map((category, index) => ({
        id: category.id,
        order_index: index + 1,
      }));

      try {
        setIsReordering(true);
        await dispatch(
          reorderInstitutionCategories({ institutionId, categoryOrders })
        ).unwrap();
        toast.success("Categories reordered successfully");
      } catch (error: any) {
        toast.error(error || "Failed to reorder categories");
      } finally {
        setIsReordering(false);
      }
    }
  };

  // Handle create category
  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await dispatch(
        createInstitutionCategory({
          institutionId,
          categoryData: {
            institution_id: institutionId,
            name: categoryFormData.name.trim(),
            description: categoryFormData.description.trim() || undefined,
            parent_category_id: categoryFormData.parent_category_id || undefined,
            order_index: categoryFormData.order_index,
            is_active: categoryFormData.is_active,
          },
        })
      ).unwrap();

      setShowCreateDialog(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error || "Failed to create category");
    }
  };

  // Handle update category
  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await dispatch(
        updateInstitutionCategory({
          categoryId: selectedCategory.id,
          updates: {
            name: categoryFormData.name.trim(),
            description: categoryFormData.description.trim() || undefined,
            parent_category_id: categoryFormData.parent_category_id || null,
            order_index: categoryFormData.order_index,
            is_active: categoryFormData.is_active,
          },
        })
      ).unwrap();

      setShowEditDialog(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error || "Failed to update category");
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      await dispatch(
        deleteInstitutionCategory({
          categoryId: selectedCategory.id,
          force_delete: selectedCategory.course_count === 0,
        })
      ).unwrap();

      setShowDeleteDialog(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error || "Failed to delete category");
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (categoryId: string) => {
    try {
      await dispatch(toggleCategoryStatus(categoryId)).unwrap();
      fetchCategories();
    } catch (error: any) {
      toast.error(error || "Failed to toggle category status");
    }
  };

  // Reset form
  const resetForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
      parent_category_id: "",
      order_index: 0,
      is_active: true,
    });
    setSelectedCategory(null);
  };

  // Open edit dialog
  const openEditDialog = (category: CourseCategory) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
      order_index: category.order_index,
      is_active: category.is_active,
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (category: CourseCategory) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  // Get parent categories for dropdown (categories without parents)
  const parentCategories = useMemo(() => {
    return institutionCategories.filter(cat => !cat.parent_category_id);
  }, [institutionCategories]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalCategories = institutionCategories.reduce((total, cat) => {
      return total + 1 + (cat.subcategories?.length || 0);
    }, 0);
    
    const activeCategories = institutionCategories.reduce((total, cat) => {
      let count = cat.is_active ? 1 : 0;
      count += cat.subcategories?.filter(sub => sub.is_active).length || 0;
      return total + count;
    }, 0);
    
    const categoriesWithCourses = institutionCategories.reduce((total, cat) => {
      let count = (cat.course_count || 0) > 0 ? 1 : 0;
      count += cat.subcategories?.filter(sub => (sub.course_count || 0) > 0).length || 0;
      return total + count;
    }, 0);
    
    const totalCourses = institutionCategories.reduce((total, cat) => {
      return total + (cat.course_count || 0) + 
        (cat.subcategories?.reduce((sum, sub) => sum + (sub.course_count || 0), 0) || 0);
    }, 0);
    
    const avgCoursesPerCategory = totalCategories > 0 ? (totalCourses / totalCategories).toFixed(1) : "0";

    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      categoriesWithCourses,
      totalCourses,
      avgCoursesPerCategory,
    };
  }, [institutionCategories]);

  // Filter and sort categories based on view mode
  const displayedCategories = useMemo(() => {
    let filtered = [...institutionCategories];

    // Apply active filter
    if (filterActive !== "all") {
      filtered = filtered.filter(cat => 
        filterActive === "active" ? cat.is_active : !cat.is_active
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "courses":
        filtered.sort((a, b) => (b.course_count || 0) - (a.course_count || 0));
        break;
      case "order":
      default:
        filtered.sort((a, b) => a.order_index - b.order_index);
        break;
    }

    return filtered;
  }, [institutionCategories, filterActive, sortBy]);

  // Render tree view
  const renderTreeView = (categories: CourseCategory[], level = 0) => {
    return categories.map((category) => (
      <div key={category.id} className="space-y-2">
        <div
          className={`flex items-center justify-between p-3 rounded-lg border ${
            level > 0 ? "ml-6" : ""
          } ${category.is_active ? "bg-white" : "bg-gray-50"}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderTree className={`h-4 w-4 ${category.is_active ? "text-primary" : "text-gray-400"}`} />
              <span className={`font-medium ${category.is_active ? "" : "text-gray-500"}`}>
                {category.name}
              </span>
            </div>
            {!category.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {category.course_count > 0 && (
              <Badge variant="outline">
                <BookOpen className="h-3 w-3 mr-1" />
                {category.course_count}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(category)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(category.id)}>
                  {category.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => openDeleteDialog(category)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {category.subcategories && category.subcategories.length > 0 && (
          <div className="space-y-2">
            {renderTreeView(category.subcategories, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-6">
              You need to be an institution administrator to access category management.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FolderTree className="h-8 w-8 text-primary" />
            Category Management
          </h1>
          <p className="text-gray-600 mt-1">
            {selectedInstitution?.name || "Institution"} - Organize and manage course categories
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategories}
            disabled={isLoadingCategories}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCategories ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Categories</p>
                <p className="text-2xl font-bold">{statistics.totalCategories}</p>
              </div>
              <FolderTree className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.activeCategories}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{statistics.inactiveCategories}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Courses</p>
                <p className="text-2xl font-bold">{statistics.categoriesWithCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Courses/Category</p>
                <p className="text-2xl font-bold">{statistics.avgCoursesPerCategory}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search categories by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filterActive} onValueChange={(value: any) => setFilterActive(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">By Order</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="courses">By Course Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "tree" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode("tree")}
                >
                  <FolderTree className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Display */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            {isLoadingCategories ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : (
              `Showing ${displayedCategories.length} categories`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Categories Found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? "Try a different search term" : "Create your first category to get started"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </div>
          ) : viewMode === "tree" ? (
            <div className="space-y-2">
              {renderTreeView(displayedCategories)}
            </div>
          ) : viewMode === "grid" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedCategories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedCategories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onToggleStatus={handleToggleStatus}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedCategories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedCategories.map((category) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                        onToggleStatus={handleToggleStatus}
                        viewMode={viewMode}
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
        
        {categoryPagination && categoryPagination.totalPages > 1 && (
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                Page {categoryPagination.page} of {categoryPagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(categoryPagination.totalPages, prev + 1))}
                  disabled={currentPage === categoryPagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your institution's courses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={categoryFormData.name}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, name: e.target.value })
                }
                placeholder="Enter category name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={categoryFormData.description}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, description: e.target.value })
                }
                placeholder="Describe this category (optional)"
                rows={3}
              />
            </div>
            
 
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-index">Order Index</Label>
                <Input
                  id="order-index"
                  type="number"
                  value={categoryFormData.order_index}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      order_index: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {categoryFormData.is_active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={categoryFormData.is_active}
                    onCheckedChange={(checked) =>
                      setCategoryFormData({ ...categoryFormData, is_active: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category details and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={categoryFormData.name}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, name: e.target.value })
                }
                placeholder="Enter category name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={categoryFormData.description}
                onChange={(e) =>
                  setCategoryFormData({ ...categoryFormData, description: e.target.value })
                }
                placeholder="Describe this category"
                rows={3}
              />
            </div>

            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-order-index">Order Index</Label>
                <Input
                  id="edit-order-index"
                  type="number"
                  value={categoryFormData.order_index}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      order_index: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {categoryFormData.is_active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={categoryFormData.is_active}
                    onCheckedChange={(checked) =>
                      setCategoryFormData({ ...categoryFormData, is_active: checked })
                    }
                  />
                </div>
              </div>
            </div>
            
            {selectedCategory && (
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500 space-y-1">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(selectedCategory.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {new Date(selectedCategory.updated_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Course Count:</span>{" "}
                    {selectedCategory.course_count || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm you want to delete this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCategory && (
              <>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-700 mb-1">
                        Delete "{selectedCategory.name}"
                      </h4>
                      
                      {(selectedCategory.course_count || 0) > 0 && (
                        <p className="text-red-600 text-sm mb-2">
                          ⚠️ This category has {selectedCategory.course_count || 0} courses assigned to it.
                          {(selectedCategory.course_count || 0) > 0 && " These courses will need to be reassigned."}
                        </p>
                      )}
                      
                      {selectedCategory.subcategories && selectedCategory.subcategories.length > 0 && (
                        <p className="text-red-600 text-sm mb-2">
                          ⚠️ This category has {selectedCategory.subcategories.length} subcategories.
                          {selectedCategory.subcategories.length > 0 && " These will also be deleted."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type <span className="font-mono text-red-600">"{selectedCategory.name}"</span> to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    placeholder="Enter category name to confirm"
                    onChange={(e) => {
                      // You can add confirmation logic here
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={(selectedCategory?.course_count ?? 0) > 0}
            >
              {(selectedCategory?.course_count ?? 0) > 0 ? "Reassign Courses First" : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}