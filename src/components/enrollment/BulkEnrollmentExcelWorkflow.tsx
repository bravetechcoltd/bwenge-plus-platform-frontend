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
import EnrollmentPreviewTable, {
  toPreviewRows,
  type PreviewRow,
} from "./EnrollmentPreviewTable";

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



  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseEnrollmentWorkbook(file);
      if (parsed.length === 0) {
        toast.error("No rows found in that file. Is it the downloaded template?");
        return;
      }

      /*
       * The rows go to the shared preview table, which validates them as soon
       * as they arrive. Parsing and checking used to happen here; only the
       * parsing is this component's business.
       */
      setRows(toPreviewRows(parsed));
      toast.success(`${parsed.length} rows read. Checking them against the database…`);
    } catch (error: any) {
      toast.error("Could not read that file");
    } finally {
      setParsing(false);
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
      {/*
        BE-003. The shared preview table.

        This was the table itself, and the Upload & Enroll tab had none at
        all. Copying it across would have left two of them — identical the day
        they were written, divergent on the first change to either: a new
        status, a different blocking rule, a fix to the duplicate check.
      */}
      <EnrollmentPreviewTable
        institutionId={institutionId}
        courseId={courseId}
        rows={rows}
        onRowsChange={setRows}
        title="3 · Review before enrolling"
        onEnrolled={() => {
          setRows([]);
          onEnrolled?.();
        }}
      />
    </div>
  );
}
