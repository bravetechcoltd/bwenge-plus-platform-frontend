"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Users,
  Video,
  FileText,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  Link2,
  Download,
  RefreshCw,
  Search,
  Filter,
  Grid,
  List,
  Calendar as CalendarView,
  AlignLeft,
  Bell,
  BellRing,
  AlertTriangle,
  Award,
  Target,
  Globe,
  Lock,
  Building,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import {
  Calendar,
  Views,
  momentLocalizer,
  type View,
  type Event,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Setup calendar
const localizer = momentLocalizer(moment);

interface TeachingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "lesson" | "assessment" | "office_hours" | "live_session" | "deadline";
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
  module?: string;
  lesson?: string;
  description?: string;
  location?: string;
  meeting_url?: string;
  attendees_count?: number;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  color?: string;
}

interface CourseSchedule {
  course_id: string;
  course_title: string;
  course_thumbnail: string | null;
  events: TeachingEvent[];
  statistics: {
    total_lessons: number;
    completed_lessons: number;
    upcoming_lessons: number;
    total_assessments: number;
    upcoming_deadlines: number;
  };
}

interface ScheduleStats {
  total_events: number;
  events_today: number;
  upcoming_events: number;
  completed_events: number;
  courses_with_events: number;
  pending_reminders: number;
  upcoming_deadlines: number;
  live_sessions_today: number;
}

export default function InstructorTeachingSchedulePage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TeachingEvent[]>([]);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<View>("week");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeachingEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  
  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "lesson",
    course_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "10:00",
    description: "",
    location: "",
    meeting_url: "",
    is_recurring: false,
    recurrence_pattern: "weekly",
  });

  useEffect(() => {
    if (user?.id) {
      fetchTeachingSchedule();
      fetchCourses();
    }
  }, [user]);

  const fetchTeachingSchedule = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch instructor's courses
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

      // For each course, fetch schedule/events
      const allEvents: TeachingEvent[] = [];
      const courseSchedulesData: CourseSchedule[] = [];

      for (const course of instructorCourses) {
        // Fetch course schedule from backend (would need a dedicated endpoint)
        // For now, we'll generate mock events based on course modules/lessons
        
        const courseEvents: TeachingEvent[] = [];
        
        // Generate events from course modules and lessons
        if (course.modules) {
          for (const module of course.modules) {
            if (module.lessons) {
              for (const lesson of module.lessons) {
                // Create a scheduled date for each lesson (mock)
                const lessonDate = addDays(new Date(), Math.floor(Math.random() * 30));
                
                courseEvents.push({
                  id: `lesson-${lesson.id}`,
                  title: lesson.title,
                  start: lessonDate,
                  end: new Date(lessonDate.getTime() + (lesson.duration_minutes || 45) * 60000),
                  type: "lesson",
                  course: {
                    id: course.id,
                    title: course.title,
                    thumbnail_url: course.thumbnail_url,
                  },
                  module: module.title,
                  lesson: lesson.title,
                  description: lesson.content?.substring(0, 200),
                  location: "Online",
                  attendees_count: Math.floor(Math.random() * 50) + 10,
                  status: Math.random() > 0.7 ? "completed" : "scheduled",
                });
              }
            }

            // Generate assessments as events
            if (module.final_assessment) {
              const assessmentDate = addDays(new Date(), Math.floor(Math.random() * 40) + 10);
              
              courseEvents.push({
                id: `assessment-${module.final_assessment.id}`,
                title: `${module.title} - Final Assessment`,
                start: assessmentDate,
                end: new Date(assessmentDate.getTime() + 120 * 60000), // 2 hours
                type: "assessment",
                course: {
                  id: course.id,
                  title: course.title,
                  thumbnail_url: course.thumbnail_url,
                },
                module: module.title,
                description: module.final_assessment.description || "Final assessment",
                location: "Online",
                attendees_count: Math.floor(Math.random() * 50) + 10,
                status: Math.random() > 0.8 ? "completed" : "scheduled",
              });
            }
          }
        }

        // Add office hours (mock)
        for (let i = 0; i < 3; i++) {
          const officeHoursDate = addDays(new Date(), Math.floor(Math.random() * 20) + 5);
          
          courseEvents.push({
            id: `office-${course.id}-${i}`,
            title: `Office Hours - ${course.title}`,
            start: officeHoursDate,
            end: new Date(officeHoursDate.getTime() + 60 * 60000), // 1 hour
            type: "office_hours",
            course: {
              id: course.id,
              title: course.title,
              thumbnail_url: course.thumbnail_url,
            },
            description: "Open office hours for students to ask questions",
            location: "Zoom",
            meeting_url: "https://zoom.us/j/example",
            attendees_count: Math.floor(Math.random() * 15),
            status: "scheduled",
          });
        }

        allEvents.push(...courseEvents);

        // Calculate course statistics
        const now = new Date();
        const courseStats = {
          total_lessons: courseEvents.filter(e => e.type === "lesson").length,
          completed_lessons: courseEvents.filter(e => e.type === "lesson" && e.status === "completed").length,
          upcoming_lessons: courseEvents.filter(e => e.type === "lesson" && e.start > now).length,
          total_assessments: courseEvents.filter(e => e.type === "assessment").length,
          upcoming_deadlines: courseEvents.filter(e => e.type === "assessment" && e.start > now).length,
        };

        courseSchedulesData.push({
          course_id: course.id,
          course_title: course.title,
          course_thumbnail: course.thumbnail_url,
          events: courseEvents,
          statistics: courseStats,
        });
      }

      setEvents(allEvents);
      setCourseSchedules(courseSchedulesData);
      
      // Calculate overall statistics
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats: ScheduleStats = {
        total_events: allEvents.length,
        events_today: allEvents.filter(e => 
          e.start >= today && e.start < tomorrow
        ).length,
        upcoming_events: allEvents.filter(e => e.start > now).length,
        completed_events: allEvents.filter(e => e.status === "completed").length,
        courses_with_events: courseSchedulesData.filter(c => c.events.length > 0).length,
        pending_reminders: Math.floor(Math.random() * 5) + 1,
        upcoming_deadlines: allEvents.filter(e => 
          e.type === "assessment" && e.start > now && e.start < addDays(now, 7)
        ).length,
        live_sessions_today: allEvents.filter(e => 
          e.type === "live_session" && e.start >= today && e.start < tomorrow
        ).length,
      };

      setStats(stats);
    } catch (error) {
      console.error("Error fetching teaching schedule:", error);
      toast.error("Failed to load teaching schedule");
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
    await fetchTeachingSchedule();
    setRefreshing(false);
    toast.success("Schedule refreshed");
  };

  const handleEventClick = (event: TeachingEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleEventDrop = ({ event, start, end }: any) => {
    // Update event in backend
    const updatedEvents = events.map(e => 
      e.id === event.id ? { ...e, start, end } : e
    );
    setEvents(updatedEvents);
    toast.success("Event rescheduled");
  };

  const handleCreateEvent = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Create event in backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...newEvent,
            start: `${newEvent.start_date}T${newEvent.start_time}`,
            end: `${newEvent.start_date}T${newEvent.end_time}`,
          }),
        }
      );

      if (response.ok) {
        toast.success("Event created successfully");
        setShowCreateDialog(false);
        fetchTeachingSchedule();
      } else {
        toast.error("Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId));
        setShowEventDialog(false);
        toast.success("Event deleted");
      } else {
        toast.error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const filteredEvents = selectedCourse === "all"
    ? events
    : events.filter(e => e.course.id === selectedCourse);

  const getEventColor = (type: string, status: string) => {
    if (status === "cancelled") return "#ef4444";
    if (status === "completed") return "#10b981";
    
    switch (type) {
      case "lesson":
        return "#3b82f6";
      case "assessment":
        return "#f59e0b";
      case "office_hours":
        return "#8b5cf6";
      case "live_session":
        return "#ec4899";
      case "deadline":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return <BookOpen className="w-4 h-4" />;
      case "assessment":
        return <FileText className="w-4 h-4" />;
      case "office_hours":
        return <Users className="w-4 h-4" />;
      case "live_session":
        return <Video className="w-4 h-4" />;
      case "deadline":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case "ongoing":
        return <Badge className="bg-green-100 text-green-800">Ongoing</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const calendarEvents = filteredEvents.map(event => ({
    ...event,
    title: event.title,
    start: new Date(event.start),
    end: new Date(event.end),
    resource: event,
  }));

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
            Teaching Schedule
          </h1>
          <p className="text-gray-600">
            Manage your classes, office hours, and deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRemindersDialog(true)}
          >
            <Bell className="w-4 h-4 mr-2" />
            Reminders
            {stats && stats.pending_reminders > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {stats.pending_reminders}
              </Badge>
            )}
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
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
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
                  <p className="text-sm text-gray-500">Today's Schedule</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.events_today}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Upcoming Events</p>
                  <p className="text-3xl font-bold text-green-600">{stats.upcoming_events}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Live Sessions Today</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.live_sessions_today}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Upcoming Deadlines</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.upcoming_deadlines}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <AlignLeft className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <BookOpen className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card className="p-4">
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              view={calendarView}
              onView={(view) => setCalendarView(view as View)}
              date={selectedDate}
              onNavigate={(date) => setSelectedDate(date)}
              onSelectEvent={(event) => handleEventClick(event.resource)}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: getEventColor(event.type, event.status),
                  borderColor: getEventColor(event.type, event.status),
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "2px 4px",
                  fontSize: "12px",
                },
              })}
              components={{
                event: ({ event }) => (
                  <div className="flex items-center gap-1 p-1">
                    {getEventIcon(event.type)}
                    <span className="truncate">{event.title}</span>
                  </div>
                ),
              }}
              min={new Date(0, 0, 0, 8, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              step={30}
              timeslots={2}
            />
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Events Found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? "No events match your search criteria"
                    : "No events scheduled for the selected course"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredEvents
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Date/Time Column */}
                    <div className="md:w-48 p-4 bg-gray-50 border-b md:border-b-0 md:border-r flex items-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-700">
                          {format(event.start, "d")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(event.start, "MMM")}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                        </div>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getEventColor(event.type, event.status) }}
                            />
                            <Badge variant="outline" className="text-xs">
                              {event.type.replace("_", " ")}
                            </Badge>
                            {getStatusBadge(event.status)}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {event.course.title}
                            </span>
                            {event.module && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-4 h-4" />
                                {event.module}
                              </span>
                            )}
                            {event.attendees_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {event.attendees_count} students
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      )}

      {/* Course Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {courseSchedules.map((schedule) => (
          <Card key={schedule.course_id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {schedule.course_thumbnail ? (
                  <img
                    src={schedule.course_thumbnail}
                    alt={schedule.course_title}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-base line-clamp-1">
                    {schedule.course_title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {schedule.events.length} events scheduled
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-blue-50 rounded text-center">
                  <div className="font-bold text-blue-600">
                    {schedule.statistics.upcoming_lessons}
                  </div>
                  <div className="text-gray-500">Lessons</div>
                </div>
                <div className="p-2 bg-orange-50 rounded text-center">
                  <div className="font-bold text-orange-600">
                    {schedule.statistics.upcoming_deadlines}
                  </div>
                  <div className="text-gray-500">Deadlines</div>
                </div>
                <div className="p-2 bg-green-50 rounded text-center">
                  <div className="font-bold text-green-600">
                    {schedule.statistics.completed_lessons}
                  </div>
                  <div className="text-gray-500">Completed</div>
                </div>
                <div className="p-2 bg-purple-50 rounded text-center">
                  <div className="font-bold text-purple-600">
                    {schedule.events.length}
                  </div>
                  <div className="text-gray-500">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getEventColor(selectedEvent.type, selectedEvent.status) }}
                >
                  {getEventIcon(selectedEvent.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500">{selectedEvent.course.title}</p>
                </div>
                {getStatusBadge(selectedEvent.status)}
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(selectedEvent.start, "h:mm a")} - {format(selectedEvent.end, "h:mm a")}
                    </p>
                  </div>
                </div>

                {selectedEvent.module && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Module</p>
                      <p className="text-sm text-gray-500">{selectedEvent.module}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Description</p>
                      <p className="text-sm text-gray-500">{selectedEvent.description}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <Link2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      {selectedEvent.meeting_url ? (
                        <a
                          href={selectedEvent.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {selectedEvent.location}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">{selectedEvent.location}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.attendees_count !== undefined && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Expected Attendees</p>
                      <p className="text-sm text-gray-500">{selectedEvent.attendees_count} students</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                {selectedEvent.status !== "cancelled" && (
                  <>
                    <Button variant="outline" size="sm">
                      <Bell className="w-4 h-4 mr-2" />
                      Remind
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
                <Button onClick={() => setShowEventDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Schedule a lesson, office hours, or deadline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select
                value={newEvent.type}
                onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="assessment">Assessment/Deadline</SelectItem>
                  <SelectItem value="office_hours">Office Hours</SelectItem>
                  <SelectItem value="live_session">Live Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Course</label>
              <Select
                value={newEvent.course_id}
                onValueChange={(value) => setNewEvent({ ...newEvent, course_id: value })}
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
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={newEvent.start_date}
                  onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={newEvent.start_date}
                  onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location/Meeting URL (Optional)</label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g., Zoom link or room number"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminders Dialog */}
      <Dialog open={showRemindersDialog} onOpenChange={setShowRemindersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upcoming Reminders</DialogTitle>
            <DialogDescription>
              Events that need your attention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {events
              .filter(e => e.start > new Date() && e.start < addDays(new Date(), 3))
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .slice(0, 5)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowRemindersDialog(false);
                    setShowEventDialog(true);
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getEventColor(event.type, event.status) }}
                  >
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.course.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {format(event.start, "MMM d, h:mm a")}
                    </div>
                  </div>
                  <BellRing className="w-4 h-4 text-orange-500" />
                </div>
              ))}

            {events.filter(e => e.start > new Date() && e.start < addDays(new Date(), 3)).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No upcoming reminders
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowRemindersDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}