"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  TEMPLATE_COLUMNS,
  type RosterStudent,
  type RowStatus,
  type ValidatedRow,
} from "@/lib/enrollment/bulk-enrollment-api";
import { buildEnrollmentTemplate, parseEnrollmentWorkbook } from "@/lib/enrollment/bulk-template";

/**
 * ============================================================================
 * Bulk enrolment from a spreadsheet (BE-001)
 * ============================================================================
 *
 * Database → selector → template → upload → preview → correct → validate →
 * enrol. One student record travels the whole way, which is the only reason
 * the round trip can be trusted.
 *
 * ── What was wrong before ─────────────────────────────────────────────────
 *
 * The template shipped three invented people — student1@example.com, John Doe
 * — as the only guidance about what the file should contain. Anyone who
 * followed the example produced rows for students who do not exist, uploaded
 * them, and found out one failure at a time after the import had already run.
 *
 * So the order is inverted: nothing is written until the whole file has been
 * checked against the database and shown back with a verdict per row.
 *
 * ── Why the preview is editable ───────────────────────────────────────────
 *
 * Because the alternative is re-opening Excel, fixing one cell, saving and
 * uploading again. Rows can be corrected, removed, and corrected in bulk, and
 * every edit re-validates against the server rather than trusting the fix.
 */

interface PreviewRow {
  /** Stable across edits and sorting, unlike the spreadsheet row number. */
  key: string;
  row_number: number;
  name: string;
  email: string;
  registration_number: string;
  department: string;
  programme: string;
  phone_number: string;
  notes: string;
  status: RowStatus | "UNCHECKED";
  reason: string | null;
  user_id: string | null;
}

const STATUS_STYLE: Record<string, { label: string; className: string; icon: any }> = {
  VALID: { label: "Valid", className: "bg-success/10 text-success", icon: CheckCircle2 },
  WARNING: { label: "Warning", className: "bg-warning/10 text-warning", icon: AlertTriangle },
  ERROR: { label: "Error", className: "bg-destructive/10 text-destructive", icon: XCircle },
  DUPLICATE: { label: "Duplicate", className: "bg-warning/10 text-warning", icon: AlertTriangle },
  ALREADY_ENROLLED: {
    label: "Already enrolled",
    className: "bg-muted text-muted-foreground",
    icon: UserCheck,
  },
  NOT_FOUND: {
    label: "Student not found",
    className: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  WRONG_INSTITUTION: {
    label: "Other institution",
    className: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  UNCHECKED: { label: "Not checked", className: "bg-muted text-muted-foreground", icon: AlertTriangle },
};

/** Statuses that stop the confirm button. */
const BLOCKING: string[] = ["ERROR", "NOT_FOUND", "WRONG_INSTITUTION", "DUPLICATE", "UNCHECKED"];

export default function BulkEnrollmentExcelWorkflow({
  institutionId,
  institutionName,
  courseId,
  courseTitle,
  onEnrolled,
}: {
  institutionId: string;
  institutionName?: string;
  /** The course rows will be enrolled into. Chosen by the page above. */
  courseId: string;
  courseTitle?: string;
  onEnrolled?: () => void;
}) {
  /* ── the roster ────────────────────────────────────────────────────── */

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterCapped, setRosterCapped] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const { students, capped } = await fetchRoster(institutionId);
      setRoster(students);
      setRosterCapped(capped);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the student roster"));
    } finally {
      setRosterLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  /*
   * Searched in the browser over the roster already fetched. One request per
   * keystroke against a few thousand students answers out of order and is
   * slower than filtering an array that is already here.
   */
  const matchedRoster = useMemo(() => {
    const terms = rosterSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
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
  }, [roster, rosterSearch]);

  const selectedStudents = useMemo(
    () => roster.filter((s) => selectedIds.has(s.id)),
    [roster, selectedIds]
  );

  const toggleStudent = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── the template ──────────────────────────────────────────────────── */

  const [buildingTemplate, setBuildingTemplate] = useState(false);

  /**
   * Who goes into the template.
   *
   * Whoever has been selected; otherwise the first ten of the roster. Both are
   * real students from this institution — the ten are a starting point, not an
   * example, which is the difference between this and the file it replaces.
   */
  const templateStudents = useMemo(() => {
    if (selectedStudents.length > 0) return selectedStudents;
    return roster.slice(0, 10);
  }, [selectedStudents, roster]);

  const downloadTemplate = async () => {
    setBuildingTemplate(true);
    try {
      const blob = await buildEnrollmentTemplate({
        students: templateStudents,
        institutionName,
        courseTitle,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bulk-enrolment-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(
        templateStudents.length === 0
          ? "Template downloaded. No students are listed — this institution has none yet."
          : `Template downloaded with ${templateStudents.length} real ${
              templateStudents.length === 1 ? "student" : "students"
            }.`
      );
    } catch (error: any) {
      toast.error("Could not build the template");
    } finally {
      setBuildingTemplate(false);
    }
  };

  /* ── upload and preview ────────────────────────────────────────────── */

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [previewSearch, setPreviewSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortAsc, setSortAsc] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<PreviewRow | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkField, setBulkField] = useState<"department" | "programme" | "notes">("department");
  const [bulkValue, setBulkValue] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseEnrollmentWorkbook(file);
      if (parsed.length === 0) {
        toast.error("No rows found in that file. Is it the downloaded template?");
        return;
      }

      const mapped: PreviewRow[] = parsed.map((record, index) => ({
        key: `${record.row_number ?? index}-${record.email ?? index}-${index}`,
        row_number: Number(record.row_number) || index + 1,
        name: record.name ?? "",
        email: record.email ?? "",
        registration_number: record.registration_number ?? "",
        department: record.department ?? "",
        programme: record.programme ?? "",
        phone_number: record.phone_number ?? "",
        notes: record.notes ?? "",
        status: "UNCHECKED",
        reason: null,
        user_id: null,
      }));

      setRows(mapped);
      setChecked(new Set());
      toast.success(`${mapped.length} rows read. Checking them against the database…`);
      await runValidation(mapped);
    } catch (error: any) {
      toast.error("Could not read that file");
    } finally {
      setParsing(false);
    }
  };

  /**
   * Every row, checked against the database.
   *
   * The server is the authority. The browser could guess from the roster it
   * already holds, but it cannot know that a student was deactivated or
   * enrolled by somebody else since the file was downloaded.
   */
  const runValidation = useCallback(
    async (target?: PreviewRow[]) => {
      const source = target ?? rows;
      if (source.length === 0) return;
      if (!courseId) {
        toast.error("Choose a course first — rows are validated against it.");
        return;
      }

      setValidating(true);
      try {
        const result = await validateRows({
          institution_id: institutionId,
          course_id: courseId,
          rows: source.map((row) => ({
            row_number: row.row_number,
            name: row.name,
            email: row.email,
            registration_number: row.registration_number,
          })),
        });

        if (!result) return;

        const byRow = new Map<number, ValidatedRow>();
        for (const verdict of result.rows) byRow.set(verdict.row_number, verdict);

        setRows((current) =>
          (target ?? current).map((row) => {
            const verdict = byRow.get(row.row_number);
            if (!verdict) return row;
            return {
              ...row,
              status: verdict.status,
              reason: verdict.reason,
              user_id: verdict.user_id,
              // The database copy wins over the spreadsheet's.
              email: verdict.resolved_email ?? row.email,
              name: verdict.resolved_name ?? row.name,
            };
          })
        );
      } catch (error: any) {
        toast.error(serverMessage(error, "Validation failed"));
      } finally {
        setValidating(false);
      }
    },
    [rows, courseId, institutionId]
  );

  /* ── derived preview state ─────────────────────────────────────────── */

  const visibleRows = useMemo(() => {
    const term = previewSearch.trim().toLowerCase();
    let list = rows;

    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    if (term) {
      list = list.filter((r) =>
        [r.name, r.email, r.registration_number, r.department, r.phone_number]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    return [...list].sort((a, b) =>
      sortAsc ? a.row_number - b.row_number : b.row_number - a.row_number
    );
  }, [rows, previewSearch, statusFilter, sortAsc]);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const row of rows) tally[row.status] = (tally[row.status] || 0) + 1;
    return tally;
  }, [rows]);

  const blockingCount = useMemo(
    () => rows.filter((r) => BLOCKING.includes(r.status)).length,
    [rows]
  );

  const enrollableEmails = useMemo(
    () =>
      rows
        .filter((r) => r.status === "VALID" || r.status === "WARNING")
        .map((r) => r.email)
        .filter(Boolean),
    [rows]
  );

  /* ── selection and bulk actions ────────────────────────────────────── */

  const allVisibleChecked =
    visibleRows.length > 0 && visibleRows.every((r) => checked.has(r.key));

  const toggleAllVisible = () => {
    setChecked((previous) => {
      const next = new Set(previous);
      if (allVisibleChecked) visibleRows.forEach((r) => next.delete(r.key));
      else visibleRows.forEach((r) => next.add(r.key));
      return next;
    });
  };

  const removeChecked = async () => {
    const remaining = rows.filter((r) => !checked.has(r.key));
    setRows(remaining);
    setChecked(new Set());
    setConfirmDeleteOpen(false);
    toast.success(`${rows.length - remaining.length} rows removed.`);
    // Duplicate verdicts depend on what else is in the file, so what is left
    // has to be re-checked rather than keeping stale statuses.
    if (remaining.length > 0) await runValidation(remaining);
  };

  const applyBulkEdit = async () => {
    const value = bulkValue.trim();
    const updated = rows.map((row) =>
      checked.has(row.key) ? { ...row, [bulkField]: value } : row
    );
    setRows(updated);
    setBulkEditOpen(false);
    setBulkValue("");
    toast.success(`${checked.size} rows updated.`);
    await runValidation(updated);
  };

  const saveRowEdit = async (edited: PreviewRow) => {
    const updated = rows.map((row) => (row.key === edited.key ? edited : row));
    setRows(updated);
    setEditing(null);
    await runValidation(updated);
  };

  /* ── confirm ───────────────────────────────────────────────────────── */

  const confirm = async () => {
    if (enrollableEmails.length === 0) {
      toast.error("No rows are ready to enrol.");
      return;
    }
    setConfirming(true);
    try {
      const result = await confirmBulkEnrollment(courseId, enrollableEmails);
      if (result?.success) {
        const enrolled = result.data?.successful?.length ?? enrollableEmails.length;
        toast.success(`${enrolled} ${enrolled === 1 ? "student" : "students"} enrolled.`);
        setRows([]);
        setChecked(new Set());
        onEnrolled?.();
      } else {
        toast.error(result?.message || "Enrolment failed");
      }
    } catch (error: any) {
      toast.error(serverMessage(error, "Enrolment failed"));
    } finally {
      setConfirming(false);
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* ── 1. the roster ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">1 · Choose students</CardTitle>
              <CardDescription>
                {rosterLoading
                  ? "Loading this institution's students…"
                  : `${roster.length} ${
                      roster.length === 1 ? "student" : "students"
                    } in this institution. Pick the ones to include, or download the template as it is.`}
              </CardDescription>
            </div>
            <Button onClick={downloadTemplate} disabled={buildingTemplate || rosterLoading}>
              {buildingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download template
              {templateStudents.length > 0 && ` (${templateStudents.length})`}
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name, registration number, phone or email"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
              <span className="text-xs text-muted-foreground">
                The template will contain exactly these students.
              </span>
            </div>
          )}

          {rosterCapped && (
            <p className="text-xs text-warning">
              {/* Said out loud so a short list is never mistaken for a small
                  institution. */}
              Showing the first 2,000 students. Narrow the search to reach the rest.
            </p>
          )}
        </CardHeader>

        <CardContent>
          {rosterLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : matchedRoster.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                {roster.length === 0
                  ? "No students in this institution yet"
                  : "No student matched that search"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {roster.length === 0
                  ? "The template will download empty rather than filled with examples. Add students to the institution first."
                  : "Try a name, a registration number or a phone number."}
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {matchedRoster.slice(0, 200).map((student) => {
                const isSelected = selectedIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
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
                        {!student.is_active && (
                          <Badge variant="outline" className="text-[10px] text-destructive">
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
                  </button>
                );
              })}
              {matchedRoster.length > 200 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  {matchedRoster.length - 200} more — narrow the search to see them.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. upload ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Upload the completed file</CardTitle>
          <CardDescription>
            Nothing is enrolled on upload. Every row is checked against the database and shown
            back to you first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so the same file can be chosen twice in a row.
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || !courseId}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 transition-colors hover:bg-accent disabled:opacity-60"
          >
            {parsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {parsing ? "Reading the file…" : "Choose the completed .xlsx file"}
            </span>
            <span className="text-xs text-muted-foreground">
              {courseId
                ? "The rows are matched against this institution's students."
                : "Choose a course above first — rows are validated against it."}
            </span>
          </button>
        </CardContent>
      </Card>

      {/* ── 3. preview ──────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">3 · Review before enrolling</CardTitle>
                <CardDescription>
                  {rows.length} rows ·{" "}
                  {blockingCount === 0
                    ? "all rows can proceed"
                    : `${blockingCount} need correcting before you can confirm`}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runValidation()}
                  disabled={validating}
                >
                  {validating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Re-check
                </Button>
                <Button
                  size="sm"
                  onClick={confirm}
                  disabled={confirming || blockingCount > 0 || enrollableEmails.length === 0}
                >
                  {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm enrolment ({enrollableEmails.length})
                </Button>
              </div>
            </div>

            {/* status tally, doubling as filters */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                All {rows.length}
              </button>
              {Object.entries(counts).map(([status, count]) => {
                const style = STATUS_STYLE[status] ?? STATUS_STYLE.UNCHECKED;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-primary text-primary-foreground"
                        : style.className
                    }`}
                  >
                    {style.label} {count}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search these rows"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSortAsc((s) => !s)}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Row {sortAsc ? "↑" : "↓"}
              </Button>
            </div>

            {/*
              The selection toolbar. It names the count in every action, because
              "Delete" alone next to a checkbox column is how someone removes
              forty rows meaning to remove one.
            */}
            {checked.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <span className="text-sm font-semibold text-foreground">
                  {checked.size} {checked.size === 1 ? "row" : "rows"} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3 w-3" />
                  Edit {checked.size}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Delete {checked.size}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
                  Clear selection
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allVisibleChecked}
                        onCheckedChange={toggleAllVisible}
                        aria-label="Select all shown"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Row
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Student
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Reg. no.
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Department
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="w-20 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.UNCHECKED;
                    const StatusIcon = style.icon;
                    const isChecked = checked.has(row.key);
                    const isBlocking = BLOCKING.includes(row.status);

                    return (
                      <tr
                        key={row.key}
                        className={`border-b border-border last:border-b-0 ${
                          isBlocking ? "bg-destructive/[0.03]" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              setChecked((previous) => {
                                const next = new Set(previous);
                                if (next.has(row.key)) next.delete(row.key);
                                else next.add(row.key);
                                return next;
                              })
                            }
                            aria-label={`Select row ${row.row_number}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.row_number}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground">{row.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{row.email || "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.registration_number || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.department || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.phone_number || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {style.label}
                          </span>
                          {row.reason && (
                            <p className="mt-1 max-w-xs text-[11px] leading-snug text-muted-foreground">
                              {row.reason}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(row)}
                              title="Edit this row"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const remaining = rows.filter((r) => r.key !== row.key);
                                setRows(remaining);
                                if (remaining.length > 0) await runValidation(remaining);
                              }}
                              className="text-destructive hover:text-destructive"
                              title="Remove this row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleRows.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No row matches that filter.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── edit one row ───────────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit row {editing?.row_number}</DialogTitle>
            <DialogDescription>
              Corrections are re-checked against the database when you save.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPLATE_COLUMNS.filter((c) => c.key !== "notes").map((column) => (
                <div key={String(column.key)} className="space-y-1.5">
                  <Label className="text-xs">{column.header}</Label>
                  <Input
                    value={(editing as any)[column.key] ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [column.key]: e.target.value } as PreviewRow)
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && saveRowEdit(editing)}>Save and re-check</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── edit many ──────────────────────────────────────────────────── */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {checked.size} rows</DialogTitle>
            <DialogDescription>
              Sets one field across every selected row. Identifiers are not offered here —
              changing an email in bulk would point many rows at the wrong people.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <select
                value={bulkField}
                onChange={(e) => setBulkField(e.target.value as any)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="department">Department</option>
                <option value="programme">Programme / Class</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Leave empty to clear the field"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkEdit}>Apply to {checked.size}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── delete many ────────────────────────────────────────────────── */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {checked.size} rows?</AlertDialogTitle>
            <AlertDialogDescription>
              They are taken out of this preview only — nothing has been enrolled yet, and the
              uploaded file is untouched. The rows that remain are re-checked afterwards,
              because duplicate verdicts depend on what else is in the file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeChecked}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove {checked.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
