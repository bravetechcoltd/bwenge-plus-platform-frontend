"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * ============================================================================
 * Checkbox — a control that has to look like one on any surface
 * ============================================================================
 *
 * The unchecked box used to be a 16px square with a 1px `border-input` edge,
 * and `--input` is `oklch(0.93 0 0)` — 93% lightness. On a white card that is
 * already faint; on a tinted panel (the proctoring acknowledgement sits on
 * `bg-warning/[0.06]`) it disappears, and the box reads as a stray mark rather
 * than as something to click. That matters most exactly where it was worst:
 * the assessment screens, where this is both the consent control and the
 * answer control for every multi-select question.
 *
 * Three changes, all aimed at "is visibly a control, unchecked, anywhere":
 *
 *  · its own background rather than whatever it is sitting on, so a tinted
 *    panel cannot swallow it;
 *  · a 2px edge in a foreground tint, which tracks the theme instead of
 *    pinning one grey that only works on white;
 *  · 18px rather than 16px — still compact next to 13–14px body copy, but
 *    enough to carry the heavier edge without looking like a bullet.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[1.125rem] shrink-0 rounded-[5px] border-2 border-foreground/30 bg-background shadow-sm",
        "transition-colors outline-none",
        "hover:border-primary/70",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
