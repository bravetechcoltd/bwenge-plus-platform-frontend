"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  serverMessage,
  validateRows,
  TEMPLATE_COLUMNS,
  type RowStatus,
  type ValidatedRow,
} from "@/lib/enrollment/bulk-enrollment-api";

/**
 * ============================================================================
 * The enrolment preview (BE-003)
 * ============================================================================
 *
 * Everything between "a file was read" and "these people are enrolled":
 * validation against the database, a verdict per row, correcting rows, removing
 * them, bulk edits, and the confirm step.
 *
 * ── Why it is its own component ───────────────────────────────────────────
 *
 * Two tabs upload a spreadsheet. Upload & Enroll had no preview at all — it
 * read the file and enrolled from it, so a wrong address was discovered after
 * the import had run — and the Excel Workflow tab had the preview built into
 * it. Copying that table into the other tab would have produced two of them,
 * identical the day they were written and divergent on the first change to
 * either: a new status, a different blocking rule, a fix to the duplicate
 * check. One table, used twice.
 *
 * ── Controlled on purpose ────────────────────────────────────────────────
 *
 * The rows live in the parent, because the parent is what reads the file and
 * what decides when to clear them. This component owns the verdicts, which are
 * its own business, and nothing else.
 */

export interface PreviewRow {
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

export const STATUS_STYLE: Record<string, { label: string; className: string; icon: any }> = {
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
  UNCHECKED: {
    label: "Not checked",
    className: "bg-muted text-muted-foreground",
    icon: AlertTriangle,
  },
};

/** Statuses that stop the confirm button. */
export const BLOCKING: string[] = [
  "ERROR",
  "NOT_FOUND",
  "WRONG_INSTITUTION",
  "DUPLICATE",
  "UNCHECKED",
];

/** Turns parsed spreadsheet records into preview rows. */
export function toPreviewRows(parsed: Array<Record<string, string>>): PreviewRow[] {
  return parsed.map((record, index) => ({
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
}

interface Props {
  institutionId: string;
  courseId: string;
  rows: PreviewRow[];
  onRowsChange: (rows: PreviewRow[]) => void;
  onEnrolled?: () => void;
  /** Shown above the table. */
  title?: string;
}

export default function EnrollmentPreviewTable({
  institutionId,
  courseId,
  rows,
  onRowsChange,
  onEnrolled,
  title = "Review before enrolling",
}: Props) {
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortAsc, setSortAsc] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<PreviewRow | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkField, setBulkField] = useState<"department" | "programme" | "notes">("department");
  const [bulkValue, setBulkValue] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  /**
   * Every row, checked against the database.
   *
   * The server is the authority. The browser could guess, but it cannot know
   * that a student was deactivated or enrolled by somebody else since the file
   * was filled in.
   */
  const runValidation = useCallback(
    async (target: PreviewRow[]) => {
      if (target.length === 0) return;
      if (!courseId) {
        toast.error("Choose a course first — rows are validated against it.");
        return;
      }

      setValidating(true);
      try {
        const result = await validateRows({
          institution_id: institutionId,
          course_id: courseId,
          rows: target.map((row) => ({
            row_number: row.row_number,
            name: row.name,
            email: row.email,
            registration_number: row.registration_number,
          })),
        });
        if (!result) return;

        const byRow = new Map<number, ValidatedRow>();
        for (const verdict of result.rows) byRow.set(verdict.row_number, verdict);

        onRowsChange(
          target.map((row) => {
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
    [courseId, institutionId, onRowsChange]
  );

  /*
   * Rows that have never been checked are checked as soon as they appear, so a
   * fresh upload does not sit there claiming "Not checked" until someone
   * presses a button.
   */
  useEffect(() => {
    if (rows.length > 0 && rows.every((r) => r.status === "UNCHECKED") && courseId) {
      runValidation(rows);
    }
    // Keyed on length and course, not on rows: re-running on every edit would
    // fight the validation that each edit already triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, courseId]);

  /* ── derived ───────────────────────────────────────────────────────── */

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
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
  }, [rows, search, statusFilter, sortAsc]);

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

  const allVisibleChecked =
    visibleRows.length > 0 && visibleRows.every((r) => checked.has(r.key));

  /* ── actions ───────────────────────────────────────────────────────── */

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
    const removed = rows.length - remaining.length;
    onRowsChange(remaining);
    setChecked(new Set());
    setConfirmDeleteOpen(false);
    toast.success(`${removed} ${removed === 1 ? "row" : "rows"} removed.`);
    // Duplicate verdicts depend on what else is in the file, so what remains
    // has to be re-checked rather than keeping stale statuses.
    if (remaining.length > 0) await runValidation(remaining);
  };

  const removeOne = async (row: PreviewRow) => {
    const remaining = rows.filter((r) => r.key !== row.key);
    onRowsChange(remaining);
    if (remaining.length > 0) await runValidation(remaining);
  };

  const applyBulkEdit = async () => {
    const value = bulkValue.trim();
    const updated = rows.map((row) =>
      checked.has(row.key) ? { ...row, [bulkField]: value } : row
    );
    onRowsChange(updated);
    setBulkEditOpen(false);
    setBulkValue("");
    toast.success(`${checked.size} rows updated.`);
    await runValidation(updated);
  };

  const saveRowEdit = async (edited: PreviewRow) => {
    const updated = rows.map((row) => (row.key === edited.key ? edited : row));
    onRowsChange(updated);
    setEditing(null);
    await runValidation(updated);
  };

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
        onRowsChange([]);
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

  if (rows.length === 0) return null;

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
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
              onClick={() => runValidation(rows)}
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
                  statusFilter === status ? "bg-primary text-primary-foreground" : style.className
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortAsc((s) => !s)}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Row {sortAsc ? "↑" : "↓"}
          </Button>
        </div>

        {/*
          The selection toolbar names the count in every action, because
          "Delete" alone beside a checkbox column is how someone removes forty
          rows meaning to remove one.
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
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Row</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  Reg. no.
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  Department
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Phone</th>
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
                          onClick={() => removeOne(row)}
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

      {/* ── edit one row ─────────────────────────────────────────────── */}
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

      {/* ── edit many ────────────────────────────────────────────────── */}
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

      {/* ── delete many ──────────────────────────────────────────────── */}
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
    </Card>
  );
}
