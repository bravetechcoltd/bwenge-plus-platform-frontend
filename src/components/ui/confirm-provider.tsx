"use client"

import * as React from "react"
import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog"

/**
 * Promise-based confirmation, to replace native `confirm()` (CONF-001).
 *
 * ── Why a hook rather than state in every page ─────────────────────────────
 *
 * Fourteen `confirm()` calls were spread across nine files. Converting each
 * to a rendered `<ConfirmDialog>` means, per call site, a piece of state for
 * which item is pending, an effect to clear it, a handler split in two, and a
 * dialog in the JSX — four opportunities to get it subtly wrong, times
 * fourteen, in pages that are otherwise untouched.
 *
 * `confirm()` is already an awaitable question in the shape callers want:
 *
 *     if (!confirm("Delete this?")) return
 *     if (!(await confirm({ title: "Delete this course?" }))) return
 *
 * So the hook keeps that shape and changes only what the question looks like.
 * The dialog is rendered once, by the provider, and the promise settles when
 * the person answers.
 *
 * ── What the native one was costing ────────────────────────────────────────
 *
 * `window.confirm` blocks the main thread, cannot be styled or themed, shows
 * the origin ("localhost:3000 says"), is suppressed entirely if the user
 * ticks "prevent this page from creating more dialogues", and cannot say
 * anything beyond one line of plain text — so a destructive action could not
 * explain what it would destroy.
 */

export type ConfirmOptions = Omit<
  ConfirmDialogProps,
  "open" | "onOpenChange" | "onConfirm" | "pending"
>

type Pending = {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null)

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve })
      }),
    []
  )

  /*
   * Closing by any route is a "no".
   *
   * Escape, the backdrop and the cancel button all come through here. If the
   * promise were only settled by the confirm button, dismissing the dialog
   * would leave the caller awaiting forever — and the caller is usually in
   * the middle of a handler holding a loading flag.
   */
  const settle = React.useCallback(
    (confirmed: boolean) => {
      setPending((current) => {
        current?.resolve(confirmed)
        return null
      })
    },
    []
  )

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) settle(false)
        }}
        onConfirm={() => settle(true)}
        // `title` is required; the fallback only exists for the frame between
        // closing and unmounting, where `pending` is already null.
        title={pending?.options.title ?? ""}
        description={pending?.options.description}
        confirmLabel={pending?.options.confirmLabel}
        cancelLabel={pending?.options.cancelLabel}
        destructive={pending?.options.destructive}
      />
    </ConfirmContext.Provider>
  )
}

/**
 * Ask the person to confirm something.
 *
 * Returns true if they confirmed, false if they cancelled or dismissed.
 *
 * Outside the provider it falls back to `window.confirm` rather than
 * throwing: a confirmation that looks plain is a great deal better than a
 * destructive action that proceeds unchallenged because a provider was
 * missing from one corner of the tree.
 */
export function useConfirm() {
  const context = React.useContext(ConfirmContext)

  return React.useCallback(
    (options: ConfirmOptions | string): Promise<boolean> => {
      const resolved =
        typeof options === "string" ? { title: options } : options

      if (!context) {
        if (typeof window === "undefined") return Promise.resolve(false)
        return Promise.resolve(
          window.confirm(
            [resolved.title, typeof resolved.description === "string" ? resolved.description : ""]
              .filter(Boolean)
              .join("\n\n")
          )
        )
      }

      return context(resolved)
    },
    [context]
  )
}
