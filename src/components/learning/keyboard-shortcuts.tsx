"use client"

import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Keyboard shortcuts (plan §11.9).
 *
 * Two rules keep these from getting in the way:
 *   • they never fire while the learner is typing (input, textarea,
 *     contenteditable) or holding a modifier — otherwise "n" would be
 *     unusable inside an essay answer
 *   • every shortcut is discoverable through the `?` dialog, so nothing here
 *     is hidden knowledge
 */

export interface ShortcutHandlers {
  onNext: () => void
  onPrevious: () => void
  onToggleSidebar: () => void
  onFocusSearch: () => void
  onToggleNotes: () => void
  onShowHelp: () => void
}

function isTypingContext(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable === true
  )
}

export function useLearningShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingContext(event.target)) return

      switch (event.key) {
        case "n":
          event.preventDefault()
          handlers.onNext()
          break
        case "p":
          event.preventDefault()
          handlers.onPrevious()
          break
        case "s":
          event.preventDefault()
          handlers.onToggleSidebar()
          break
        case "b":
          event.preventDefault()
          handlers.onToggleNotes()
          break
        case "/":
          event.preventDefault()
          handlers.onFocusSearch()
          break
        case "?":
          event.preventDefault()
          handlers.onShowHelp()
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handlers, enabled])
}

const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
  { keys: ["n"], description: "Next step" },
  { keys: ["p"], description: "Previous step" },
  { keys: ["s"], description: "Toggle course contents" },
  { keys: ["b"], description: "Toggle notes" },
  { keys: ["/"], description: "Search this course" },
  { keys: ["?"], description: "Show this help" },
  { keys: ["↑", "↓"], description: "Move through the contents list" },
  { keys: ["Esc"], description: "Close a panel or dialog" },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-sm">
            Shortcuts are disabled while you're typing.
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.description}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
