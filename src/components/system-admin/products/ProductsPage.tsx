"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
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

import { ProductIcon } from "@/components/products/product-icon";
import {
  accentStyle,
  createProduct,
  deleteProduct,
  listAdminProducts,
  PRODUCT_ACCENTS,
  PRODUCT_ICONS,
  reorderProducts,
  serverMessage,
  setProductActive,
  updateProduct,
  type AdminProduct,
} from "@/lib/products/products-api";

/**
 * ============================================================================
 * Products — system admin (PR-001)
 * ============================================================================
 *
 * The screen behind /our-products. These were a constant in the homepage
 * source, so adding a product, correcting a URL or taking one down meant a code
 * change and a deploy.
 *
 * Icon and accent are picked from fixed lists rather than typed, so a product
 * cannot introduce a colour the design does not have or name an icon that does
 * not exist — and the same lists drive the public page, so the two cannot
 * disagree about what a name means.
 */

interface FormState {
  name: string;
  tagline: string;
  description: string;
  url: string;
  action_label: string;
  highlights: string;
  icon: string;
  accent: string;
  is_current: boolean;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  tagline: "",
  description: "",
  url: "",
  action_label: "",
  highlights: "",
  icon: "Layers",
  accent: "purple",
  is_current: false,
  is_active: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setProducts(await listAdminProducts());
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not load the products"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publicCount = useMemo(() => products.filter((p) => p.is_active).length, [products]);

  /* ── the form ──────────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (product: AdminProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: product.url,
      action_label: product.action_label,
      highlights: (product.highlights || []).join(", "),
      icon: product.icon,
      accent: product.accent,
      is_current: product.is_current,
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("A product needs a name.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      action_label: form.action_label.trim(),
      highlights: form.highlights
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      icon: form.icon,
      accent: form.accent,
      is_current: form.is_current,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Product updated.");
      } else {
        await createProduct(payload);
        toast.success("Product created.");
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the product"));
    } finally {
      setIsSaving(false);
    }
  };

  /* ── actions ───────────────────────────────────────────────────────── */

  const toggleActive = async (product: AdminProduct) => {
    // Flipped locally first so the control answers at once, and put back if the
    // server disagrees — rather than a switch that freezes for a round trip.
    const next = !product.is_active;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: next } : p))
    );
    try {
      await setProductActive(product.id, next);
      toast.success(next ? "Product is now public." : "Product is hidden.");
    } catch (error: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
      );
      toast.error(serverMessage(error, "Could not change visibility"));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;

    const reordered = [...products];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setProducts(reordered);

    try {
      await reorderProducts(reordered.map((p) => p.id));
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not save the new order"));
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProduct(pendingDelete.id);
      toast.success("Product deleted.");
      setPendingDelete(null);
      await load();
    } catch (error: any) {
      toast.error(serverMessage(error, "Could not delete the product"));
    }
  };

  /* ── view ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Our Products</h1>
          <p className="text-sm text-muted-foreground">
            The products listed publicly at{" "}
            <a href="/our-products" className="font-medium text-primary hover:underline">
              /our-products
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order on the page</CardTitle>
          <CardDescription>
            Top to bottom here is left to right there. {publicCount} of {products.length} shown
            publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <PackageOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No products yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                The public page shows its empty state until one is added.
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add the first product
              </Button>
            </div>
          ) : (
            products.map((product, index) => {
              const accent = accentStyle(product.accent);
              return (
                <div
                  key={product.id}
                  className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
                    product.is_active
                      ? "border-border bg-card"
                      : "border-dashed border-border bg-muted/30"
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
                      disabled={index === products.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: accent.bg, color: accent.fg }}
                  >
                    <ProductIcon name={product.icon} className="h-[22px] w-[22px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      {product.is_current && (
                        <Badge className="bg-success/10 text-xs text-success">You are here</Badge>
                      )}
                      {!product.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    {product.tagline && (
                      <p className="text-xs font-medium" style={{ color: accent.fg }}>
                        {product.tagline}
                      </p>
                    )}
                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {product.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(product)}
                      title={product.is_active ? "Hide from the page" : "Show on the page"}
                    >
                      {product.is_active ? (
                        <Eye className="h-4 w-4 text-success" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(product)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── create / edit ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add a product"}</DialogTitle>
            <DialogDescription>
              Describe what the product is and where it lives. Nothing here should claim
              figures, customers or results — the page states what each product does.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Bwenge"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  placeholder="Research platform"
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>What it does</Label>
              <Input
                placeholder="Research publication, Discovery and access, Collaboration"
                value={form.highlights}
                onChange={(e) => setForm((f) => ({ ...f, highlights: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Comma separated. Shown as a short checklist on the card.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="https://bwenge.com/"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Button</Label>
                <Input
                  placeholder="Visit Bwenge"
                  value={form.action_label}
                  onChange={(e) => setForm((f) => ({ ...f, action_label: e.target.value }))}
                />
              </div>
            </div>

            {/*
              Picked, not typed. An admin choosing from these cannot name an
              icon that does not exist or invent a colour the design has no
              token for, and the same lists drive the public page.
            */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_ICONS.map((icon) => {
                  const selected = form.icon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      title={icon}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <ProductIcon name={icon} className="h-[18px] w-[18px]" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accent</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_ACCENTS.map((accent) => {
                  const style = accentStyle(accent);
                  const selected = form.accent === accent;
                  return (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, accent }))}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                        selected ? "border-primary" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: style.fg }}
                      />
                      {accent}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <div>
                  <Label className="text-sm">Show publicly</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to hide without deleting.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_current}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_current: v }))}
                />
                <div>
                  <Label className="text-sm">This platform</Label>
                  {/*
                    Only one product can be the one the visitor is inside, so
                    the server clears the flag from the others on save. Two
                    "You are here" badges is a contradiction, not a preference.
                  */}
                  <p className="text-xs text-muted-foreground">
                    Draws &ldquo;You are here&rdquo;. Setting it clears the others.
                  </p>
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
              {editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── delete ────────────────────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from the public page permanently. To take it down
              temporarily, hide it instead — that keeps the copy, the links and the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
