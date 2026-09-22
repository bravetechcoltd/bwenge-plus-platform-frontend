"use client"

/**
 * ============================================================================
 * Registration questionnaire — administration
 * ============================================================================
 *
 * The five questions on the "About you" step of /register are rows in the
 * database, served to the registration page by `GET /onboarding/questions`.
 * Everything needed to change them already existed on the server; there was
 * simply nowhere to do it, so the only way to add a career category was a SQL
 * statement against production.
 *
 * ── What this page is careful about ────────────────────────────────────────
 *
 * Nothing here deletes. Every answer anyone has ever given points at the
 * question that asked it and the option they chose, so removal would either
 * fail on the reference or take the answers with it. Retiring stops something
 * being offered to new registrations and leaves it readable for everyone who
 * already chose it — and the page says which of those it is doing, with the
 * number of people affected, before the click rather than after.
 *
 * The preview is the same component the registration page renders, not a
 * lookalike. A preview that is a second implementation is a second thing to
 * keep in step, and the first time they diverge is the time it matters.
 */

import * as React from "react"
import Link from "next/link"
import * as Icons from "lucide-react"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  describeSelection,
  moveInList,
  onboardingAdminApi,
  type AdminOption,
  type AdminQuestion,
  type OptionDraft,
  type QuestionDraft,
} from "@/lib/onboarding/admin-api"

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

/** Where a question's answers are stored, in words rather than in an enum. */
const PROFILE_FIELDS = [
  {
    value: "NONE",
    label: "Not stored on the profile",
    hint: "The answer is recorded, but nothing else reads it.",
  },
  {
    value: "MAIN_GOALS",
    label: "Main goals",
    hint: "Shown on the learner's profile and used to explain recommendations.",
  },
  {
    value: "CAREER_INTERESTS",
    label: "Career interests",
    hint: "Read by course discovery to order a learner's catalogue.",
  },
] as const

function OptionIcon({ name, className }: { name: string | null; className?: string }) {
  const Resolved =
    (name && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]) ||
    Sparkles
  return <Resolved className={className} />
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Question editor
   ══════════════════════════════════════════════════════════════════════════ */

const EMPTY_QUESTION: QuestionDraft = {
  title: "",
  description: null,
  type: "SINGLE",
  profile_field: "NONE",
  required: true,
  min_selections: 1,
  max_selections: null,
  display_order: 0,
  is_active: true,
}

function QuestionDialog({
  open,
  onOpenChange,
  question,
  nextOrder,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: AdminQuestion | null
  nextOrder: number
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [draft, setDraft] = React.useState<QuestionDraft>(EMPTY_QUESTION)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setDraft(
      question
        ? {
            title: question.title,
            description: question.description,
            type: question.type,
            profile_field: question.profile_field,
            required: question.required,
            min_selections: question.min_selections,
            max_selections: question.max_selections,
            display_order: question.display_order,
            is_active: question.is_active,
          }
        : { ...EMPTY_QUESTION, display_order: nextOrder }
    )
  }, [open, question, nextOrder])

  const set = <K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  /*
   * A single-answer question has no range to set: it is exactly one. Keeping
   * the fields visible and ignored is how a minimum of 3 ends up saved on a
   * question that can only take one answer, and then read back by someone
   * trying to work out why it never validates.
   */
  const isMultiple = draft.type === "MULTIPLE"

  const rangeProblem =
    isMultiple &&
    draft.max_selections !== null &&
    draft.max_selections < draft.min_selections
      ? "The maximum cannot be lower than the minimum — no answer would satisfy both."
      : null

  const save = async () => {
    if (!draft.title.trim()) {
      setError("A question needs something to ask.")
      return
    }
    if (rangeProblem) {
      setError(rangeProblem)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onboardingAdminApi.saveQuestion(
        {
          ...draft,
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          // Normalised here as well as on the server, so what is saved is what
          // the summary sentence above the button described.
          min_selections: isMultiple ? Math.max(1, draft.min_selections) : 1,
          max_selections: isMultiple ? draft.max_selections : 1,
        },
        question?.id
      )
      toast({
        title: question ? "Question updated" : "Question added",
        description: question
          ? "Anyone registering from now on sees the change."
          : "It is live on the registration form.",
      })
      onOpenChange(false)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the question.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            This appears on the &ldquo;About you&rdquo; step of registration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label htmlFor="q-title">Question</Label>
            <Input
              id="q-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What is your main goal on BwengePlus?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-desc">
              Helper text <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="q-desc"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              placeholder="A sentence under the question, where one helps."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Answer</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => {
                  set("type", v as QuestionDraft["type"])
                  if (v === "SINGLE") {
                    set("min_selections", 1)
                    set("max_selections", 1)
                  } else {
                    set("max_selections", null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">One option</SelectItem>
                  <SelectItem value="MULTIPLE">Several options</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stored as</Label>
              <Select
                value={draft.profile_field}
                onValueChange={(v) => set("profile_field", v as QuestionDraft["profile_field"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {PROFILE_FIELDS.find((f) => f.value === draft.profile_field)?.hint}
              </p>
            </div>
          </div>

          {isMultiple && (
            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="q-min">Must pick at least</Label>
                <Input
                  id="q-min"
                  type="number"
                  min={1}
                  value={draft.min_selections}
                  onChange={(e) => set("min_selections", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-max">
                  Can pick up to <span className="text-muted-foreground">(blank for no limit)</span>
                </Label>
                <Input
                  id="q-max"
                  type="number"
                  min={1}
                  value={draft.max_selections ?? ""}
                  onChange={(e) =>
                    set("max_selections", e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1))
                  }
                  placeholder="No limit"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-3">
              <Switch
                checked={draft.required}
                onCheckedChange={(v) => set("required", v)}
              />
              <span className="text-sm font-medium">Must be answered</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => set("is_active", v)}
              />
              <span className="text-sm font-medium">Live on the form</span>
            </label>
          </div>

          {/* Said back, because the three fields interact and the result is not
              obvious from any one of them. */}
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              On the form
            </p>
            <p className="mt-1 text-sm text-foreground">
              {describeSelection({ ...draft, max_selections: isMultiple ? draft.max_selections : 1 })}
            </p>
          </div>

          {(error || rangeProblem) && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error ?? rangeProblem}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !!rangeProblem}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {question ? "Save changes" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Option editor
   ══════════════════════════════════════════════════════════════════════════ */

/** Turns a title into a stable machine value, so nobody has to invent one. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function OptionDialog({
  open,
  onOpenChange,
  questionId,
  option,
  nextOrder,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionId: string
  option: AdminOption | null
  nextOrder: number
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [draft, setDraft] = React.useState<OptionDraft>({
    title: "",
    description: null,
    value: "",
    icon: null,
    display_order: 0,
    is_active: true,
  })
  const [valueTouched, setValueTouched] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setValueTouched(!!option)
    setDraft(
      option
        ? {
            title: option.title,
            description: option.description,
            value: option.value,
            icon: option.icon,
            display_order: option.display_order,
            is_active: option.is_active,
          }
        : {
            title: "",
            description: null,
            value: "",
            icon: null,
            display_order: nextOrder,
            is_active: true,
          }
    )
  }, [open, option, nextOrder])

  const setTitle = (title: string) =>
    setDraft((d) => ({
      ...d,
      title,
      /*
       * The value is what every recorded answer stores, so it must not drift
       * once anyone has chosen the option. It follows the title only while
       * the value has not been edited and the option is new; after that it is
       * whatever it was, and changing it is a deliberate act.
       */
      value: valueTouched ? d.value : slugify(title),
    }))

  const save = async () => {
    if (!draft.title.trim() || !draft.value.trim()) {
      setError("An option needs a label and a value.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onboardingAdminApi.saveOption(
        {
          ...draft,
          question_id: questionId,
          title: draft.title.trim(),
          value: draft.value.trim(),
          description: draft.description?.trim() || null,
          icon: draft.icon?.trim() || null,
        },
        option?.id
      )
      toast({ title: option ? "Option updated" : "Option added" })
      onOpenChange(false)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the option.")
    } finally {
      setSaving(false)
    }
  }

  const answered = option?.response_count ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{option ? "Edit option" : "New option"}</DialogTitle>
          <DialogDescription>One of the cards a learner picks from.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label htmlFor="o-title">Label</Label>
            <Input
              id="o-title"
              value={draft.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Software engineering"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="o-desc">
              Helper text <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="o-desc"
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value || null }))}
              placeholder="A short line under the label."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="o-value">Stored value</Label>
              <Input
                id="o-value"
                value={draft.value}
                onChange={(e) => {
                  setValueTouched(true)
                  setDraft((d) => ({ ...d, value: e.target.value }))
                }}
                placeholder="software-engineering"
                className="font-mono text-xs"
              />
              {answered > 0 && (
                <p className="text-xs leading-relaxed text-warning">
                  {answered} {answered === 1 ? "person has" : "people have"} already chosen this.
                  Changing the value leaves their recorded answers pointing at the old one.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-icon">
                Icon <span className="text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                  <OptionIcon name={draft.icon} className="h-4 w-4 text-primary" />
                </div>
                <Input
                  id="o-icon"
                  value={draft.icon ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value || null }))}
                  placeholder="Code"
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A{" "}
                <Link
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Lucide
                </Link>{" "}
                name. Unknown names fall back to a spark.
              </p>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-3">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
            />
            <span className="text-sm font-medium">Offered on the form</span>
          </label>

          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {option ? "Save changes" : "Add option"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   One question
   ══════════════════════════════════════════════════════════════════════════ */

function QuestionCard({
  question,
  index,
  total,
  onEdit,
  onRetire,
  onAddOption,
  onEditOption,
  onRetireOption,
  onMove,
  onMoveOption,
  busy,
}: {
  question: AdminQuestion
  index: number
  total: number
  onEdit: () => void
  onRetire: () => void
  onAddOption: () => void
  onEditOption: (option: AdminOption) => void
  onRetireOption: (option: AdminOption) => void
  onMove: (to: number) => void
  onMoveOption: (from: number, to: number) => void
  busy: boolean
}) {
  const [expanded, setExpanded] = React.useState(true)

  const live = question.options.filter((o) => o.is_active).length
  const retired = question.options.length - live

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        !question.is_active && "border-dashed bg-muted/30"
      )}
    >
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-start gap-3">
          {/* Order. Buttons rather than drag: one keyboard-reachable control
              that works on a phone, where a drag handle does not. */}
          <div className="flex shrink-0 flex-col gap-1 pt-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === 0 || busy}
              onClick={() => onMove(index - 1)}
              aria-label={`Move "${question.title}" up`}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === total - 1 || busy}
              onClick={() => onMove(index + 1)}
              aria-label={`Move "${question.title}" down`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="tabular-nums">
                Step {index + 1}
              </Badge>
              {!question.is_active && <Badge variant="secondary">Retired</Badge>}
              {question.required ? (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Required
                </Badge>
              ) : (
                <Badge variant="outline">Optional</Badge>
              )}
              {question.profile_field !== "NONE" && (
                <Badge variant="outline" className="border-success/40 text-success">
                  {question.profile_field === "MAIN_GOALS" ? "Main goals" : "Career interests"}
                </Badge>
              )}
            </div>

            <CardTitle className="mt-2 text-base leading-snug">{question.title}</CardTitle>
            {question.description && (
              <CardDescription className="mt-1">{question.description}</CardDescription>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {describeSelection(question)} {live} option{live === 1 ? "" : "s"} offered
              {retired > 0 && `, ${retired} retired`}
              {question.response_count > 0 &&
                ` · ${question.response_count} answer${question.response_count === 1 ? "" : "s"} recorded`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            {question.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={onRetire}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Retire
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Hide options" : "Show options"}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-2 border-t border-border bg-muted/20 pt-4">
          {question.options.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No options yet. A question with nothing to pick cannot be answered.
            </p>
          ) : (
            question.options.map((option, i) => (
              <div
                key={option.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5",
                  option.is_active ? "border-border" : "border-dashed opacity-60"
                )}
              >
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={i === 0 || busy}
                    onClick={() => onMoveOption(i, i - 1)}
                    aria-label={`Move "${option.title}" up`}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={i === question.options.length - 1 || busy}
                    onClick={() => onMoveOption(i, i + 1)}
                    aria-label={`Move "${option.title}" down`}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <OptionIcon name={option.icon} className="h-4 w-4 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{option.title}</p>
                    {!option.is_active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Retired
                      </Badge>
                    )}
                  </div>
                  {option.description && (
                    <p className="truncate text-xs text-muted-foreground">{option.description}</p>
                  )}
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {option.value}
                    {option.response_count > 0 && (
                      <span className="ml-2 font-sans">
                        · chosen {option.response_count}{" "}
                        {option.response_count === 1 ? "time" : "times"}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditOption(option)}
                    aria-label={`Edit "${option.title}"`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {option.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRetireOption(option)}
                      aria-label={`Retire "${option.title}"`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}

          <Button variant="outline" size="sm" className="mt-1 w-full" onClick={onAddOption}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add an option
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════════════════ */

export default function OnboardingQuestionnairePage() {
  const { toast } = useToast()

  const [questions, setQuestions] = React.useState<AdminQuestion[]>([])
  const [respondents, setRespondents] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [showRetired, setShowRetired] = React.useState(false)

  const [questionDialog, setQuestionDialog] = React.useState<{
    open: boolean
    question: AdminQuestion | null
  }>({ open: false, question: null })

  const [optionDialog, setOptionDialog] = React.useState<{
    open: boolean
    questionId: string
    option: AdminOption | null
    nextOrder: number
  }>({ open: false, questionId: "", option: null, nextOrder: 0 })

  const [retiring, setRetiring] = React.useState<
    | { kind: "question"; question: AdminQuestion }
    | { kind: "option"; option: AdminOption }
    | null
  >(null)
  const [retirePending, setRetirePending] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const data = await onboardingAdminApi.list()
      setQuestions(data.questions)
      setRespondents(data.respondents)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the questionnaire.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const visible = showRetired ? questions : questions.filter((q) => q.is_active)

  const liveQuestions = questions.filter((q) => q.is_active)
  const liveOptions = questions.reduce(
    (n, q) => n + q.options.filter((o) => o.is_active).length,
    0
  )

  /*
   * Reorder optimistically, then confirm.
   *
   * Moving a row and waiting for a round trip before it moves reads as a
   * broken button, and someone clicks again — which is how a list gets
   * reordered twice. The list moves at once and is reloaded from the server
   * afterwards, so a rejected write corrects itself rather than leaving the
   * screen disagreeing with the database.
   */
  const moveQuestion = async (from: number, to: number) => {
    const shown = visible
    if (to < 0 || to >= shown.length) return

    const reordered = moveInList(shown, from, to)
    setQuestions((prev) => {
      const moved = new Map(reordered.map((q, i) => [q.id, i]))
      return [...prev].sort(
        (a, b) => (moved.get(a.id) ?? a.display_order) - (moved.get(b.id) ?? b.display_order)
      )
    })

    setBusy(true)
    try {
      await onboardingAdminApi.reorder("questions", reordered.map((q) => q.id))
    } catch (e) {
      toast({
        title: "Order not saved",
        description: e instanceof Error ? e.message : "The previous order has been restored.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
      void load()
    }
  }

  const moveOption = async (question: AdminQuestion, from: number, to: number) => {
    if (to < 0 || to >= question.options.length) return
    const reordered = moveInList(question.options, from, to)

    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, options: reordered } : q))
    )

    setBusy(true)
    try {
      await onboardingAdminApi.reorder(question.id, reordered.map((o) => o.id))
    } catch (e) {
      toast({
        title: "Order not saved",
        description: e instanceof Error ? e.message : "The previous order has been restored.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
      void load()
    }
  }

  const confirmRetire = async () => {
    if (!retiring) return
    setRetirePending(true)
    try {
      if (retiring.kind === "question") {
        await onboardingAdminApi.retireQuestion(retiring.question.id)
        toast({
          title: "Question retired",
          description: "It is no longer asked. Answers already given are kept.",
        })
      } else {
        await onboardingAdminApi.retireOption(retiring.option.id)
        toast({
          title: "Option retired",
          description: "It is no longer offered. Answers already given are kept.",
        })
      }
      setRetiring(null)
      await load()
    } catch (e) {
      toast({
        title: "Could not retire it",
        description: e instanceof Error ? e.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setRetirePending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Registration questionnaire
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The questions on the &ldquo;About you&rdquo; step of registration. Changes are live
            immediately — the registration form reads this, it does not ship with a copy.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/register" target="_blank" rel="noreferrer">
              <Eye className="mr-1.5 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button onClick={() => setQuestionDialog({ open: true, question: null })}>
            <Plus className="mr-1.5 h-4 w-4" />
            New question
          </Button>
        </div>
      </div>

      {/* ── At a glance ────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Target}
          label="Questions asked"
          value={liveQuestions.length}
          hint={
            questions.length > liveQuestions.length
              ? `${questions.length - liveQuestions.length} retired`
              : "All of them are live"
          }
        />
        <StatTile icon={Sparkles} label="Options offered" value={liveOptions} />
        <StatTile
          icon={Users}
          label="People answered"
          value={respondents}
          hint={respondents === 0 ? "Nobody has registered through it yet" : undefined}
        />
      </div>

      {/* ── The list ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : loadError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-foreground">The questionnaire did not load</p>
              <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Shown in the order a learner sees them.
            </p>
            {questions.length > liveQuestions.length && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={showRetired} onCheckedChange={setShowRetired} />
                <span className="text-muted-foreground">Show retired</span>
              </label>
            )}
          </div>

          {visible.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Target className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">No questions yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Registration skips the &ldquo;About you&rdquo; step entirely until there is
                    something to ask.
                  </p>
                </div>
                <Button onClick={() => setQuestionDialog({ open: true, question: null })}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add the first question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  total={visible.length}
                  busy={busy}
                  onEdit={() => setQuestionDialog({ open: true, question })}
                  onRetire={() => setRetiring({ kind: "question", question })}
                  onMove={(to) => void moveQuestion(index, to)}
                  onMoveOption={(from, to) => void moveOption(question, from, to)}
                  onAddOption={() =>
                    setOptionDialog({
                      open: true,
                      questionId: question.id,
                      option: null,
                      nextOrder: question.options.length + 1,
                    })
                  }
                  onEditOption={(option) =>
                    setOptionDialog({
                      open: true,
                      questionId: question.id,
                      option,
                      nextOrder: option.display_order,
                    })
                  }
                  onRetireOption={(option) => setRetiring({ kind: "option", option })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <QuestionDialog
        open={questionDialog.open}
        onOpenChange={(open) => setQuestionDialog((d) => ({ ...d, open }))}
        question={questionDialog.question}
        nextOrder={questions.length + 1}
        onSaved={() => void load()}
      />

      <OptionDialog
        open={optionDialog.open}
        onOpenChange={(open) => setOptionDialog((d) => ({ ...d, open }))}
        questionId={optionDialog.questionId}
        option={optionDialog.option}
        nextOrder={optionDialog.nextOrder}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={!!retiring}
        onOpenChange={(open) => !open && setRetiring(null)}
        destructive
        pending={retirePending}
        confirmLabel="Retire it"
        title={
          retiring?.kind === "question"
            ? "Retire this question?"
            : "Retire this option?"
        }
        description={
          retiring && (
            <span className="space-y-2">
              <span className="block">
                {retiring.kind === "question"
                  ? "It stops being asked at registration."
                  : "It stops being offered at registration."}{" "}
                Nothing is deleted — everyone who already answered keeps their answer, and you can
                turn it back on from the edit form.
              </span>
              {(retiring.kind === "question"
                ? retiring.question.response_count
                : retiring.option.response_count) > 0 && (
                <span className="block font-medium text-foreground">
                  {retiring.kind === "question"
                    ? `${retiring.question.response_count} answers have been recorded against it.`
                    : `${retiring.option.response_count} people have chosen it.`}
                </span>
              )}
            </span>
          )
        }
        onConfirm={confirmRetire}
      />
    </div>
  )
}
