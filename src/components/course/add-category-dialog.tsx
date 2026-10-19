"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createGlobalCategory,
  listGlobalCategories,
  serverMessage,
  type GlobalCategory,
} from "@/lib/categories/global-categories-api"

/**
 * Add a category without leaving the course form (CAT-002).
 *
 * ── Why the platform category list and not the institution's ───────────────
 *
 * There are two category stores: per-institution categories, and the
 * platform-wide ("global") list. `/dashboard/instructor/categories` shows the
 * *global* list, and the request was that a category added here also appears
 * there — so this writes to the global list. `POST /categories/global` is
 * explicitly open to instructors ("Only instructors and system administrators
 * can change the platform's categories"), so an instructor filing a course can
 * add the category they need without going through an administrator.
 *
 * ── Why the created category is handed back rather than refetched ──────────
 *
 * The caller selects the new category immediately. Relying on a background
 * refresh to make it appear would leave the author looking at a dropdown that
 * still lacks the thing they just created. `onCreated` receives the real
 * record, including the server-assigned id.
 */
export function AddCategoryDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (category: GlobalCategory) => void
  /** Prefills the field, for an author who already typed what they wanted. */
  initialName?: string
}) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const trimmed = name.trim()
  // The server rejects anything shorter; checking here saves a round trip and
  // says so before the author submits.
  const tooShort = trimmed.length > 0 && trimmed.length < 3
  const canSave = trimmed.length >= 3 && !saving

  function reset() {
    setName("")
    setDescription("")
    setSaving(false)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)

    try {
      const response = await createGlobalCategory({
        name: trimmed,
        description: description.trim() || null,
      })

      /*
       * The create response shape is not guaranteed to carry the full record,
       * so the list is re-read and the new category found by name. That also
       * resolves the case where the server normalised the name.
       */
      let created: GlobalCategory | undefined = response?.data

      if (!created?.id) {
        const all = await listGlobalCategories()
        created = all.find(
          (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
        )
      }

      if (!created?.id) {
        // Created, but we cannot tell the caller which one it is. Say so
        // rather than silently leaving the dropdown unchanged.
        toast.success("Category created. Reopen the list to select it.")
        onOpenChange(false)
        reset()
        return
      }

      toast.success(`"${created.name}" added to the platform categories.`)
      onCreated(created)
      onOpenChange(false)
      reset()
    } catch (error) {
      // The server's own sentence — it explains a duplicate name properly,
      // which "Request failed with status code 409" does not.
      toast.error(serverMessage(error, "The category could not be created."))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New category</DialogTitle>
          <DialogDescription className="text-[13px]">
            Added to the platform's categories, so it is available to every
            course and appears under Categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="new_category_name" className="text-[13px] font-medium">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_category_name"
              value={name}
              autoFocus
              maxLength={100}
              placeholder="e.g. Data Engineering"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault()
                  void handleSave()
                }
              }}
              className="h-9 text-[13px]"
            />
            {tooShort ? (
              <p className="text-[12px] text-destructive">
                At least 3 characters.
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {trimmed.length}/100
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="new_category_description"
              className="text-[13px] font-medium"
            >
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="new_category_description"
              value={description}
              maxLength={500}
              rows={3}
              placeholder="What belongs in this category?"
              onChange={(e) => setDescription(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={!canSave}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create category
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
