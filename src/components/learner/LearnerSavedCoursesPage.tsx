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
  Loader2,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Clock,
  Users,
  Star,
  Target,
  Trophy,
  Crown,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  PlayCircle,
  AlertCircle,
  Calendar,
  GraduationCap,
  Sparkles,
  Globe,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d";

interface SavedCourse {
  id: string;
  saved_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  course_type: "MOOC" | "SPOC";
  level: string;
  price: number;
  average_rating: number;
  total_reviews: number;
  enrollment_count: number;
  duration_minutes: number;
  language: string;
  is_certificate_available: boolean;
  instructor: {
    id: string;
    name: string;
    avatar: string | null;
  };
  institution?: {
    id: string;
    name: string;
    logo: string | null;
  };
  saved_at: string;
  notes?: string;
  tags?: string[];
}

interface SavedCoursesStats {
  total_saved: number;
  mooc_count: number;
  spoc_count: number;
  by_level: {
    level: string;
    count: number;
  }[];
  recently_saved: number;
}

export default function LearnerSavedCoursesPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [stats, setStats] = useState<SavedCoursesStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SavedCourse | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSavedCourses();
    }
  }, [user]);

  const fetchSavedCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/user/${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSavedCourses(data.data || []);
        
        // Calculate statistics
        const stats = calculateSavedStats(data.data || []);
        setStats(stats);
      } else {
        toast.error("Failed to load saved courses");
      }
    } catch (error) {
      toast.error("Failed to load saved courses");
    } finally {
      setLoading(false);
    }
  };

  const calculateSavedStats = (courses: SavedCourse[]): SavedCoursesStats => {
    const moocCount = courses.filter(c => c.course_type === "MOOC").length;
    const spocCount = courses.filter(c => c.course_type === "SPOC").length;

    // Group by level
    const levelCounts: Record<string, number> = {};
    courses.forEach(c => {
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });
    const byLevel = Object.entries(levelCounts).map(([level, count]) => ({ level, count }));

    // Recently saved (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlySaved = courses.filter(
      c => new Date(c.saved_at) >= sevenDaysAgo
    ).length;

    return {
      total_saved: courses.length,
      mooc_count: moocCount,
      spoc_count: spocCount,
      by_level: byLevel,
      recently_saved: recentlySaved,
    };
  };

  const handleRemoveSaved = async (savedId: string) => {
    setRemovingId(savedId);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/${savedId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSavedCourses(prev => prev.filter(c => c.saved_id !== savedId));
        toast.success("Course removed from saved");
      } else {
        toast.error("Failed to remove course");
      }
    } catch (error) {
      toast.error("Failed to remove course");
    } finally {
      setRemovingId(null);
      setShowRemoveDialog(false);
    }
  };

  const handleAddNote = async (savedId: string, notes: string) => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/${savedId}/notes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes }),
        }
      );

      if (response.ok) {
        setSavedCourses(prev =>
          prev.map(c =>
            c.saved_id === savedId ? { ...c, notes } : c
          )
        );
        toast.success("Note added");
      }
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const handleEnrollNow = (courseId: string) => {
    // Redirect to course detail page with enrollment flow
    window.location.href = `/courses/${courseId}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSavedCourses();
    setRefreshing(false);
    toast.success("Saved courses refreshed");
  };

  const filteredCourses = savedCourses
    .filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (course.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === "all" || course.course_type === filterType;
      
      const matchesLevel = filterLevel === "all" || course.level === filterLevel;
      
      return matchesSearch && matchesType && matchesLevel;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "rating":
          return b.average_rating - a.average_rating;
        default:
          return 0;
      }
    });

  const getLevelIcon = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return <Target className="w-4 h-4" />;
      case "INTERMEDIATE":
        return <Trophy className="w-4 h-4" />;
      case "ADVANCED":
      case "EXPERT":
        return <Crown className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "bg-success/15 text-success border-success/30";
      case "INTERMEDIATE":
        return "bg-primary/15 text-primary border-primary/30";
      case "ADVANCED":
      case "EXPERT":
        return "bg-primary/15 text-primary border-primary/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Saved Courses
          </h1>
          <p className="text-muted-foreground">
            Courses you've bookmarked for later
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
        </div>
      </div>

      {/* Stats Cards */}
      {stats && stats.total_saved > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saved Courses</p>
                  <p className="text-3xl font-bold">{stats.total_saved}</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <Bookmark className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MOOCs</p>
                  <p className="text-3xl font-bold">{stats.mooc_count}</p>
                </div>
                <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                  <Globe className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SPOCs</p>
                  <p className="text-3xl font-bold">{stats.spoc_count}</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recently Saved</p>
                  <p className="text-3xl font-bold">{stats.recently_saved}</p>
                </div>
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search saved courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-40">
            <BookOpen className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Course Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MOOC">MOOC</SelectItem>
            <SelectItem value="SPOC">SPOC</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-full md:w-40">
            <Target className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
            <SelectItem value="EXPERT">Expert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Saved</SelectItem>
            <SelectItem value="title">Course Title</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Saved Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No Saved Courses
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No courses match your search criteria"
                : "You haven't saved any courses yet. Browse courses and click the bookmark icon to save them for later."}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/browse/all">
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCourses.map((course, idx) => (
            <BwengeCourseCard3D
              key={course.saved_id}
              id={course.id}
              title={course.title}
              description={course.description}
              thumbnail_url={course.thumbnail_url || undefined}
              instructor={{
                id: course.instructor.id,
                first_name: course.instructor.name.split(" ")[0] || "",
                last_name: course.instructor.name.split(" ").slice(1).join(" ") || "",
                profile_picture_url: course.instructor.avatar || undefined,
              }}
              level={course.level}
              course_type={course.course_type}
              price={course.price}
              average_rating={course.average_rating}
              total_reviews={course.total_reviews}
              enrollment_count={course.enrollment_count}
              duration_minutes={course.duration_minutes}
              is_certificate_available={course.is_certificate_available}
              institution={course.institution ? {
                id: course.institution.id,
                name: course.institution.name,
                logo_url: course.institution.logo || undefined,
              } : undefined}
              variant="browse"
              showActions={true}
              showInstitution={!!course.institution}
              index={idx}
              onLearnMoreClick={(id) => handleEnrollNow(id)}
            />
          ))}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Saved</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this course from your saved list?
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {selectedCourse.thumbnail_url ? (
                  <img
                    src={selectedCourse.thumbnail_url}
                    alt={selectedCourse.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{selectedCourse.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Saved on {format(new Date(selectedCourse.saved_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedCourse && handleRemoveSaved(selectedCourse.saved_id)}
              disabled={removingId === selectedCourse?.saved_id}
            >
              {removingId === selectedCourse?.saved_id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}