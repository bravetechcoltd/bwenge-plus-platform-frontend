"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Key,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  generateAccessCodes,
  listAccessCodes,
  listCodeCourses,
  revokeAccessCode,
  serverMessage,
  type AccessCode,
  type AccessCodeCourse,
  type AccessCodeList,
} from "@/lib/enrollment/access-codes-api";

/**
 * ============================================================================
 * SPOC access codes (AC-001)
 * ============================================================================
 *
 * The page the institution dashboard's "Generate Codes" button has been
 * pointing at. It did not exist, so the button led to a 404.
 *
 * ── What it has to answer ─────────────────────────────────────────────────
 *
 * Minting codes was already possible through the API, and that was the whole
 * problem: an admin generated a batch, the codes came back once in a response,
 * and there was no way to see them again, tell a spent one from an unused one,
 * or withdraw one sent to the wrong address. Three questions, and the page is
 * built around them rather than around the generate button.
 *
 * Codes are a credential, so copy and export are first-class — an admin has to
 * get them out of here and into a message — and a redeemed code is never
 * offered for deletion, because removing it would erase how someone enrolled
 * without un-enrolling them.
 */
export default function AccessCodesPage({ institutionId }: { institutionId: string }) {
  const [courses, setCourses] = useState<AccessCodeCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccessCodeList | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [count, setCount] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<AccessCode | null>(null);

  /* ── loading ───────────────────────────────────────────────────────── */

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const list = await listCodeCourses(institutionId);
      setCourses(list);
      // Open on the first course rather than an empty right-hand panel.
      setSelectedCourseId((current) => current ?? list[0]?.id ?? null);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load this institution's private courses"));
    } finally {
      setCoursesLoading(false);
    }
  }, [institutionId]);

  const loadDetail = useCallback(async (courseId: string) => {
    setDetailLoading(true);
    try {
      setDetail(await listAccessCodes(courseId));
    } catch (error: any) {
      setDetail(null);
      toast.error(serverMessage(error, "Could not load the access codes"));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourseId) loadDetail(selectedCourseId);
  }, [selectedCourseId, loadDetail]);

  /* ── derived ───────────────────────────────────────────────────────── */

  const visibleCodes = useMemo(() => {
    const term = search.trim().toUpperCase();
    const codes = detail?.codes ?? [];
    if (!term) return codes;
    return codes.filter(
      (c) =>
        c.code.includes(term) ||
        (c.used_by?.name ?? "").toUpperCase().includes(term) ||
        (c.used_by?.email ?? "").toUpperCase().includes(term)
    );
  }, [detail, search]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  /* ── actions ───────────────────────────────────────────────────────── */

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      // Clipboard access is denied in some browsers and over plain http.
      toast.error("Could not reach the clipboard. Select the code and copy it by hand.");
    }
  };

  const copyAllAvailable = () => {
    const available = (detail?.codes ?? []).filter((c) => !c.is_used).map((c) => c.code);
    if (available.length === 0) {
      toast.error("No unused codes to copy.");
      return;
    }
    copy(available.join("\n"), `${available.length} unused codes`);
  };

  /**
   * CSV of the unused codes.
   *
   * Built and downloaded in the browser rather than asked of the server: the
   * list is already here, and a round trip would only add a way to fail.
   */
  const exportCsv = () => {
    const available = (detail?.codes ?? []).filter((c) => !c.is_used);
    if (available.length === 0) {
      toast.error("No unused codes to export.");
      return;
    }
    const title = (detail?.course.title ?? "course").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const csv = ["access_code", ...available.map((c) => c.code)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}-access-codes.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${available.length} codes exported.`);
  };

  const generate = async () => {
    const howMany = Number(count);
    if (!Number.isFinite(howMany) || howMany < 1) {
      toast.error("Enter how many codes to generate.");
      return;
    }
    if (howMany > 500) {
      toast.error("500 at a time is the most this will mint in one go.");
      return;
    }
    if (!selectedCourseId) return;

    setIsGenerating(true);
    try {
      await generateAccessCodes(selectedCourseId, howMany);
      toast.success(`${howMany} ${howMany === 1 ? "code" : "codes"} generated.`);
      setGenerateOpen(false);
      await Promise.all([loadDetail(selectedCourseId), loadCourses()]);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not generate the codes"));
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmRevoke = async () => {
    if (!pendingRevoke || !selectedCourseId) return;
    try {
      await revokeAccessCode(selectedCourseId, pendingRevoke.code);
      toast.success("Code withdrawn.");
      setPendingRevoke(null);
      await Promise.all([loadDetail(selectedCourseId), loadCourses()]);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not withdraw the code"));
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 h-8 text-muted-foreground">
            <Link href="/dashboard/institution-admin">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Access Codes</h1>
          <p className="text-sm text-muted-foreground">
            Codes that let a learner into one of your private courses. Each code admits one
            person, once.
          </p>
        </div>
        <Button variant="outline" onClick={loadCourses} disabled={coursesLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${coursesLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]">
        {/* ── the courses ─────────────────────────────────────────────── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Private courses</CardTitle>
            <CardDescription>
              {/* Only SPOCs: a MOOC is open, so a code would admit nobody who
                  could not already enrol. */}
              Only SPOC courses take access codes — a MOOC is open to everyone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {coursesLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">No private courses yet</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                  Access codes belong to SPOC courses. Create one and it will appear here.
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/dashboard/institution-admin/courses/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a course
                  </Link>
                </Button>
              </div>
            ) : (
              courses.map((course) => {
                const selected = course.id === selectedCourseId;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {course.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        {course.code_count} {course.code_count === 1 ? "code" : "codes"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course.enrollment_count} enrolled
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {course.status}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── the codes ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {selectedCourse?.title ?? "Select a course"}
                </CardTitle>
                <CardDescription>
                  {detail
                    ? `${detail.total} in total — ${detail.available} unused, ${detail.used} redeemed`
                    : "Pick a course on the left to see its codes."}
                </CardDescription>
              </div>
              {selectedCourseId && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyAllAvailable}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy unused
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => setGenerateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </div>
              )}
            </div>

            {selectedCourseId && (detail?.codes.length ?? 0) > 0 && (
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search a code, or who used it"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </CardHeader>

          <CardContent>
            {!selectedCourseId ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Choose a course to see and manage its access codes.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : visibleCodes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-semibold text-foreground">
                  {(detail?.codes.length ?? 0) === 0
                    ? "No codes on this course yet"
                    : "No code matched that search"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  {(detail?.codes.length ?? 0) === 0
                    ? "Generate a batch, then send one to each learner you want to admit."
                    : "Try part of a code, or the name of the person who used it."}
                </p>
                {(detail?.codes.length ?? 0) === 0 && (
                  <Button className="mt-4" size="sm" onClick={() => setGenerateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate codes
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleCodes.map((entry) => (
                  <div
                    key={entry.code}
                    className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${
                      entry.is_used
                        ? "border-dashed border-border bg-muted/30"
                        : "border-border bg-card"
                    }`}
                  >
                    <code className="shrink-0 rounded bg-muted px-2.5 py-1.5 font-mono text-sm font-semibold tracking-wider text-foreground">
                      {entry.code}
                    </code>

                    <div className="min-w-0 flex-1">
                      {entry.is_used ? (
                        <>
                          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            Redeemed
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {entry.used_by?.name}
                            {entry.used_by?.email ? ` · ${entry.used_by.email}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Unused — ready to send to a learner
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(entry.code, "Code")}
                        title="Copy this code"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {/*
                        Only an unused code can be withdrawn. Removing a
                        redeemed one would erase how its holder enrolled
                        without un-enrolling them, so it is not offered — the
                        server refuses it too.
                      */}
                      {!entry.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingRevoke(entry)}
                          className="text-destructive hover:text-destructive"
                          title="Withdraw this code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── generate ────────────────────────────────────────────────────── */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate access codes</DialogTitle>
            <DialogDescription>
              For <span className="font-medium">{selectedCourse?.title}</span>. Each code admits
              one learner, once, and stays listed here afterwards with who used it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="code-count">How many</Label>
            <Input
              id="code-count"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Up to 500 at a time. Generating more later adds to the list rather than replacing
              it.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={generate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── withdraw ────────────────────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this code?</AlertDialogTitle>
            <AlertDialogDescription>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {pendingRevoke?.code}
              </code>{" "}
              stops working immediately. Anyone already sent it will not be able to enrol with
              it, and nobody currently enrolled is affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
