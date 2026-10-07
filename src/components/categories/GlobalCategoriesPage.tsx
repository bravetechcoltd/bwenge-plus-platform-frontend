"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  EyeOff,
  Info,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  createGlobalCategory,
  deleteGlobalCategory,
  listGlobalCategories,
  serverMessage,
  setGlobalCategoryActive,
  updateGlobalCategory,
  type GlobalCategory,
} from "@/lib/categories/global-categories-api";

/**
 * ============================================================================
 * Global categories (CAT-001)
 * ============================================================================
 *
 * The platform's own taxonomy: what a course is filed under when it belongs to
 * no institution. Every MOOC and every course by a global instructor uses this
 * list, and until now there was nowhere to see or change it — the wizard
 * fetched it and nobody could add to it.
 *
 * ── Read by everyone, written by system admins ────────────────────────────
 *
 * An instructor needs to see these to know what they are choosing from, so the
 * screen is readable to them. Changing them is not theirs: a global category is
 * shared by every institution-less course on the platform, so renaming one
 * re-labels other people's courses and deleting one strands them. `canManage`
 * controls the difference, and the server enforces it again regardless of what
 * this component renders.
 */

interface FormState {
  name: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: "", description: "", is_active: true };

export default function GlobalCategoriesPage({
  canManage = false,
}: {
  /** System admins manage; everyone else reads. */
  canManage?: boolean;
}) {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<GlobalCategory | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setCategories(await listGlobalCategories());
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the platform categories"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Filtered here rather than re-fetched per keystroke: this list is short, and
   * a request per character answers out of order.
   */
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description ?? "").toLowerCase().includes(term)
    );
  }, [categories, search]);

  const activeCount = useMemo(() => categories.filter((c) => c.is_active).length, [categories]);
  const inUseCount = useMemo(
    () => categories.filter((c) => c.course_count > 0).length,
    [categories]
  );

  /* ── the form ──────────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (category: GlobalCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("A category needs a name.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await updateGlobalCategory(editing.id, payload);
        toast.success("Category updated.");
      } else {
        await createGlobalCategory(payload);
        toast.success("Category created.");
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the category"));
    } finally {
      setIsSaving(false);
    }
  };

  /* ── actions ───────────────────────────────────────────────────────── */

  const toggleActive = async (category: GlobalCategory) => {
    // Flipped locally first so the control answers at once, and put back if the
    // server disagrees — rather than a switch that freezes for a round trip.
    const next = !category.is_active;
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, is_active: next } : c))
    );
    try {
      await setGlobalCategoryActive(category.id, next);
      toast.success(next ? "Category is available again." : "Category hidden from new courses.");
    } catch (error: any) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: category.is_active } : c))
      );
      toast.error(serverMessage(error, "Could not change the category"));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= visible.length) return;

    const reordered = [...visible];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);

    /*
     * Order is a field on each row, so moving two rows is two writes. Both are
     * sent and the list is reloaded from the server afterwards, because a
     * half-applied swap that only exists on screen is worse than a slow one.
     */
    try {
      await Promise.all([
        updateGlobalCategory(reordered[index].id, { order_index: index }),
        updateGlobalCategory(reordered[target].id, { order_index: target }),
      ]);
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the new order"));
    } finally {
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGlobalCategory(pendingDelete.id);
      toast.success("Category deleted.");
      setPendingDelete(null);
      await load();
    } catch (error: any) {
      // The server refuses while courses are filed here, and says how many.
      toast.error(serverMessage(error, "Could not delete the category"));
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Categories</h1>
          <p className="text-sm text-muted-foreground">
            The platform&rsquo;s own taxonomy — what a course is filed under when it belongs to
            no institution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          )}
        </div>
      </div>

      {/*
        Said plainly to a reader who cannot change anything, rather than leaving
        them to work out why the buttons are missing.
      */}
      {!canManage && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            These are the categories available to you when creating a platform course. They are
            shared across the whole platform, so only a system administrator can change them.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold text-foreground">{categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hidden</p>
            <p className="text-2xl font-bold text-foreground">
              {categories.length - activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In use</p>
            <p className="text-2xl font-bold text-foreground">{inUseCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-base">All platform categories</CardTitle>
            <CardDescription>
              Top to bottom here is the order they appear in when someone picks one.
            </CardDescription>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search categories"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {categories.length === 0
                  ? "No platform categories yet"
                  : "No category matched that search"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {categories.length === 0
                  ? "Until one exists, the category field is empty for anyone creating a course with no institution."
                  : "Try a different word."}
              </p>
              {categories.length === 0 && canManage && (
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add the first category
                </Button>
              )}
            </div>
          ) : (
            visible.map((category, index) => (
              <div
                key={category.id}
                className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
                  category.is_active
                    ? "border-border bg-card"
                    : "border-dashed border-border bg-muted/30"
                }`}
              >
                {canManage && !search.trim() && (
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
                      disabled={index === visible.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-[18px] w-[18px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{category.name}</p>
                    {!category.is_active && (
                      <Badge variant="outline" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  {category.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    {category.course_count}{" "}
                    {category.course_count === 1 ? "course" : "courses"}
                  </p>
                </div>

                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(category)}
                      title={
                        category.is_active
                          ? "Hide from new courses"
                          : "Make available again"
                      }
                    >
                      {category.is_active ? (
                        <Eye className="h-4 w-4 text-success" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(category)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── create / edit ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add a category"}</DialogTitle>
            <DialogDescription>
              Shared across the whole platform. Every course with no institution can be filed
              under it, so a rename re-labels those courses too.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Software Engineering"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="What belongs in this category"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <div>
                <Label className="text-sm">Available</Label>
                <p className="text-xs text-muted-foreground">
                  {/* Hiding is the reversible alternative to deleting. */}
                  Turn off to keep it out of the list without losing it. Courses already filed
                  under it keep it.
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
              {editing ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── delete ──────────────────────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.course_count > 0 ? (
                <>
                  {pendingDelete.course_count}{" "}
                  {pendingDelete.course_count === 1 ? "course is" : "courses are"} filed here, so
                  this will be refused — move {pendingDelete.course_count === 1 ? "it" : "them"}{" "}
                  first, or hide the category instead, which keeps it off the list without
                  touching anything.
                </>
              ) : (
                <>
                  Nothing is filed under it, so this removes it cleanly. Hiding it instead keeps
                  it available to bring back later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
