"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

/**
 * ============================================================================
 * How many questions each learner is asked (QP-001 §6, §12)
 * ============================================================================
 *
 * The number authors actually think in: "the bank has 30, ask each learner 10".
 * Stored as `blueprint.total`, which the selection engine already treats as a
 * draw — take that many, preferring questions this learner has not seen. Topic
 * and difficulty quotas can be added to the same blueprint later without
 * another concept or another migration.
 *
 * ── The arithmetic is shown, not a rating ──────────────────────────────────
 *
 * Asking 10 of 30 gives a very different retake to asking 10 of 10, and the
 * difference is the whole point of the setting. So the consequence is stated as
 * a number the moment it is typed. QP-001 §12: a label reading "Excellent" over
 * a bank that cannot support variation tells an author the problem is solved.
 */

interface Props {
  /** Questions currently in this assessment. */
  bankSize: number
  /** Current `blueprint.total`, or null when every question is asked. */
  value: number | null
  onChange: (total: number | null) => void
}

/** C(n, k) — how many distinct papers the pool can produce. */
function combinations(n: number, k: number): number {
  if (k < 0 || k > n || n <= 0) return 0
  k = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i
  return Math.round(result)
}

export function QuestionsPerAttempt({ bankSize, value, onChange }: Props) {
  const asked = value && value > 0 ? Math.min(value, bankSize) : bankSize
  const papers = bankSize > 0 ? combinations(bankSize, asked) : 0
  const overlap = bankSize > 0 ? Math.round((asked / bankSize) * 100) : 100

  // What it would take to get repetition below half — the only part of this an
  // author can act on.
  const needed =
    asked > 0 && overlap > 50 ? Math.max(0, Math.ceil(asked / 0.5) - bankSize) : 0

  return (
    <div className="space-y-2">
      <Label htmlFor="questions-per-attempt" className="font-medium">
        Questions per learner
      </Label>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="questions-per-attempt"
          type="number"
          min={1}
          max={Math.max(1, bankSize)}
          value={value ?? ""}
          placeholder={String(bankSize)}
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (!raw) return onChange(null)
            const n = Math.max(1, Math.round(Number(raw) || 1))
            onChange(Math.min(n, Math.max(1, bankSize)))
          }}
          className="w-28"
        />
        <span className="text-sm text-muted-foreground">
          of {bankSize} written{value ? "" : " — all of them"}
        </span>
        {bankSize > 0 && (
          <Badge variant={overlap >= 80 ? "outline" : "secondary"}>
            {papers.toLocaleString()} possible paper{papers === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {bankSize === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add questions first, then choose how many each learner is asked.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          A retake will repeat about <strong>{overlap}%</strong> of its questions.
          {needed > 0 && (
            <>
              {" "}
              Write <strong>{needed}</strong> more to bring that below half.
            </>
          )}
          {overlap === 100 && bankSize > 0 && (
            <> Every learner sees every question, so retakes cannot differ.</>
          )}
        </p>
      )}
    </div>
  )
}
