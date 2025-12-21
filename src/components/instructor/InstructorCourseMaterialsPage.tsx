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
  description: string;
  type: "document" | "video" | "image" | "presentation" | "spreadsheet" | "code" | "archive" | "audio" | "other";
  file_url: string;
  file_size: number;
  file_extension: string;
  course_id: string;
  module_id: string | null;
  lesson_id: string | null;
  uploaded_by: {
    id: string;
    name: string;
  };
  uploaded_at: string;
  updated_at: string;
  downloads: number;
  views: number;
  is_public: boolean;
  is_published: boolean;
  tags: string[];
  version: number;
  thumbnail_url?: string;
  duration_seconds?: number;
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
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [courseSummaries, setCourseSummaries] = useState<CourseMaterialsSummary[]>([]);
  const [stats, setStats] = useState<MaterialsStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>(SELECT_VALUES.ALL_COURSES);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>(SELECT_VALUES.ALL_TYPES);
  const [sortBy, setSortBy] = useState<string>(SELECT_VALUES.SORT_RECENT);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    course_id: "",
    module_id: "",
    lesson_id: "",
    files: [] as File[],
    is_public: true,
    tags: "",
  });

  // Folder form state
  const [folderForm, setFolderForm] = useState({
    name: "",
    course_id: "",
    parent_folder_id: SELECT_VALUES.NONE,
  });

  useEffect(() => {
    if (user?.id) {
      fetchMaterials();
      fetchCourses();
    }
  }, [user]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch instructor's courses first
      const coursesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/courses?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!coursesResponse.ok) {
        throw new Error("Failed to fetch courses");
      }

      const coursesData = await coursesResponse.json();
      const instructorCourses = coursesData.data?.courses || [];

      setCourses(instructorCourses);

      // Fetch materials for each course (would need a dedicated endpoint)
      // For now, we'll use mock data
      const allMaterials: Material[] = [];
      const summaries: CourseMaterialsSummary[] = [];

      // Mock materials by type
      const materialTypes: Material["type"][] = [
        "document", "video", "presentation", "spreadsheet", "code", "image", "archive", "audio"
      ];

      for (const course of instructorCourses) {
        const courseMaterials: Material[] = [];
        
        // Generate 5-15 mock materials per course
        const materialCount = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < materialCount; i++) {
          const type = materialTypes[Math.floor(Math.random() * materialTypes.length)];
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 90));
          
          const fileSize = Math.floor(Math.random() * 10000) + 100; // KB
          const fileExtensions: Record<string, string> = {
            document: ".pdf",
            video: ".mp4",
            presentation: ".pptx",
            spreadsheet: ".xlsx",
            code: ".js",
            image: ".jpg",
            archive: ".zip",
            audio: ".mp3",
            other: ".bin",
          };

          courseMaterials.push({
            id: `material-${course.id}-${i}`,
            title: `${type} Material ${i + 1}`,
            description: `This is a sample ${type} material for ${course.title}`,
            type,
            file_url: "#",
            file_size: fileSize,
            file_extension: fileExtensions[type] || ".bin",
            course_id: course.id,
            module_id: null,
            lesson_id: null,
            uploaded_by: {
              id: user?.id || "",
              name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
            },
            uploaded_at: date.toISOString(),
            updated_at: date.toISOString(),
            downloads: Math.floor(Math.random() * 500),
            views: Math.floor(Math.random() * 1000),
            is_public: Math.random() > 0.3,
            is_published: Math.random() > 0.2,
            tags: ["sample", type, "material"],
            version: 1,
          });
        }

        allMaterials.push(...courseMaterials);

        // Calculate summary for this course
        const byType = materialTypes.map(type => ({
          type,
          count: courseMaterials.filter(m => m.type === type).length,
          size_mb: courseMaterials
            .filter(m => m.type === type)
            .reduce((sum, m) => sum + m.file_size / 1024, 0),
        })).filter(t => t.count > 0);

        const totalSizeMb = courseMaterials.reduce((sum, m) => sum + m.file_size / 1024, 0);

        const recentUploads = [...courseMaterials]
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
          .slice(0, 5);

        const popularMaterials = [...courseMaterials]
          .sort((a, b) => b.downloads - a.downloads)
          .slice(0, 5);

        summaries.push({
          course_id: course.id,
          course_title: course.title,
          course_thumbnail: course.thumbnail_url,
          total_materials: courseMaterials.length,
          total_size_mb: totalSizeMb,
          by_type: byType,
          recent_uploads: recentUploads,
          popular_materials: popularMaterials,
        });
      }

      setMaterials(allMaterials);
      setCourseSummaries(summaries);

      // Calculate overall statistics
      const totalSizeMb = allMaterials.reduce((sum, m) => sum + m.file_size / 1024, 0);
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);

      const stats: MaterialsStats = {
        total_materials: allMaterials.length,
        total_size_mb: totalSizeMb,
        total_downloads: allMaterials.reduce((sum, m) => sum + m.downloads, 0),
        total_views: allMaterials.reduce((sum, m) => sum + m.views, 0),
        materials_by_course: summaries.length,
        materials_uploaded_this_week: allMaterials.filter(m => new Date(m.uploaded_at) >= thisWeek).length,
        storage_used_percentage: (totalSizeMb / 5120) * 100, // Assume 5GB limit
        storage_limit_mb: 5120, // 5GB
      };

      setStats(stats);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Failed to load course materials");
    } finally {
      setLoading(false);
    }
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials();
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

    try {
      const token = localStorage.getItem("bwengeplus_token");
      const formData = new FormData();

      formData.append("course_id", uploadForm.course_id);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      formData.append("is_public", String(uploadForm.is_public));
      formData.append("tags", uploadForm.tags);

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
        toast.success("Materials uploaded successfully");
        setShowUploadDialog(false);
        setUploadForm({
          title: "",
          description: "",
          course_id: "",
          module_id: "",
          lesson_id: "",
          files: [],
          is_public: true,
          tags: "",
        });
        fetchMaterials();
      } else {
        toast.error("Failed to upload materials");
      }
    } catch (error) {
      console.error("Error uploading materials:", error);
      toast.error("Failed to upload materials");
    }
  };

  const handleCreateFolder = async () => {
    if (!folderForm.name || !folderForm.course_id) {
      toast.error("Please enter folder name and select a course");
      return;
    }

    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/materials/folders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...folderForm,
            parent_folder_id: folderForm.parent_folder_id === SELECT_VALUES.NONE ? null : folderForm.parent_folder_id,
          }),
        }
      );

      if (response.ok) {
        toast.success("Folder created successfully");
        setShowCreateFolderDialog(false);
        setFolderForm({
          name: "",
          course_id: "",
          parent_folder_id: SELECT_VALUES.NONE,
        });
        fetchMaterials();
      } else {
        toast.error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

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
        toast.success("Material deleted");
      } else {
        toast.error("Failed to delete material");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("Failed to delete material");
    }
  };

  const handleDownload = (material: Material) => {
    // Increment download count (would call API)
    toast.success(`Downloading ${material.title}`);
    
    // Update local state
    setMaterials(materials.map(m => 
      m.id === material.id ? { ...m, downloads: m.downloads + 1 } : m
    ));
  };

  const filteredMaterials = materials
    .filter(material => {
      const matchesCourse = selectedCourse === SELECT_VALUES.ALL_COURSES || material.course_id === selectedCourse;
      const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === SELECT_VALUES.ALL_TYPES || material.type === filterType;
      return matchesCourse && matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case SELECT_VALUES.SORT_RECENT:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case SELECT_VALUES.SORT_TITLE:
          return a.title.localeCompare(b.title);
        case SELECT_VALUES.SORT_SIZE:
          return b.file_size - a.file_size;
        case SELECT_VALUES.SORT_DOWNLOADS:
          return b.downloads - a.downloads;
        case SELECT_VALUES.SORT_VIEWS:
          return b.views - a.views;
        default:
          return 0;
      }
    });

  const getFileIcon = (type: Material["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="w-8 h-8 text-blue-500" />;
      case "video":
        return <Video className="w-8 h-8 text-red-500" />;
      case "image":
        return <Image className="w-8 h-8 text-green-500" />;
      case "presentation":
        return <Presentation className="w-8 h-8 text-orange-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case "code":
        return <FileCode className="w-8 h-8 text-purple-500" />;
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

  const getTypeBadge = (type: Material["type"]) => {
    const colors = {
      document: "bg-blue-100 text-blue-800",
      video: "bg-red-100 text-red-800",
      image: "bg-green-100 text-green-800",
      presentation: "bg-orange-100 text-orange-800",
      spreadsheet: "bg-emerald-100 text-emerald-800",
      code: "bg-purple-100 text-purple-800",
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
            onClick={() => setShowCreateFolderDialog(true)}
          >
            <Folder className="w-4 h-4 mr-2" />
            New Folder
          </Button>
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
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="presentation">Presentations</SelectItem>
            <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
            <SelectItem value="code">Code</SelectItem>
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
                {material.thumbnail_url ? (
                  <img
                    src={material.thumbnail_url}
                    alt={material.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    {getFileIcon(material.type)}
                    <p className="text-xs text-gray-500 mt-2">{material.file_extension}</p>
                  </div>
                )}
                <Badge
                  className={`absolute top-2 right-2 ${getTypeBadge(material.type)}`}
                >
                  {material.type}
                </Badge>
                {!material.is_public && (
                  <Badge className="absolute top-2 left-2 bg-gray-800 text-white">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
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
                    {courses.find(c => c.id === material.course_id)?.title}
                  </span>
                  <span>{formatFileSize(material.file_size * 1024)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    v{material.version}
                  </Badge>
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(material.uploaded_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {material.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {material.views}
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
                  {getFileIcon(material.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {material.title}
                    </h3>
                    <Badge className={getTypeBadge(material.type)}>
                      {material.type}
                    </Badge>
                    {!material.is_public && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {material.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {courses.find(c => c.id === material.course_id)?.title}
                    </span>
                    <span>{formatFileSize(material.file_size * 1024)}</span>
                    <span>v{material.version}</span>
                    <span>
                      Uploaded {formatDistanceToNow(new Date(material.uploaded_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {material.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {material.views}
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
                    <DropdownMenuItem>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Move className="w-4 h-4 mr-2" />
                      Move to Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
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

      {/* Course Summaries */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">Course Storage Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courseSummaries.map((summary) => (
            <Card key={summary.course_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {summary.course_thumbnail ? (
                    <img
                      src={summary.course_thumbnail}
                      alt={summary.course_title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base line-clamp-1">
                      {summary.course_title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {summary.total_materials} materials • {summary.total_size_mb.toFixed(1)} MB
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {summary.by_type.slice(0, 4).map((item) => (
                    <div key={item.type} className="text-xs">
                      <span className="font-medium">{item.type}:</span> {item.count}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold">Recent Uploads</h4>
                  {summary.recent_uploads.slice(0, 3).map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary cursor-pointer"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setShowMaterialDialog(true);
                      }}
                    >
                      {getFileIcon(material.type)}
                      <span className="truncate flex-1">{material.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Material Details Dialog */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {getFileIcon(selectedMaterial.type)}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedMaterial.title}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedMaterial.file_size * 1024)} • {selectedMaterial.file_extension}
                  </p>
                </div>
                <Badge className={getTypeBadge(selectedMaterial.type)}>
                  {selectedMaterial.type}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedMaterial.description}
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
                    {format(new Date(selectedMaterial.uploaded_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Downloads</Label>
                  <p className="text-sm font-medium">{selectedMaterial.downloads}</p>
                </div>
                <div>
                  <Label className="text-xs">Views</Label>
                  <p className="text-sm font-medium">{selectedMaterial.views}</p>
                </div>
                <div>
                  <Label className="text-xs">Version</Label>
                  <p className="text-sm font-medium">{selectedMaterial.version}</p>
                </div>
                <div>
                  <Label className="text-xs">Visibility</Label>
                  <p className="text-sm font-medium">
                    {selectedMaterial.is_public ? "Public" : "Private"}
                  </p>
                </div>
              </div>

              {selectedMaterial.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedMaterial.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedMaterial)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteMaterial(selectedMaterial.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
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
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Enter material title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module (Optional)</Label>
                <Select
                  value={uploadForm.module_id}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, module_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_VALUES.NONE}>None</SelectItem>
                    {/* Would need to fetch modules for the selected course */}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lesson (Optional)</Label>
                <Select
                  value={uploadForm.lesson_id}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, lesson_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_VALUES.NONE}>None</SelectItem>
                    {/* Would need to fetch lessons for the selected module */}
                  </SelectContent>
                </Select>
              </div>
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
              <Label>Tags (comma separated)</Label>
              <Input
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="e.g., lecture, slides, homework"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={uploadForm.is_public}
                onChange={(e) => setUploadForm({ ...uploadForm, is_public: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_public">Make materials publicly accessible</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your materials by creating folders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select
                value={folderForm.course_id}
                onValueChange={(value) => setFolderForm({ ...folderForm, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Folder Name *</Label>
              <Input
                value={folderForm.name}
                onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                placeholder="e.g., Lecture Slides, Assignments"
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Folder (Optional)</Label>
              <Select
                value={folderForm.parent_folder_id}
                onValueChange={(value) => setFolderForm({ ...folderForm, parent_folder_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_VALUES.NONE}>Root</SelectItem>
                  {/* Would need to fetch existing folders */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}