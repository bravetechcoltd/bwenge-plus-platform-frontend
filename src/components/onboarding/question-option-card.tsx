"use client"

import * as React from "react"
import * as Icons from "lucide-react"
import { Check } from "lucide-react"
import type { OnboardingOption } from "@/lib/onboarding/api"

/**
 * One selectable card (ONB-001 §10, §11, §28).
 *
 * ── Why a button and not a div with an onClick ─────────────────────────────
 *
 * §28 asks for keyboard navigation, focus, screen-reader labels and proper
 * radio/checkbox semantics. A real `<button>` with `role="radio"`/`"checkbox"`
 * and `aria-checked` gets all of that from the platform: tab order, Enter and
 * Space, focus ring, and an announcement that says "checked" rather than
 * leaving a blind user to infer selection from a colour.
 *
 * The whole card is that button, because §10 is explicit that clicking
 * anywhere selects — not only the small indicator.
 *
 * Selection is never communicated by colour alone: the border changes, the
 * background tints, *and* the indicator fills with a tick.
 */
export function QuestionOptionCard({
  option,
  selected,
  disabled,
  multiple,
  onToggle,
}: {
  option: OnboardingOption
  selected: boolean
  /** True when a maximum is reached and this card is not one of the chosen. */
  disabled?: boolean
  multiple: boolean
  onToggle: () => void
}) {
  // Icons arrive as a name from the database, so an administrator can add a
  // category without a deployment. An unknown name falls back rather than
  // crashing the question.
  const Icon =
    (option.icon && (Icons as any)[option.icon]) || Icons.Sparkles

  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-label={option.description ? `${option.title}. ${option.description}` : option.title}
      disabled={disabled && !selected}
      onClick={onToggle}
      className={`group relative flex h-full flex-col items-center rounded-xl border-2 p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
      } ${disabled && !selected ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      {/* The icon block. Fixed size so one long title cannot distort the row (§20). */}
      <span
        className={`mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors ${
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {option.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.image_url}
            alt=""
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <Icon className="h-6 w-6" aria-hidden />
        )}
      </span>

      <span className="flex min-h-[2.5rem] flex-1 items-center justify-center text-[13px] font-semibold leading-snug text-foreground">
        {option.title}
      </span>

      {option.description && (
        <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {option.description}
        </span>
      )}

      {/* The indicator. Round for single choice, square for multiple — the
          shape says which rule applies before anything is clicked. */}
      <span
        aria-hidden
        className={`mt-3 flex h-5 w-5 items-center justify-center border-2 transition-colors ${
          multiple ? "rounded" : "rounded-full"
        } ${selected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  )
}
