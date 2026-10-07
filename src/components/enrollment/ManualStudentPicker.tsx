"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  confirmBulkEnrollment,
  fetchRoster,
  serverMessage,
  validateRows,
  type RosterStudent,
  type RowStatus,
} from "@/lib/enrollment/bulk-enrollment-api";

/**
 * ============================================================================
 * Enrolling from the student list (BE-002)
 * ============================================================================
 *
 * Manual entry was a textarea: type one email address per line, press enrol,
 * find out afterwards which ones were wrong. An admin enrolling thirty of
 * their own students had to know thirty addresses by heart or copy them out of
 * another screen, and a single typo failed silently inside the batch.
 *
 * The students are already in the database. This lists them, lets them be
 * picked and un-picked, and checks the selection against the course before
 * anything is written — the same validation the spreadsheet workflow uses, so
 * the two cannot disagree about who can be enrolled.
 *
 * ── Why already-enrolled students stay visible ───────────────────────────
 *
 * Hiding them would answer "why is this person missing" with silence. They are
 * listed, marked, and not selectable, so the admin can see that the enrolment
 * they were about to make has already happened.
 */

interface Props {
  institutionId: string;
  courseId: string;
  courseTitle?: string;
  onEnrolled?: () => void;
}

type StudentStatus = RowStatus | "AVAILABLE";

export default function ManualStudentPicker({
  institutionId,
  courseId,
  courseTitle,
  onEnrolled,
}: Props) {
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [statuses, setStatuses] = useState<Map<string, StudentStatus>>(new Map());
  const [checking, setChecking] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ── the roster ────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { students } = await fetchRoster(institutionId);
      setRoster(students);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the student list"));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Who is already on this course.
   *
   * Asked of the validator rather than worked out here, so this screen and the
   * spreadsheet one apply the same rule. It runs when the course changes,
   * because the answer is about the pair and not about the student.
   */
  const checkAgainstCourse = useCallback(async () => {
    if (!courseId || roster.length === 0) {
      setStatuses(new Map());
      return;
    }

    setChecking(true);
    try {
      const result = await validateRows({
        institution_id: institutionId,
        course_id: courseId,
        rows: roster.map((student, index) => ({
          row_number: index + 1,
          name: student.name,
          email: student.email,
          registration_number: student.registration_number,
        })),
      });

      const next = new Map<string, StudentStatus>();
      if (result) {
        result.rows.forEach((verdict, index) => {
          const student = roster[index];
          if (!student) return;
          next.set(student.id, verdict.status === "VALID" ? "AVAILABLE" : verdict.status);
        });
      }
      setStatuses(next);

      /*
       * Anything no longer enrollable is dropped from the selection rather than
       * left checked and silently skipped at enrol time.
       */
      setSelected((current) => {
        const kept = new Set<string>();
        current.forEach((id) => {
          const status = next.get(id);
          if (!status || status === "AVAILABLE" || status === "WARNING") kept.add(id);
        });
        return kept;
      });
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not check the course"));
    } finally {
      setChecking(false);
    }
  }, [courseId, institutionId, roster]);

  useEffect(() => {
    checkAgainstCourse();
  }, [checkAgainstCourse]);

  /* ── derived ───────────────────────────────────────────────────────── */

  const statusOf = (student: RosterStudent): StudentStatus =>
    statuses.get(student.id) ?? (student.is_active ? "AVAILABLE" : "ERROR");

  const canEnrol = (student: RosterStudent) => {
    const status = statusOf(student);
    return status === "AVAILABLE" || status === "WARNING";
  };

  // Filtered in the browser over a roster already fetched: a request per
  // keystroke answers out of order and is slower than filtering an array.
  const visible = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return roster;
    return roster.filter((student) => {
      const haystack = [
        student.name,
        student.email,
        student.registration_number,
        student.phone_number,
        student.department,
        student.programme,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [roster, search]);

  const selectableVisible = useMemo(() => visible.filter(canEnrol), [visible, statuses]);
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((s) => selected.has(s.id));

  const selectedStudents = useMemo(
    () => roster.filter((s) => selected.has(s.id)),
    [roster, selected]
  );

  const alreadyEnrolled = useMemo(
    () => roster.filter((s) => statusOf(s) === "ALREADY_ENROLLED").length,
    [roster, statuses]
  );

  /* ── selection ─────────────────────────────────────────────────────── */

  const toggle = (student: RosterStudent) => {
    if (!canEnrol(student)) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) selectableVisible.forEach((s) => next.delete(s.id));
      else selectableVisible.forEach((s) => next.add(s.id));
      return next;
    });
  };

  /* ── enrol ─────────────────────────────────────────────────────────── */

  const enrol = async () => {
    if (selectedStudents.length === 0) return;
    setEnrolling(true);
    try {
      const result = await confirmBulkEnrollment(
        courseId,
        selectedStudents.map((s) => s.email)
      );
      if (result?.success) {
        const count = result.data?.successful?.length ?? selectedStudents.length;
        toast.success(`${count} ${count === 1 ? "student" : "students"} enrolled.`);
        setSelected(new Set());
        setConfirmOpen(false);
        // The course now has new enrolments, so the statuses are stale.
        await checkAgainstCourse();
        onEnrolled?.();
      } else {
        toast.error(result?.message || "Enrolment failed");
      }
    } catch (error: any) {
      toast.error(serverMessage(error, "Enrolment failed"));
    } finally {
      setEnrolling(false);
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, registration number, phone or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {checking && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking the course…
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllVisible}
            disabled={selectableVisible.length === 0}
          >
            {allVisibleSelected ? "Unselect shown" : `Select shown (${selectableVisible.length})`}
          </Button>
        </div>
      </div>

      {/*
        The running total, with the two things it depends on: which course, and
        who is already on it. Without the second number an admin cannot tell a
        short list from a course that is already full of their students.
      */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{roster.length}</span> students
        </span>
        <span>
          <span className="font-semibold text-foreground">{selected.size}</span> selected
        </span>
        {alreadyEnrolled > 0 && (
          <span>
            <span className="font-semibold text-foreground">{alreadyEnrolled}</span> already on{" "}
            {courseTitle ? `“${courseTitle}”` : "this course"}
          </span>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <span className="text-sm font-semibold text-foreground">
            {selected.size} {selected.size === 1 ? "student" : "students"} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X className="mr-1 h-3 w-3" />
            Clear selection
          </Button>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setConfirmOpen(true)}
            disabled={!courseId || enrolling}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll {selected.size}
          </Button>
        </div>
      )}

      {/* ── the list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {roster.length === 0
              ? "No students in this institution yet"
              : "No student matched that search"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {roster.length === 0
              ? "Students appear here once they are members of this institution."
              : "Try a name, a registration number or a phone number."}
          </p>
        </div>
      ) : (
        <div className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {visible.map((student) => {
            const status = statusOf(student);
            const isSelected = selected.has(student.id);
            const enrollable = canEnrol(student);

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => toggle(student)}
                disabled={!enrollable}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : enrollable
                      ? "border-border hover:bg-accent"
                      : "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-70"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={!enrollable}
                  className="pointer-events-none"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {student.name}
                    </span>
                    {student.registration_number && (
                      <Badge variant="outline" className="text-[10px]">
                        {student.registration_number}
                      </Badge>
                    )}
                    {status === "ALREADY_ENROLLED" && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        <UserCheck className="mr-1 h-2.5 w-2.5" />
                        Already enrolled
                      </Badge>
                    )}
                    {status === "ERROR" && (
                      <Badge variant="outline" className="text-[10px] text-destructive">
                        <XCircle className="mr-1 h-2.5 w-2.5" />
                        Deactivated
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[student.email, student.department, student.phone_number]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── confirm ──────────────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Enroll {selected.size} {selected.size === 1 ? "student" : "students"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {courseTitle ? (
                <>
                  They will be enrolled in <span className="font-medium">{courseTitle}</span>{" "}
                  straight away, and will be able to start it.
                </>
              ) : (
                <>They will be enrolled in the selected course straight away.</>
              )}{" "}
              Students already on the course were left out of the selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enrolling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={enrol} disabled={enrolling}>
              {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll {selected.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
