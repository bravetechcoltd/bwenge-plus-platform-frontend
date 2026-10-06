"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  createPublicInstructor,
  listPublicInstructors,
  serverMessage,
  setPublicInstructorActive,
  updatePublicInstructor,
  type PublicInstructor,
} from "@/lib/instructors/public-instructors-api";

/**
 * ============================================================================
 * Public instructors — system admin (PI-001)
 * ============================================================================
 *
 * Instructors who teach on the platform without belonging to any institution,
 * which is who a MOOC needs: a platform course has no institution, so it cannot
 * draw its instructor from one.
 *
 * ── What "public" means here ──────────────────────────────────────────────
 *
 * Holding the instructor role and belonging to no institution — no primary
 * institution, nothing in institution_ids, and no membership row. It is the
 * absence of an affiliation rather than a flag, so an instructor who later
 * joins an institution leaves this list on their own, with nothing to migrate
 * and no second fact to contradict the first.
 *
 * That is also why this screen cannot attach someone to an institution or
 * change their role: both of those change what the account can reach across the
 * whole platform, and they belong to the screens built for them.
 */

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  email: "",
  first_name: "",
  last_name: "",
  is_active: true,
};

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function PublicInstructorsPage() {
  const [instructors, setInstructors] = useState<PublicInstructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicInstructor | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingToggle, setPendingToggle] = useState<PublicInstructor | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setInstructors(await listPublicInstructors());
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the public instructors"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Filtered here rather than re-fetched per keystroke. The list is a few
   * hundred rows at most, and a request per character answers out of order.
   */
  const visible = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return instructors;
    return instructors.filter((i) => {
      const haystack = `${i.name} ${i.email}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [instructors, search]);

  const activeCount = useMemo(
    () => instructors.filter((i) => i.is_active).length,
    [instructors]
  );
  const teachingCount = useMemo(
    () => instructors.filter((i) => i.course_count > 0).length,
    [instructors]
  );

  /* ── the form ──────────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (instructor: PublicInstructor) => {
    setEditing(instructor);
    setForm({
      email: instructor.email,
      first_name: instructor.first_name ?? "",
      last_name: instructor.last_name ?? "",
      is_active: instructor.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing && !form.email.trim()) {
      toast.error("An email address is required.");
      return;
    }
    if (!form.first_name.trim()) {
      toast.error("A first name is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        // Email is not editable: it is the sign-in identity, and changing it
        // here would lock someone out of an account they already use.
        await updatePublicInstructor(editing.id, {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          is_active: form.is_active,
        });
        toast.success("Instructor updated.");
      } else {
        const res = await createPublicInstructor({
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          is_active: form.is_active,
        });
        toast.success(res?.message || "Public instructor created.");
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the instructor"));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const next = !pendingToggle.is_active;
    try {
      await setPublicInstructorActive(pendingToggle.id, next);
      toast.success(next ? "Instructor reactivated." : "Instructor deactivated.");
      setPendingToggle(null);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not change the account"));
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Public Instructors</h1>
          <p className="text-sm text-muted-foreground">
            Instructors who teach on the platform without belonging to an institution. These
            are the people assignable to a MOOC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add instructor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Public instructors</p>
            <p className="text-2xl font-bold text-foreground">{instructors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Teaching a course</p>
            <p className="text-2xl font-bold text-foreground">{teachingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Assignable now</p>
            {/* What the course wizard will actually offer. */}
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-base">All public instructors</CardTitle>
            <CardDescription>
              An instructor who joins an institution leaves this list by itself — belonging to
              one is what makes them no longer public.
            </CardDescription>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {instructors.length === 0
                  ? "No public instructors yet"
                  : "No instructor matched that search"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {instructors.length === 0
                  ? "Until one exists, a system admin creating a MOOC can still name themselves as the primary instructor."
                  : "Try a different name or email address."}
              </p>
              {instructors.length === 0 && (
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add the first instructor
                </Button>
              )}
            </div>
          ) : (
            visible.map((instructor) => (
              <div
                key={instructor.id}
                className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
                  instructor.is_active
                    ? "border-border bg-card"
                    : "border-dashed border-border bg-muted/30"
                }`}
              >
                {instructor.profile_picture_url ? (
                  <img
                    src={instructor.profile_picture_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initialsOf(instructor.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{instructor.name}</p>
                    <Badge variant="outline" className="text-xs">
                      Public
                    </Badge>
                    {!instructor.is_active && (
                      <Badge variant="outline" className="text-xs text-warning">
                        Deactivated
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{instructor.email}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {instructor.course_count} courses
                      {instructor.published_count > 0 &&
                        ` (${instructor.published_count} published)`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {instructor.student_count} learners
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(instructor)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingToggle(instructor)}
                    title={instructor.is_active ? "Deactivate" : "Reactivate"}
                  >
                    {instructor.is_active ? (
                      <UserX className="h-4 w-4 text-destructive" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-success" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── create / edit ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit instructor" : "Add a public instructor"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Name and status only. Attaching someone to an institution, or changing their role, changes what they can reach platform-wide and belongs to the screens built for it."
                : "Creates an instructor account that belongs to the platform rather than to an institution. A temporary password is generated and emailed to them."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="instructor@example.com"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  {/* It is the sign-in identity; changing it here would lock
                      someone out of an account they already use. */}
                  The email is how they sign in, so it cannot be changed here.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active instructors can be assigned to a course.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── activate / deactivate ───────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingToggle}
        onOpenChange={(open) => !open && setPendingToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.is_active ? "Deactivate" : "Reactivate"} {pendingToggle?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.is_active ? (
                <>
                  They will no longer be able to sign in, and they stop appearing as an
                  assignable instructor. Their {pendingToggle?.course_count ?? 0} course(s),
                  their learners and their history are untouched — deactivating an account is
                  not the same as removing someone&rsquo;s work.
                </>
              ) : (
                <>They will be able to sign in again and can be assigned to new courses.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className={
                pendingToggle?.is_active
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {pendingToggle?.is_active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
