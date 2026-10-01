"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createFeaturedInstructor,
  deleteFeaturedInstructor,
  listFeaturedInstructors,
  listInstructorCandidates,
  reorderFeaturedInstructors,
  serverMessage,
  setFeaturedInstructorActive,
  updateFeaturedInstructor,
  uploadFeaturedInstructorAvatar,
  clearFeaturedInstructorAvatar,
  type FeaturedInstructorEntry,
  type InstructorCandidate,
} from "@/lib/instructors/featured-api";

/**
 * ============================================================================
 * Featured instructors — system admin (FI-001)
 * ============================================================================
 *
 * The screen behind the homepage instructor section. Before this existed, the
 * three people on the front page were a constant in `src/app/page.tsx`, so
 * changing who the platform thanks for their work meant a code change and a
 * deploy.
 *
 * ── What an entry is ──────────────────────────────────────────────────────
 *
 * An entry normally points at a real instructor account. The account supplies
 * the name, the photograph and the live course and student counts; the entry
 * supplies only what an account cannot say — whether to show this person, in
 * what order, under what headline, with which subject tags.
 *
 * An entry may also stand alone, with no account behind it, for a guest
 * lecturer who has not signed up. Those entries carry their own figures,
 * because there are no courses to count, and the screen labels them as typed
 * in rather than measured so nobody mistakes one for the other.
 */

interface FormState {
  user_id: string | null;
  display_name: string;
  headline: string;
  avatar_url: string;
  bio: string;
  expertise: string;
  is_active: boolean;
  is_featured: boolean;
  manual_course_count: string;
  manual_student_count: string;
  manual_rating: string;
}

const EMPTY_FORM: FormState = {
  user_id: null,
  display_name: "",
  headline: "",
  avatar_url: "",
  bio: "",
  expertise: "",
  is_active: true,
  is_featured: false,
  manual_course_count: "",
  manual_student_count: "",
  manual_rating: "",
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

export default function FeaturedInstructorsPage() {
  const [entries, setEntries] = useState<FeaturedInstructorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [candidates, setCandidates] = useState<InstructorCandidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeaturedInstructorEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [pendingDelete, setPendingDelete] = useState<FeaturedInstructorEntry | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Uploading writes immediately, before Save.
   *
   * The file goes to its own endpoint against the entry id, so there is no
   * way to hold it until the form is submitted without keeping the bytes in
   * memory and inventing a second failure mode. The form field is updated
   * from the response so the preview matches what was stored, and the list
   * behind the dialog is refreshed so its thumbnail does not go stale.
   */
  const uploadAvatar = async (file: File) => {
    if (!editing) return;
    setIsUploading(true);
    try {
      const res = await uploadFeaturedInstructorAvatar(editing.id, file);
      const url = res?.data?.avatar_url || "";
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Photograph updated.");
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not upload the photograph"));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!editing) return;
    setIsUploading(true);
    try {
      await clearFeaturedInstructorAvatar(editing.id);
      setForm((f) => ({ ...f, avatar_url: "" }));
      toast.success("Photograph removed.");
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not remove the photograph"));
    } finally {
      setIsUploading(false);
    }
  };

  /* ─────────────────────────────── loading ──────────────────────────────── */

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await listFeaturedInstructors());
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the homepage instructors"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadCandidates = useCallback(async (search: string) => {
    setCandidatesLoading(true);
    try {
      setCandidates(await listInstructorCandidates(search));
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load instructor accounts"));
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  /* ───────────────────────────────── stats ──────────────────────────────── */

  const shown = useMemo(() => entries.filter((e) => e.is_active), [entries]);
  const hidden = useMemo(() => entries.filter((e) => !e.is_active), [entries]);
  const unlinked = useMemo(() => entries.filter((e) => !e.user_id), [entries]);

  /* ─────────────────────────────── the form ─────────────────────────────── */

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
    loadCandidates("");
  };

  const openEdit = (entry: FeaturedInstructorEntry) => {
    setEditing(entry);
    setForm({
      user_id: entry.user_id,
      display_name: entry.display_name ?? "",
      headline: entry.headline ?? "",
      avatar_url: entry.avatar_url ?? "",
      bio: entry.bio ?? "",
      expertise: (entry.expertise || []).join(", "),
      is_active: entry.is_active,
      is_featured: entry.is_featured,
      manual_course_count:
        entry.manual_course_count != null ? String(entry.manual_course_count) : "",
      manual_student_count:
        entry.manual_student_count != null ? String(entry.manual_student_count) : "",
      manual_rating: entry.manual_rating != null ? String(entry.manual_rating) : "",
    });
    setDialogOpen(true);
    loadCandidates("");
  };

  const save = async () => {
    // The same rule the server enforces, said earlier so the dialog does not
    // have to round-trip to tell the admin that nothing was filled in.
    if (!form.user_id && !form.display_name.trim()) {
      toast.error("Pick an instructor account, or give the entry a display name.");
      return;
    }

    setIsSaving(true);
    const payload = {
      user_id: form.user_id,
      display_name: form.display_name.trim(),
      headline: form.headline.trim(),
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      expertise: form.expertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_active: form.is_active,
      is_featured: form.is_featured,
      // An empty box means "no figure", which is not the same as zero.
      manual_course_count:
        form.manual_course_count === "" ? null : Number(form.manual_course_count),
      manual_student_count:
        form.manual_student_count === "" ? null : Number(form.manual_student_count),
      manual_rating: form.manual_rating === "" ? null : Number(form.manual_rating),
    };

    try {
      if (editing) {
        await updateFeaturedInstructor(editing.id, payload);
        toast.success("Entry updated.");
      } else {
        await createFeaturedInstructor(payload);
        toast.success("Instructor added to the homepage.");
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the entry"));
    } finally {
      setIsSaving(false);
    }
  };

  /* ───────────────────────────────── actions ────────────────────────────── */

  const toggleActive = async (entry: FeaturedInstructorEntry) => {
    // Flipped locally first so the switch answers immediately, and put back if
    // the server disagrees — rather than a switch that freezes for a round trip.
    const next = !entry.is_active;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, is_active: next } : e))
    );
    try {
      await setFeaturedInstructorActive(entry.id, next);
      toast.success(next ? "Now shown on the homepage." : "Hidden from the homepage.");
    } catch (error: any) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, is_active: entry.is_active } : e))
      );
      toast.error(serverMessage(error, "Could not change visibility"));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;

    const reordered = [...entries];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEntries(reordered);

    try {
      await reorderFeaturedInstructors(reordered.map((e) => e.id));
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the new order"));
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteFeaturedInstructor(pendingDelete.id);
      toast.success("Removed from the homepage. The account is unchanged.");
      setPendingDelete(null);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not remove the entry"));
    }
  };

  /* ────────────────────────────────── view ─────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Homepage Instructors</h1>
          <p className="text-sm text-muted-foreground">
            The people shown under &ldquo;It&rsquo;s truly inspiring to see your effort
            contributing to my future.&rdquo; on the public homepage.
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

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Shown on homepage</p>
            <p className="text-2xl font-bold text-foreground">{shown.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hidden</p>
            <p className="text-2xl font-bold text-foreground">{hidden.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entries in total</p>
            <p className="text-2xl font-bold text-foreground">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Without an account</p>
            <p className="text-2xl font-bold text-foreground">{unlinked.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order on the homepage</CardTitle>
          <CardDescription>
            Top to bottom here is left to right there. Only entries that are shown
            appear publicly; the section hides itself entirely when none are.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No instructors featured yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                The homepage section is hidden until someone is added. That is deliberate —
                an empty list shows nothing rather than falling back to placeholder people.
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add the first instructor
              </Button>
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
                  entry.is_active ? "border-border bg-card" : "border-dashed border-border bg-muted/30"
                }`}
              >
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === entries.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.name}
                    className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initialsOf(entry.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{entry.name}</p>
                    {entry.is_featured && (
                      <Badge className="bg-yellow-400/20 text-xs text-warning">TOP</Badge>
                    )}
                    {!entry.user_id && (
                      <Badge variant="outline" className="text-xs">
                        No account
                      </Badge>
                    )}
                    {entry.account && !entry.account.is_active && (
                      <Badge variant="outline" className="text-xs text-warning">
                        Account deactivated
                      </Badge>
                    )}
                  </div>
                  {entry.headline && (
                    <p className="truncate text-xs text-muted-foreground">{entry.headline}</p>
                  )}
                  {entry.account && (
                    <p className="truncate text-xs text-muted-foreground">{entry.account.email}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {entry.course_count} courses
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {entry.student_count} students
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {entry.rating > 0 ? entry.rating.toFixed(1) : "no rating yet"}
                    </span>
                    {/*
                      Which figures these are matters. "Live" means counted from
                      published courses; "typed in" means an admin wrote them,
                      and nothing keeps them true as the courses change.
                    */}
                    <Badge variant="outline" className="text-[10px]">
                      {entry.stats_source === "live"
                        ? "live figures"
                        : entry.stats_source === "manual"
                          ? "typed in"
                          : "no figures"}
                    </Badge>
                  </div>

                  {entry.expertise.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.expertise.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(entry)}
                    title={entry.is_active ? "Hide from the homepage" : "Show on the homepage"}
                  >
                    {entry.is_active ? (
                      <Eye className="h-4 w-4 text-success" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(entry)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── create / edit ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit entry" : "Add an instructor"}</DialogTitle>
            <DialogDescription>
              Link a real instructor account wherever possible. The account supplies the
              name, the photograph and the live course and student counts, so a profile
              correction reaches the homepage on its own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* account picker */}
            <div className="space-y-2">
              <Label>Instructor account</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search instructors by name or email"
                  value={candidateSearch}
                  onChange={(e) => {
                    setCandidateSearch(e.target.value);
                    loadCandidates(e.target.value);
                  }}
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                {candidatesLoading ? (
                  <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading instructors…
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No instructor accounts matched.
                  </p>
                ) : (
                  candidates.map((candidate) => {
                    const selected = form.user_id === candidate.id;
                    // Already featured, unless it is the entry being edited.
                    const taken =
                      candidate.already_featured && editing?.user_id !== candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        disabled={taken}
                        onClick={() => setForm((f) => ({ ...f, user_id: candidate.id }))}
                        className={`flex w-full items-center gap-3 border-b border-border p-2 text-left last:border-b-0 ${
                          selected ? "bg-primary/10" : taken ? "opacity-50" : "hover:bg-accent"
                        }`}
                      >
                        {candidate.profile_picture_url ? (
                          <img
                            src={candidate.profile_picture_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initialsOf(candidate.name)}
                          </div>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {candidate.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {candidate.email} · {candidate.course_count} courses
                          </span>
                        </span>
                        {taken && (
                          <Badge variant="outline" className="text-[10px]">
                            featured
                          </Badge>
                        )}
                        {selected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>

              {form.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, user_id: null }))}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear the account link
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input
                  placeholder={form.user_id ? "Leave empty to use the account name" : "Full name"}
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {form.user_id
                    ? "Empty is usually right: the account name then stays in step with the profile."
                    : "Required when there is no account behind this entry."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  placeholder="Senior Data Engineer, NISR"
                  value={form.headline}
                  onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expertise</Label>
              <Input
                placeholder="Data Engineering, Official Statistics, SQL"
                value={form.expertise}
                onChange={(e) => setForm((f) => ({ ...f, expertise: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Comma separated. Shown as chips.</p>
            </div>

            {/*
              The photograph.

              Uploading is only offered on an existing entry, because the file
              goes to its own endpoint against an id and a new entry has none
              yet. On a new one the URL field stands alone; save it, reopen it,
              and the uploader is there. A pasted URL still works either way —
              an image already hosted somewhere does not need copying into our
              own storage to be shown.
            */}
            <div className="space-y-3">
              <Label>Photograph</Label>

              {editing && (
                <div className="flex items-center gap-4 rounded-md border border-border p-3">
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt=""
                      className="h-16 w-16 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initialsOf(form.display_name || editing.name)}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        // Cleared so picking the same file twice still fires.
                        e.target.value = "";
                        if (file) uploadAvatar(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {form.avatar_url ? "Replace photograph" : "Upload photograph"}
                    </Button>

                    {form.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUploading}
                        onClick={removeAvatar}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Input
                placeholder={form.user_id ? "Leave empty to use the profile picture" : "https://…"}
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "Upload a file, or paste the address of one already hosted."
                  : "Paste an address now; the uploader appears once the entry is saved."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Short bio</Label>
              <Textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>

            {/*
              Only offered when there is no account to count from. With an
              account linked these boxes would be dead controls: the live
              figures always win, and showing an input that cannot affect
              anything is how an admin comes to distrust the screen.
            */}
            {!form.user_id && (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">Figures to show</p>
                <p className="text-xs text-muted-foreground">
                  This entry has no account, so there are no courses to count. Anything left
                  empty is shown as nothing rather than as zero.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Courses</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.manual_course_count}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manual_course_count: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Students</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.manual_student_count}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manual_student_count: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rating</Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={form.manual_rating}
                      onChange={(e) => setForm((f) => ({ ...f, manual_rating: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <div>
                  <Label className="text-sm">Show on the homepage</Label>
                  <p className="text-xs text-muted-foreground">Turn off to hide without deleting.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                />
                <div>
                  <Label className="text-sm">TOP ribbon</Label>
                  <p className="text-xs text-muted-foreground">Draws the corner badge.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add to homepage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── delete ────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.name} from the homepage?</AlertDialogTitle>
            <AlertDialogDescription>
              Only this homepage entry is deleted. The instructor&rsquo;s account, their
              courses and their learners are untouched. To take them down temporarily,
              hide the entry instead — that keeps the headline, the tags and the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from homepage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
