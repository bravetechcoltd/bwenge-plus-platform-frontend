"use client"

import * as React from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * One confirmation shell (AXM-CONS-001 F10, finding M-11 group 29).
 *
 * The audit counted twenty-four small confirm dialogs spread across the user
 * management, category and institution pages, at `max-w-sm`, `max-w-md`,
 * `sm:max-w-[500px]` and the primitive's default, each with its own button
 * copy, its own destructive styling and its own pending state — or none.
 *
 * Confirmations are not details views, so they do not belong in
 * `SmartDetailsModal`; they belong on the shipped `alert-dialog` primitive,
 * which already gives them the right semantics. What they needed was one
 * shape, and this is it.
 */
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button and a warning icon. */
  destructive?: boolean
  /** Disables both buttons and spins the confirm one. */
  pending?: boolean
  onConfirm: () => void | Promise<void>
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  pending,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false)
  const isPending = pending ?? busy

  const handleConfirm = async (event: React.MouseEvent) => {
    // The dialog stays open until the work finishes, so a failure is visible
    // here rather than behind a closed dialog and a vanished toast (E-07).
    event.preventDefault()
    try {
      setBusy(true)
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <AlertDialogContent className="w-[min(94vw,28rem)] max-w-none">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              </span>
            )}
            <div className="min-w-0 space-y-1.5">
              <AlertDialogTitle className="text-base font-semibold">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-sm leading-relaxed">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {children && <div className="py-1 text-sm">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className={cn(
              destructive &&
                "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
            )}
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
