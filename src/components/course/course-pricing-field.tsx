"use client"

import * as React from "react"
import { DollarSign, Gift, Tag } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

/**
 * ============================================================================
 * Free / paid pricing (CP-001)
 * ============================================================================
 *
 * The pricing control for both course forms.
 *
 * ── What it replaces ───────────────────────────────────────────────────────
 *
 * A single "Price (USD)" box on one form and nothing at all on the other. The
 * box was effectively mandatory, so authors of free courses — most of them —
 * typed 0, and the catalogue rendered "0 USD", which reads as a missing price
 * rather than a free course. The currency was a label, not a choice, so an
 * amount in francs still displayed as dollars.
 *
 * The author now states which they mean. Free clears the amount rather than
 * hiding it, so a course cannot be shown as free while carrying a stale price
 * that other screens might pick up.
 */

export const CURRENCIES = [
  { code: "RWF", label: "RWF", hint: "Rwandan Franc", symbol: "FRw" },
  { code: "USD", label: "USD", hint: "US Dollar", symbol: "$" },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

export interface CoursePricing {
  is_free?: boolean
  price?: number | string | null
  currency?: string | null
}

/**
 * Whether the course being edited is free.
 *
 * `is_free` wins when the record has it. Courses saved before this existed do
 * not, so a price is the next best evidence — without that fallback every
 * existing paid course would open in the form as free and be saved back that
 * way on the next edit.
 */
export function isFreeCourse(data: CoursePricing): boolean {
  if (typeof data.is_free === "boolean") return data.is_free
  return !(Number(data.price) > 0)
}

/** What the author must still fix, or null when the pricing is valid. */
export function pricingError(data: CoursePricing): string | null {
  if (isFreeCourse(data)) return null
  if (!(Number(data.price) > 0)) return "Enter a price greater than zero, or mark the course as free."
  if (!data.currency) return "Choose a currency for the price."
  return null
}

/** "Free", or the amount with its currency. Used wherever a price is shown. */
export function formatCoursePrice(data: CoursePricing): string {
  if (isFreeCourse(data)) return "FREE"
  const amount = Number(data.price) || 0
  const currency = CURRENCIES.find((c) => c.code === data.currency)
  return currency ? `${amount.toLocaleString()} ${currency.code}` : `${amount.toLocaleString()}`
}

export function CoursePricingField({
  courseData,
  setCourseData,
  labelClassName = "",
  inputClassName = "",
}: {
  courseData: CoursePricing & Record<string, any>
  setCourseData: (data: any) => void
  labelClassName?: string
  inputClassName?: string
}) {
  const free = isFreeCourse(courseData)
  const error = pricingError(courseData)

  /*
   * Choosing free clears the amount and currency in the same update rather
   * than only hiding the field. A hidden value is still a value: it would be
   * sent on save and stored against a course marked free.
   */
  const choose = (isFree: boolean) => {
    if (isFree) {
      setCourseData({ ...courseData, is_free: true, price: 0, currency: null })
    } else {
      setCourseData({
        ...courseData,
        is_free: false,
        // Defaulted so the author picks an amount, not a currency they did not
        // know they had to pick.
        currency: courseData.currency || "RWF",
        price: Number(courseData.price) > 0 ? courseData.price : "",
      })
    }
  }

  return (
    <div className="space-y-2.5">
      <Label className={labelClassName}>
        <span className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          Pricing
        </span>
      </Label>

      <div role="radiogroup" aria-label="Course pricing" className="grid grid-cols-2 gap-2">
        <PricingOption
          selected={free}
          onSelect={() => choose(true)}
          icon={<Gift className="w-4 h-4" />}
          title="Is Free Course"
          hint="Anyone can enroll at no cost"
        />
        <PricingOption
          selected={!free}
          onSelect={() => choose(false)}
          icon={<DollarSign className="w-4 h-4" />}
          title="Course Requires Cost"
          hint="Learners pay to enroll"
        />
      </div>

      {/*
        Rendered only when the course is paid, so a free course's form carries
        no amount at all — nothing hidden, nothing to submit by accident.
      */}
      {!free && (
        <div className="grid grid-cols-[1fr_auto] gap-2 pt-0.5">
          <div className="space-y-1.5">
            <Label htmlFor="course-price" className={labelClassName}>
              Price <span className="text-destructive">*</span>
            </Label>
            <Input
              id="course-price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "course-price-error" : undefined}
              value={courseData.price ?? ""}
              onChange={(e) =>
                setCourseData({
                  ...courseData,
                  is_free: false,
                  price: e.target.value === "" ? "" : Number.parseFloat(e.target.value),
                })
              }
              className={inputClassName}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-currency" className={labelClassName}>
              Currency <span className="text-destructive">*</span>
            </Label>
            <select
              id="course-currency"
              required
              value={courseData.currency || "RWF"}
              onChange={(e) => setCourseData({ ...courseData, is_free: false, currency: e.target.value })}
              className={inputClassName}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} — {c.hint}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p id="course-price-error" role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function PricingOption({
  selected,
  onSelect,
  icon,
  title,
  hint,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40 hover:bg-accent"
      }`}
    >
      <span className={selected ? "mt-0.5 text-primary" : "mt-0.5 text-muted-foreground"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}
