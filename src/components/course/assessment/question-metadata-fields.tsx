"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus } from "lucide-react"

/**
 * ============================================================================
 * QuestionMetadataFields — the classification a blueprint runs on (QP-001 §16)
 * ============================================================================
 *
 * One component, used by every authoring surface: the assessment editor, the
 * course question bank, and the creation wizard. QP-001 §5 is explicit that
 * there must not be three question editors, and this is the part that would
 * otherwise be copied three times and drift.
 *
 * ── Why topic and difficulty are not behind "Advanced" ─────────────────────
 *
 * They are what the blueprint allocates on. Hidden behind an accordion they
 * would go unset — as they are on all 1,032 existing questions — and a
 * blueprint cannot allocate quotas across dimensions nobody recorded. The
 * genuinely advanced settings (objective, competency, pool tag) do collapse.
 *
 * ── Free-text topic with suggestions, not a fixed list ─────────────────────
 *
 * A topic vocabulary that must be defined before the first question can be
 * written is a barrier at exactly the wrong moment. The input is free text
 * backed by a datalist of topics already used in this course, so the second
 * question offers what the first one established and the vocabulary converges
 * without anyone administering it.
 */

export interface QuestionMetadata {
  topic?: string | null
  difficulty?: string | null
  objective?: string | null
  competency?: string | null
  tags?: string[]
  explanation?: string | null
  status?: string | null
  pool_tag?: string | null
}

interface Props {
  value: QuestionMetadata
  onChange: (patch: Partial<QuestionMetadata>) => void
  /** Topics already used in this course, offered as suggestions. */
  knownTopics?: string[]
  /** Hides status and pool assignment where the surface does not own them. */
  compact?: boolean
  idPrefix?: string
}

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const
export const STATUSES = ["DRAFT", "REVIEW", "ACTIVE", "RETIRED"] as const

export function QuestionMetadataFields({
  value,
  onChange,
  knownTopics = [],
  compact = false,
  idPrefix = "qmeta",
}: Props) {
  const [advanced, setAdvanced] = React.useState(false)
  const [tagDraft, setTagDraft] = React.useState("")
  const listId = `${idPrefix}-topics`

  const tags = value.tags ?? []

  const addTag = () => {
    const tag = tagDraft.trim()
    if (!tag || tags.includes(tag)) {
      setTagDraft("")
      return
    }
    onChange({ tags: [...tags, tag] })
    setTagDraft("")
  }

  return (
    <div className="space-y-4">
      {/* Primary: what selection actually uses. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-topic`}>Topic</Label>
          <Input
            id={`${idPrefix}-topic`}
            list={listId}
            value={value.topic ?? ""}
            onChange={(e) => onChange({ topic: e.target.value })}
            placeholder="e.g. Patient Safety"
          />
          <datalist id={listId}>
            {knownTopics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            Groups questions so a retake can keep the same coverage.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-difficulty`}>Difficulty</Label>
          <Select
            value={value.difficulty ?? "UNSET"}
            onValueChange={(v) => onChange({ difficulty: v === "UNSET" ? null : v })}
          >
            <SelectTrigger id={`${idPrefix}-difficulty`}>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNSET">Not set</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Keeps retakes from becoming easier or harder than the first attempt.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-explanation`}>Explanation (optional)</Label>
        <Textarea
          id={`${idPrefix}-explanation`}
          value={value.explanation ?? ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Why the correct answer is correct…"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange({ tags: tags.filter((t) => t !== tag) })}
                className="ml-1 rounded-sm hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the tag rather than submitting the surrounding
                // form, which would discard the whole question.
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Add tag"
              className="h-8 w-32"
            />
            <Button type="button" size="sm" variant="ghost" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          onClick={() => setAdvanced((a) => !a)}
        >
          {advanced ? "Hide" : "Show"} advanced assessment settings
        </Button>
      </div>

      {advanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-objective`}>Learning objective</Label>
            <Input
              id={`${idPrefix}-objective`}
              value={value.objective ?? ""}
              onChange={(e) => onChange({ objective: e.target.value })}
              placeholder="e.g. LO-2.3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-competency`}>Competency</Label>
            <Input
              id={`${idPrefix}-competency`}
              value={value.competency ?? ""}
              onChange={(e) => onChange({ competency: e.target.value })}
              placeholder="Optional"
            />
          </div>

          {!compact && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-status`}>Status</Label>
                <Select
                  value={value.status ?? "ACTIVE"}
                  onValueChange={(v) => onChange({ status: v })}
                >
                  <SelectTrigger id={`${idPrefix}-status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only Active questions are given to learners.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-pool`}>Pool tag</Label>
                <Input
                  id={`${idPrefix}-pool`}
                  value={value.pool_tag ?? ""}
                  onChange={(e) => onChange({ pool_tag: e.target.value })}
                  placeholder="e.g. main"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
