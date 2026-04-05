"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Mail,
  UserX,
  FileText,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  AlertCircle,
  Calendar,
  MapPin,
  BookOpen,
  Users,
  BarChart,
  MessageSquare,
  Download,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface StudentDetailModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (student: any) => void;
  onUnenroll: (student: any) => void;
}

export default function StudentDetailModal({
  student,
  isOpen,
  onClose,
  onSendMessage,
  onUnenroll,
}: StudentDetailModalProps) {
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                {student.student.first_name} {student.student.last_name}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Student Profile */}
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage
                    src={student.student.profile_picture_url}
                    alt={student.student.first_name}
                  />
                  <AvatarFallback className="text-lg">
                    {student.student.first_name?.[0]}
                    {student.student.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="text-xl font-bold text-foreground">
                  {student.student.first_name} {student.student.last_name}
                </h3>
                <p className="text-muted-foreground mt-1">{student.student.email}</p>
                
                {student.student.country && (
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {student.student.city && `${student.student.city}, `}
                      {student.student.country}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {student.progress.completion_percentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {student.enrollment.days_since_enrollment}
                    </div>
                    <div className="text-sm text-muted-foreground">Days Enrolled</div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Enrollment Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={
                    student.enrollment.status === "ACTIVE" ? "bg-success/15 text-success" :
                    student.enrollment.status === "COMPLETED" ? "bg-primary/15 text-primary" :
                    "bg-muted text-foreground"
                  }>
                    {student.enrollment.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Enrolled</span>
                  <span className="text-sm">
                    {format(new Date(student.enrollment.enrolled_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Activity</span>
                  <span className="text-sm">
                    {student.enrollment.last_accessed_at
                      ? format(new Date(student.enrollment.last_accessed_at), "MMM d, yyyy")
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onSendMessage(student)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {}}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Submissions
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {}}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => onUnenroll(student)}
              >
                <UserX className="h-4 w-4 mr-2" />
                Unenroll Student
              </Button>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="overview">
                  <Activity className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="progress">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="assessments">
                  <Award className="h-4 w-4 mr-2" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Clock className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Performance Indicators */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Performance Indicators</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-foreground">
                        {student.progress.completion_percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-foreground">
                        {student.details?.performance_indicators?.engagement_score || 0}/10
                      </div>
                      <div className="text-sm text-muted-foreground">Engagement</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-foreground">
                        {student.progress.rank || "—"}
                      </div>
                      <div className="text-sm text-muted-foreground">Class Rank</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-foreground">
                        {student.progress.assessments.average_score || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                </div>

                {/* Progress Breakdown */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Progress Breakdown</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Lessons</span>
                        <span className="text-sm font-medium">
                          {student.progress.lessons.completed} / {student.progress.lessons.total}
                        </span>
                      </div>
                      <Progress 
                        value={(student.progress.lessons.completed / student.progress.lessons.total) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Modules</span>
                        <span className="text-sm font-medium">
                          {student.progress.modules.completed} / {student.progress.modules.total}
                        </span>
                      </div>
                      <Progress 
                        value={(student.progress.modules.completed / student.progress.modules.total) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Assessments</span>
                        <span className="text-sm font-medium">
                          {student.progress.assessments.completed} / {student.progress.assessments.total}
                        </span>
                      </div>
                      <Progress 
                        value={(student.progress.assessments.completed / student.progress.assessments.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Position */}
                {student.details?.current_position && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Current Position</h4>
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {student.details.current_position.module_title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {student.details.current_position.lesson_title}
                          </p>
                          {student.details.current_position.last_watched_video_progress > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Video Progress</span>
                                <span className="text-xs font-medium">
                                  {student.details.current_position.last_watched_video_progress}%
                                </span>
                              </div>
                              <Progress 
                                value={student.details.current_position.last_watched_video_progress} 
                                className="h-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* At-Risk Warning */}
                {student.details?.performance_indicators?.at_risk && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-destructive">Student At Risk</h4>
                        <p className="text-sm text-destructive mt-1">
                          This student has been flagged as at-risk based on their performance.
                        </p>
                        {student.details.performance_indicators.risk_factors?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-destructive mb-1">Risk Factors:</p>
                            <ul className="text-xs text-destructive list-disc list-inside">
                              {student.details.performance_indicators.risk_factors.map(
                                (factor: string, index: number) => (
                                  <li key={index}>{factor.replace(/_/g, " ")}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-6">
                {/* Time Metrics */}
                {student.details?.time_metrics && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Time Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-foreground">
                          {Math.floor(student.details.time_metrics.total_time_spent_minutes / 60)}
                        </div>
                        <div className="text-sm text-muted-foreground">Hours Spent</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-foreground">
                          {student.details.time_metrics.average_session_duration_minutes.toFixed(0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Session (min)</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-foreground">
                          {student.details.time_metrics.total_sessions}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Sessions</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className={`text-2xl font-bold ${
                          student.details.time_metrics.on_track ? "text-success" : "text-destructive"
                        }`}>
                          {student.details.time_metrics.on_track ? "On Track" : "Behind"}
                        </div>
                        <div className="text-sm text-muted-foreground">Status</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estimated Completion */}
                {student.details?.time_metrics?.estimated_completion_date && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Estimated Completion</h4>
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {format(
                              new Date(student.details.time_metrics.estimated_completion_date),
                              "MMMM d, yyyy"
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Based on current learning pace
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity Timeline */}
                {student.details?.recent_activity && student.details.recent_activity.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Recent Activity</h4>
                    <div className="space-y-3">
                      {student.details.recent_activity.map((activity: any, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`p-1 rounded mt-1 ${
                            activity.type === "lesson_completion"
                              ? "bg-success/15 text-success"
                              : "bg-primary/15 text-primary"
                          }`}>
                            {activity.type === "lesson_completion" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">
                              {activity.type === "lesson_completion" ? "Completed" : "Submitted"}{" "}
                              <span className="font-medium">{activity.lesson_title}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Assessments Tab */}
              <TabsContent value="assessments" className="space-y-6">
                {student.progress.assessments.total > 0 ? (
                  <>
                    {/* Assessment Summary */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Assessment Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-foreground">
                            {student.progress.assessments.average_score.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Average Score</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-foreground">
                            {student.progress.assessments.highest_score}%
                          </div>
                          <div className="text-sm text-muted-foreground">Highest Score</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-foreground">
                            {student.progress.assessments.passed}
                          </div>
                          <div className="text-sm text-muted-foreground">Passed</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-foreground">
                            {student.progress.assessments.failed}
                          </div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                      </div>
                    </div>

                    {/* Assessment List */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Recent Assessments</h4>
                      <div className="space-y-2">
                        {[
                          { title: "Quiz 1: Basics", score: 85, passed: true },
                          { title: "Midterm Exam", score: 72, passed: true },
                          { title: "Assignment 3", score: 91, passed: true },
                          { title: "Quiz 2: Advanced", score: 55, passed: false },
                        ].map((assessment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1 rounded ${
                                assessment.passed
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}>
                                {assessment.passed ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </div>
                              <span className="font-medium">{assessment.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${
                                assessment.passed ? "text-success" : "text-destructive"
                              }`}>
                                {assessment.score}%
                              </span>
                              <Badge
                                variant={assessment.passed ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {assessment.passed ? "Passed" : "Failed"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assessment data available</p>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Detailed activity timeline coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This feature will show a complete history of the student's activities
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onSendMessage(student)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}