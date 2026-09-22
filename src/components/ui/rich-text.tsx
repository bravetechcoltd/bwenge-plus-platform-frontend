"use client"

/**
 * ============================================================================
 * RichText — displaying what the rich text editor produced
 * ============================================================================
 *
 * Course, module, lesson and assessment copy is authored in `RichTextEditor`
 * and stored as HTML. Anywhere that HTML reaches a `{value}` expression it
 * renders as literal markup — a learner reads `<p>Welcome to the module</p>`,
 * tags and all.
 *
 * That is not hypothetical: module and assessment descriptions were plain
 * textareas until now, so every place that displays them was written expecting
 * plain text. Converting the editors without converting the readers would have
 * traded a formatting limitation for a visibly broken page.
 *
 * Two ways to read the same stored value, because there are two situations:
 *
 *   <RichText />        a block with room to breathe — formatted, as authored
 *   richTextToPlain()   a table cell, a truncated row, a `title` attribute:
 *                       places where markup cannot render and one line is all
 *                       there is
 *
 * ── On `dangerouslySetInnerHTML` ───────────────────────────────────────────
 *
 * This content is authored by course staff, who already have far more direct
 * routes to a learner's browser than a description field. The exposure is not
 * new and is the same one `lesson-screen.tsx` has always carried for lesson
 * bodies. What is new is that it now applies to two more fields, so the
 * sanitiser below is the floor: script and event handlers are removed before
 * anything is inserted, whatever the source.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Strips the constructs that execute, rather than trying to allow-list the
 * ones that are safe.
 *
 * Deliberately conservative and deliberately not a full sanitiser: a real one
 * (DOMPurify) belongs here if this content ever becomes learner-authored. For
 * staff-authored copy this removes the accidental — a pasted analytics snippet,
 * an `onerror` that came along with copied markup — without pretending to be a
 * boundary against an author who is actively hostile, which is a problem a
 * description field cannot solve anyway.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return ""
  return (
    html
      /*
       * Non-breaking spaces, normalised.
       *
       * `contenteditable` emits `&nbsp;` for a great many of the spaces
       * typed into it — the stored lessons have one between every single
       * word. A non-breaking space is exactly what it says: the browser will
       * not wrap there, so a paragraph becomes one unbreakable token that
       * runs off the side of its container and takes a horizontal scrollbar
       * with it.
       *
       * A lone one between two words is the editor's doing, not the
       * author's. A run of two or more is how someone indents, so those are
       * left exactly as written.
       *
       * `word-break: break-word` would only hide this: the text would wrap,
       * but mid-word, because the browser still sees no legal break point.
       */
      .replace(/(?:&nbsp;|\u00A0)+/g, (run) => {
        const count = (run.match(/&nbsp;|\u00A0/g) ?? []).length
        return count === 1 ? " " : run
      })
      // Script and style blocks, including their contents.
      .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      // Unclosed variants of the same.
      .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>/gi, "")
      // Inline event handlers: onclick=, onerror=, and the rest.
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // javascript: URLs in href/src.
      .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
  )
}

/** The same stored value, as text. For rows, cells and tooltips. */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return ""
  return sanitizeRichText(html)
    .replace(/<[^>]+>/g, " ")
    // Entities that appear constantly in editor output and read as noise.
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** True when the value carries nothing a reader would see. */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  return richTextToPlain(html).length === 0
}

/**
 * Whether the stored value is markup at all.
 *
 * Not every value that reaches this component was written in the editor. A
 * learner's essay answer is the clearest case: everything submitted before the
 * answer field became a rich text editor is plain text with real newlines in
 * it, and those are the paragraph breaks the learner typed. Handed to
 * `dangerouslySetInnerHTML` they collapse and the answer becomes one block —
 * which is worse than it sounds when a marker is reading it against a rubric.
 *
 * Deliberately narrow: an angle bracket alone is not markup, or an answer
 * discussing `a < b` would be treated as HTML and lose its line breaks.
 */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false
  return /<\/?[a-z][a-z0-9-]*(\s[^<>]*)?>/i.test(value)
}

export function RichText({
  html,
  className,
  size = "default",
}: {
  html: string | null | undefined
  className?: string
  /** `compact` for descriptions sitting inside a card; `default` for a body. */
  size?: "default" | "compact"
}) {
  if (isRichTextEmpty(html)) return null

  // Plain text keeps the breaks its author typed, rather than being fed to a
  // parser that will throw them away.
  if (!looksLikeHtml(html)) {
    return (
      <div
        className={cn(
          "min-w-0 max-w-full whitespace-pre-wrap break-words",
          size === "compact" ? "text-sm leading-6" : "text-[15px] leading-7",
          className
        )}
      >
        {html}
      </div>
    )
  }

  return (
    <div
      className={cn(
        // `.rich-text-content` is this project's rich-text stylesheet, in
        // globals.css, and `.is-compact` is the variant that makes `size`
        // mean something: tighter blocks and an inherited colour, for content
        // shown inside a card rather than as a page body.
        //
        // The prose utilities below are inert — the typography plugin is not
        // installed — and are kept only so that adding it later is an
        // improvement rather than a surprise. They are why `size` appeared to
        // work while changing nothing.
        "rich-text-content min-w-0 max-w-full",
        size === "compact" && "is-compact",
        "prose prose-neutral max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-a:text-primary prose-a:underline-offset-2",
        "prose-img:rounded-lg prose-img:border prose-img:border-border",
        "prose-pre:overflow-x-auto prose-pre:rounded-lg",
        "prose-table:block prose-table:overflow-x-auto",
        size === "compact"
          ? "prose-sm prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:mt-3 prose-headings:mb-1"
          : "prose-p:text-[15px] prose-p:leading-7 prose-li:text-[15px] prose-li:leading-7",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html || "") }}
    />
  )
}
