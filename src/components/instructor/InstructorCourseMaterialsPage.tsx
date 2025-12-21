"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Folder,
  File,
  FileText,
  Video,
  Image,
  Link2,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  Share2,
  Copy,
  Move,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Lock,
  Users,
  BookOpen,
  GraduationCap,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileAudio,
  Presentation,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface Material {
  id: string;
  title: string;
  description: string | null;
  material_type: "PDF" | "VIDEO" | "AUDIO" | "DOCUMENT" | "PRESENTATION" | "SPREADSHEET" | "IMAGE" | "ARCHIVE" | "OTHER";
  file_url: string;
  file_size: number;
  file_name: string;
  file_extension: string;
  is_downloadable: boolean;
  is_required: boolean;
  download_count: number;
  view_count: number;
  status: string;
  module: {
    id: string;
    title: string;
  } | null;
  lesson: {
    id: string;
    title: string;
  } | null;
  uploaded_by: {
    id: string;
    name: string;
  };
  created_at: string;
}

interface MaterialFolder {
  id: string;
  name: string;
  course_id: string;
  parent_folder_id: string | null;
  materials: Material[];
  subfolders: MaterialFolder[];
  created_at: string;
  updated_at: string;
}

interface CourseMaterialsSummary {
  course_id: string;
  course_title: string;
  course_thumbnail: string | null;
  total_materials: number;
  total_size_mb: number;
  by_type: {
    type: string;
    count: number;
    size_mb: number;
  }[];
  recent_uploads: Material[];
  popular_materials: Material[];
}

interface MaterialsStats {
  total_materials: number;
  total_size_mb: number;
  total_downloads: number;
  total_views: number;
  materials_by_course: number;
  materials_uploaded_this_week: number;
  storage_used_percentage: number;
  storage_limit_mb: number;
  materials_by_type: {
    pdf: number;
    video: number;
    audio: number;
    document: number;
    presentation: number;
    spreadsheet: number;
    image: number;
    archive: number;
    other: number;
  };
}

// Constants for select values (never use empty strings)
const SELECT_VALUES = {
  ALL_COURSES: "all",
  ALL_TYPES: "all",
  SORT_RECENT: "recent",
  SORT_TITLE: "title",
  SORT_SIZE: "size",
  SORT_DOWNLOADS: "downloads",
  SORT_VIEWS: "views",
  NONE: "none",
};

export default function InstructorCourseMaterialsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<MaterialsStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>(SELECT_VALUES.ALL_COURSES);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>(SELECT_VALUES.ALL_TYPES);
  const [sortBy, setSortBy] = useState<string>(SELECT_VALUES.SORT_RECENT);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    course_id: "",
    module_id: "",
    lesson_id: "",
    files: [] as File[],
    is_downloadable: true,
    is_required: false,
  });

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== SELECT_VALUES.ALL_COURSES) {
      fetchCourseMaterials(selectedCourse);
    } else if (selectedCourse === SELECT_VALUES.ALL_COURSES && courses.length > 0) {
      fetchAllMaterials();
    }
  }, [selectedCourse, courses]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/courses?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data?.courses || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCourseMaterials = async (courseId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/course/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.data?.materials || []);
      } else {
        toast.error("Failed to load materials");
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const allMats: Material[] = [];

      for (const course of courses) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/course/${course.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          allMats.push(...(data.data?.materials || []));
        }
      }

      setMaterials(allMats);
      setAllMaterials(allMats);
    } catch (error) {
      console.error("Error fetching all materials:", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    if (selectedCourse === SELECT_VALUES.ALL_COURSES) {
      await fetchAllMaterials();
    } else {
      await fetchCourseMaterials(selectedCourse);
    }
    setRefreshing(false);
    toast.success("Materials refreshed");
  };

  const handleUpload = async () => {
    if (uploadForm.files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    if (!uploadForm.course_id) {
      toast.error("Please select a course");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const formData = new FormData();

      formData.append("course_id", uploadForm.course_id);
      if (uploadForm.title) formData.append("title", uploadForm.title);
      if (uploadForm.description) formData.append("description", uploadForm.description);
      formData.append("is_downloadable", String(uploadForm.is_downloadable));
      formData.append("is_required", String(uploadForm.is_required));

      if (uploadForm.module_id && uploadForm.module_id !== SELECT_VALUES.NONE) {
        formData.append("module_id", uploadForm.module_id);
      }

      if (uploadForm.lesson_id && uploadForm.lesson_id !== SELECT_VALUES.NONE) {
        formData.append("lesson_id", uploadForm.lesson_id);
      }

      uploadForm.files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Materials uploaded successfully");
        setShowUploadDialog(false);
        setUploadForm({
          title: "",
          description: "",
          course_id: "",
          module_id: "",
          lesson_id: "",
          files: [],
          is_downloadable: true,
          is_required: false,
        });
        await fetchStats();
        if (selectedCourse === SELECT_VALUES.ALL_COURSES) {
          await fetchAllMaterials();
        } else {
          await fetchCourseMaterials(selectedCourse);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to upload materials");
      }
    } catch (error) {
      console.error("Error uploading materials:", error);
      toast.error("Failed to upload materials");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/${materialId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setMaterials(materials.filter(m => m.id !== materialId));
        setShowMaterialDialog(false);
        toast.success("Material deleted successfully");
        await fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete material");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("Failed to delete material");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (material: Material) => {
    window.open(material.file_url, "_blank");
    toast.success(`Downloading ${material.title}`);
  };

  const mapMaterialType = (backendType: string): string => {
    const typeMap: Record<string, string> = {
      PDF: "pdf",
      VIDEO: "video",
      AUDIO: "audio",
      DOCUMENT: "document",
      PRESENTATION: "presentation",
      SPREADSHEET: "spreadsheet",
      IMAGE: "image",
      ARCHIVE: "archive",
      OTHER: "other",
    };
    return typeMap[backendType] || "other";
  };

  const filteredMaterials = materials
    .filter(material => {
      const materialType = mapMaterialType(material.material_type);
      const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (material.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesType = filterType === SELECT_VALUES.ALL_TYPES || materialType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case SELECT_VALUES.SORT_RECENT:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case SELECT_VALUES.SORT_TITLE:
          return a.title.localeCompare(b.title);
        case SELECT_VALUES.SORT_SIZE:
          return b.file_size - a.file_size;
        case SELECT_VALUES.SORT_DOWNLOADS:
          return b.download_count - a.download_count;
        case SELECT_VALUES.SORT_VIEWS:
          return b.view_count - a.view_count;
        default:
          return 0;
      }
    });

  const getFileIcon = (materialType: string) => {
    const type = mapMaterialType(materialType);
    switch (type) {
      case "document":
      case "pdf":
        return <FileText className="w-8 h-8 text-blue-500" />;
      case "video":
        return <Video className="w-8 h-8 text-red-500" />;
      case "image":
        return <Image className="w-8 h-8 text-green-500" />;
      case "presentation":
        return <Presentation className="w-8 h-8 text-orange-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case "archive":
        return <FileArchive className="w-8 h-8 text-amber-500" />;
      case "audio":
        return <FileAudio className="w-8 h-8 text-pink-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const getTypeBadge = (materialType: string) => {
    const type = mapMaterialType(materialType);
    const colors: Record<string, string> = {
      document: "bg-blue-100 text-blue-800",
      pdf: "bg-blue-100 text-blue-800",
      video: "bg-red-100 text-red-800",
      image: "bg-green-100 text-green-800",
      presentation: "bg-orange-100 text-orange-800",
      spreadsheet: "bg-emerald-100 text-emerald-800",
      archive: "bg-amber-100 text-amber-800",
      audio: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Course Materials
          </h1>
          <p className="text-gray-600">
            Manage and organize all your course files and resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Materials</p>
                  <p className="text-3xl font-bold">{stats.total_materials}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Storage</p>
                  <p className="text-3xl font-bold">{stats.total_size_mb.toFixed(1)} MB</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Folder className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Downloads</p>
                  <p className="text-3xl font-bold">{stats.total_downloads.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Storage Used</p>
                  <p className="text-3xl font-bold">{stats.storage_used_percentage.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Archive className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full md:w-48">
            <BookOpen className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_VALUES.ALL_COURSES}>All Courses</SelectItem>
            {courses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-40">
            <FileText className="w-4 h-4 mr-2" />
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_VALUES.ALL_TYPES}>All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="presentation">Presentations</SelectItem>
            <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
            <SelectItem value="archive">Archives</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <SortAsc className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_VALUES.SORT_RECENT}>Most Recent</SelectItem>
            <SelectItem value={SELECT_VALUES.SORT_TITLE}>Title</SelectItem>
            <SelectItem value={SELECT_VALUES.SORT_SIZE}>File Size</SelectItem>
            <SelectItem value={SELECT_VALUES.SORT_DOWNLOADS}>Most Downloaded</SelectItem>
            <SelectItem value={SELECT_VALUES.SORT_VIEWS}>Most Viewed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Materials Display */}
      {filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Materials Found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType !== SELECT_VALUES.ALL_TYPES
                ? "No materials match your search criteria"
                : "You haven't uploaded any materials yet."}
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Materials
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Card
              key={material.id}
              className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
              onClick={() => {
                setSelectedMaterial(material);
                setShowMaterialDialog(true);
              }}
            >
              <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  {getFileIcon(material.material_type)}
                  <p className="text-xs text-gray-500 mt-2">{material.file_extension}</p>
                </div>
                <Badge
                  className={`absolute top-2 right-2 ${getTypeBadge(material.material_type)}`}
                >
                  {mapMaterialType(material.material_type)}
                </Badge>
                {!material.is_downloadable && (
                  <Badge className="absolute top-2 left-2 bg-gray-800 text-white">
                    <Lock className="w-3 h-3 mr-1" />
                    View Only
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {material.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {material.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {selectedCourse !== SELECT_VALUES.ALL_COURSES ? courses.find(c => c.id === selectedCourse)?.title : "Multiple Courses"}
                  </span>
                  <span>{formatFileSize(material.file_size)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {material.is_required && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                      Required
                    </Badge>
                  )}
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {material.download_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {material.view_count}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMaterials.map((material) => (
            <Card
              key={material.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedMaterial(material);
                setShowMaterialDialog(true);
              }}
            >
              <div className="flex items-center p-4">
                <div className="mr-4">
                  {getFileIcon(material.material_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {material.title}
                    </h3>
                    <Badge className={getTypeBadge(material.material_type)}>
                      {mapMaterialType(material.material_type)}
                    </Badge>
                    {!material.is_downloadable && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        View Only
                      </Badge>
                    )}
                    {material.is_required && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {material.description || "No description"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>{formatFileSize(material.file_size)}</span>
                    <span>
                      Uploaded {formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {material.download_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {material.view_count}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(material)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this material?")) {
                          handleDeleteMaterial(material.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Course Summaries - Removed, using stats instead */}

      {/* Material Details Dialog */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {getFileIcon(selectedMaterial.material_type)}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedMaterial.title}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedMaterial.file_size)} • {selectedMaterial.file_extension}
                  </p>
                </div>
                <Badge className={getTypeBadge(selectedMaterial.material_type)}>
                  {mapMaterialType(selectedMaterial.material_type)}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedMaterial.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Uploaded by</Label>
                  <p className="text-sm font-medium">{selectedMaterial.uploaded_by.name}</p>
                </div>
                <div>
                  <Label className="text-xs">Uploaded on</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedMaterial.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Downloads</Label>
                  <p className="text-sm font-medium">{selectedMaterial.download_count}</p>
                </div>
                <div>
                  <Label className="text-xs">Views</Label>
                  <p className="text-sm font-medium">{selectedMaterial.view_count}</p>
                </div>
                <div>
                  <Label className="text-xs">Downloadable</Label>
                  <p className="text-sm font-medium">
                    {selectedMaterial.is_downloadable ? "Yes" : "View Only"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Required</Label>
                  <p className="text-sm font-medium">
                    {selectedMaterial.is_required ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {selectedMaterial.module && (
                <div>
                  <Label>Module</Label>
                  <p className="text-sm font-medium mt-1">{selectedMaterial.module.title}</p>
                </div>
              )}

              {selectedMaterial.lesson && (
                <div>
                  <Label>Lesson</Label>
                  <p className="text-sm font-medium mt-1">{selectedMaterial.lesson.title}</p>
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedMaterial.is_downloadable && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedMaterial)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this material?")) {
                      handleDeleteMaterial(selectedMaterial.id);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Materials</DialogTitle>
            <DialogDescription>
              Upload files for your courses. Supported formats: PDF, DOC, PPT, XLS, MP4, JPG, PNG, ZIP, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Course *</Label>
              <Select
                value={uploadForm.course_id}
                onValueChange={(value) => setUploadForm({ ...uploadForm, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title (Optional)</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Leave empty to use filename"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>


            <div className="space-y-2">
              <Label>Files *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadForm({ ...uploadForm, files });
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  Browse Files
                </Button>
              </div>
              {uploadForm.files.length > 0 && (
                <div className="space-y-2 mt-2">
                  <Label>Selected Files:</Label>
                  {uploadForm.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-gray-500 ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_downloadable"
                  checked={uploadForm.is_downloadable}
                  onChange={(e) => setUploadForm({ ...uploadForm, is_downloadable: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_downloadable">Allow students to download</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_required"
                  checked={uploadForm.is_required}
                  onChange={(e) => setUploadForm({ ...uploadForm, is_required: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_required">Mark as required material</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}