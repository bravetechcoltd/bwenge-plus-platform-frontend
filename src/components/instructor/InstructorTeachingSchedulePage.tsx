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
import { Textarea } from "../ui/textarea";

// Setup calendar
const localizer = momentLocalizer(moment);

interface TeachingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "LESSON" | "ASSESSMENT" | "MEETING" | "OFFICE_HOURS" | "WEBINAR" | "DEADLINE" | "OTHER";
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
  is_recurring?: boolean;
  recurrence_pattern?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  created_by: {
    id: string;
    name: string;
  };
  attendees_count?: number;
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  
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
      
      // Fetch schedule from backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch schedule");
      }

      const data = await response.json();
      
      if (data.success) {
        const fetchedEvents = data.data.events.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        
        setEvents(fetchedEvents);
        setCourses(data.data.courses || []);
        
        // Calculate statistics
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const stats: ScheduleStats = {
          total_events: fetchedEvents.length,
          events_today: fetchedEvents.filter((e: TeachingEvent) => 
            e.start >= today && e.start < tomorrow
          ).length,
          upcoming_events: fetchedEvents.filter((e: TeachingEvent) => e.start > now).length,
          completed_events: fetchedEvents.filter((e: TeachingEvent) => e.status === "COMPLETED").length,
          courses_with_events: data.data.courses?.length || 0,
          pending_reminders: fetchedEvents.filter((e: TeachingEvent) => 
            e.start > now && e.start < addDays(now, 3)
          ).length,
          upcoming_deadlines: fetchedEvents.filter((e: TeachingEvent) => 
            e.type === "DEADLINE" && e.start > now && e.start < addDays(now, 7)
          ).length,
          live_sessions_today: fetchedEvents.filter((e: TeachingEvent) => 
            (e.type === "WEBINAR" || e.type === "MEETING") && e.start >= today && e.start < tomorrow
          ).length,
        };

        setStats(stats);
      }
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
    setCreatingEvent(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newEvent.title,
            type: newEvent.type.toUpperCase(),
            course_id: newEvent.course_id,
            start_date: `${newEvent.start_date}T${newEvent.start_time}:00`,
            end_date: `${newEvent.start_date}T${newEvent.end_time}:00`,
            description: newEvent.description || undefined,
            location: newEvent.location || undefined,
            meeting_url: newEvent.meeting_url || undefined,
            is_recurring: newEvent.is_recurring,
            recurrence_pattern: newEvent.is_recurring ? newEvent.recurrence_pattern.toUpperCase() : undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success("Event created successfully");
        setShowCreateDialog(false);
        setNewEvent({
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
        fetchTeachingSchedule();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    setNewEvent({
      title: selectedEvent.title,
      type: selectedEvent.type.toLowerCase(),
      course_id: selectedEvent.course.id,
      start_date: format(selectedEvent.start, "yyyy-MM-dd"),
      start_time: format(selectedEvent.start, "HH:mm"),
      end_time: format(selectedEvent.end, "HH:mm"),
      description: selectedEvent.description || "",
      location: selectedEvent.location || "",
      meeting_url: selectedEvent.meeting_url || "",
      is_recurring: selectedEvent.is_recurring || false,
      recurrence_pattern: selectedEvent.recurrence_pattern?.toLowerCase() || "weekly",
    });
    setShowEventDialog(false);
    setShowEditDialog(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    setEditingEvent(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule/events/${selectedEvent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newEvent.title,
            type: newEvent.type.toUpperCase(),
            course_id: newEvent.course_id,
            start_date: `${newEvent.start_date}T${newEvent.start_time}:00`,
            end_date: `${newEvent.start_date}T${newEvent.end_time}:00`,
            description: newEvent.description || undefined,
            location: newEvent.location || undefined,
            meeting_url: newEvent.meeting_url || undefined,
            is_recurring: newEvent.is_recurring,
            recurrence_pattern: newEvent.is_recurring ? newEvent.recurrence_pattern.toUpperCase() : undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success("Event updated successfully");
        setShowEditDialog(false);
        setNewEvent({
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
        fetchTeachingSchedule();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    } finally {
      setEditingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEvent(true);
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
        toast.success("Event deleted successfully");
      } else {
        toast.error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleSendReminder = async (eventId: string) => {
    setSendingReminder(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/schedule/events/${eventId}/remind`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Reminder sent to all participants");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to send reminder");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  // Filter events by course and search term
  const filteredEvents = events
    .filter(e => selectedCourse === "all" || e.course.id === selectedCourse)
    .filter(e => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        e.title.toLowerCase().includes(search) ||
        e.course.title.toLowerCase().includes(search) ||
        e.description?.toLowerCase().includes(search) ||
        e.type.toLowerCase().includes(search) ||
        e.location?.toLowerCase().includes(search)
      );
    });

  // Get upcoming reminders (events in next 3 days)
  const upcomingReminders = events
    .filter(e => {
      const now = new Date();
      const threeDaysFromNow = addDays(now, 3);
      return e.start > now && e.start < threeDaysFromNow && e.status !== "CANCELLED";
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const getEventColor = (type: string, status: string) => {
    if (status === "CANCELLED") return "#ef4444";
    if (status === "COMPLETED") return "#10b981";
    
    switch (type) {
      case "LESSON":
        return "#3b82f6";
      case "ASSESSMENT":
      case "DEADLINE":
        return "#f59e0b";
      case "OFFICE_HOURS":
        return "#8b5cf6";
      case "MEETING":
      case "WEBINAR":
        return "#ec4899";
      default:
        return "#6b7280";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "LESSON":
        return <BookOpen className="w-4 h-4" />;
      case "ASSESSMENT":
      case "DEADLINE":
        return <FileText className="w-4 h-4" />;
      case "OFFICE_HOURS":
        return <Users className="w-4 h-4" />;
      case "MEETING":
      case "WEBINAR":
        return <Video className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case "CANCELLED":
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
            {upcomingReminders.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {upcomingReminders.length}
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

      {/* Course Schedules - Removed as we're using backend data */}

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
                {selectedEvent.status !== "CANCELLED" && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendReminder(selectedEvent.id)}
                      disabled={sendingReminder}
                    >
                      {sendingReminder ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4 mr-2" />
                      )}
                      Remind
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleEditEvent}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      disabled={deletingEvent}
                    >
                      {deletingEvent ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Schedule a lesson, office hours, or deadline
            </DialogDescription>
          </DialogHeader>
         
          <div className="space-y-4 py-4">
            {/* Event Type and Course - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type</label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="office_hours">Office Hours</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Course</label>
                <Select
                  value={newEvent.course_id}
                  onValueChange={(value) => setNewEvent({ ...newEvent, course_id: value })}
                >
                  <SelectTrigger className="w-full">
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
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
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

            {/* Time Range */}
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

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            {/* Location/Meeting URL */}
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
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={creatingEvent}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={creatingEvent}
            >
              {creatingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details
            </DialogDescription>
          </DialogHeader>
         
          <div className="space-y-4 py-4">
            {/* Event Type and Course - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type</label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="office_hours">Office Hours</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Course</label>
                <Select
                  value={newEvent.course_id}
                  onValueChange={(value) => setNewEvent({ ...newEvent, course_id: value })}
                >
                  <SelectTrigger className="w-full">
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
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
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

            {/* Time Range */}
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

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            {/* Location/Meeting URL */}
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setNewEvent({
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
              }}
              disabled={editingEvent}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateEvent}
              disabled={editingEvent}
            >
              {editingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Event"
              )}
            </Button>
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
            {upcomingReminders.length > 0 ? (
              upcomingReminders.slice(0, 10).map((event) => (
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
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No upcoming reminders</p>
                <p className="text-xs mt-1">Events in the next 3 days will appear here</p>
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