/**
 * ============================================================================
 * Paste-a-list-of-questions parser (QP-001 §17)
 * ============================================================================
 *
 * Authors do not compose questions one web form at a time. They arrive with a
 * document — a past paper, a bank from a colleague, something a textbook
 * shipped — and the honest way to get 40 questions into a course is to let them
 * paste it.
 *
 * ── What it accepts ────────────────────────────────────────────────────────
 *
 * The formats people actually paste, not one house style:
 *
 *     1. What is 2 + 2?
 *     A) 3
 *     B) 4
 *     C) 5
 *     Answer: B
 *
 *     Q: The sky is blue.
 *     True / False
 *     Answer: True
 *
 *     3) Name the capital of France.
 *     a. Lyon
 *     b. Paris  *
 *     Explanation: Paris has been the capital since 987.
 *
 * Correct answers are recognised from an `Answer:` line (by letter or by full
 * text), or from a `*` / `✓` marking an option.
 *
 * ── What it refuses to do ──────────────────────────────────────────────────
 *
 * It never guesses a correct answer. A question whose key cannot be determined
 * is returned with `correct_answer: ""` and a warning, because a silently wrong
 * key is a question every learner gets wrong for a reason nobody can see — far
 * worse than a question the author has to finish by hand.
 *
 * Nothing here writes anything. It returns a preview the author confirms, which
 * is the whole reason parsing is safe to be this permissive.
 */

export type ParsedType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "SHORT_ANSWER"

export interface ParsedQuestion {
  question: string
  type: ParsedType
  options: string[]
  correct_answer: string
  explanation?: string
  points: number
  /** Anything the author should look at before accepting this one. */
  warnings: string[]
}

export interface ParseResult {
  questions: ParsedQuestion[]
  /** Lines that belonged to no question, so nothing is silently discarded. */
  ignored: string[]
}

/** `1.` `1)` `Q1.` `Q:` `Question 4:` — the ways a question number is written. */
const QUESTION_START =
  /^\s*(?:(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):\]]\s*|Q(?:uestion)?\s*[:.]\s*)/i

/** `A)` `A.` `(a)` `a -` followed by the option text. */
const OPTION_LINE = /^\s*[(\[]?([A-Ha-h])[)\].:\-]\s+(.*\S)\s*$/

/** A bare `-` or `*` bullet, for lists written without letters. */
const BULLET_LINE = /^\s*[-•*]\s+(.*\S)\s*$/

const ANSWER_LINE =
  /^\s*(?:correct\s*)?(?:answer|ans|key|correct)\s*[:\-]\s*(.+\S)\s*$/i

const EXPLANATION_LINE =
  /^\s*(?:explanation|rationale|why|because)\s*[:\-]\s*(.+\S)\s*$/i

const POINTS_LINE = /^\s*(?:points|marks|score)\s*[:\-]\s*(\d{1,3})\s*$/i

const TRUE_FALSE_HINT = /^\s*true\s*[/|,]\s*false\s*$/i

/** A trailing `*` or `✓` marking the correct option. */
const CORRECT_MARK = /\s*[*✓✔]\s*$/

function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65
}

/**
 * Splits pasted text into per-question blocks.
 *
 * A blank line alone does not start a new question — pasted documents are full
 * of them — so a block ends where the next numbered question begins, or at a
 * blank line that is followed by something which cannot continue the current
 * question.
 */
function blocks(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const found: string[][] = []
  let current: string[] = []

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (QUESTION_START.test(line) && current.some((l) => l.trim())) {
      found.push(current)
      current = [line]
      continue
    }
    current.push(line)
  }

  if (current.some((l) => l.trim())) found.push(current)
  return found.filter((b) => b.some((l) => l.trim()))
}

function parseBlock(block: string[]): ParsedQuestion | null {
  const warnings: string[] = []
  const options: string[] = []
  const markedCorrect: number[] = []

  let questionParts: string[] = []
  let answerRaw: string | null = null
  let explanation: string | undefined
  let points = 1
  let sawTrueFalseHint = false
  let inOptions = false

  for (const line of block) {
    if (!line.trim()) continue

    const answer = line.match(ANSWER_LINE)
    if (answer) {
      answerRaw = answer[1].trim()
      inOptions = true
      continue
    }

    const explain = line.match(EXPLANATION_LINE)
    if (explain) {
      explanation = explain[1].trim()
      inOptions = true
      continue
    }

    const pts = line.match(POINTS_LINE)
    if (pts) {
      points = Math.max(1, Number(pts[1]) || 1)
      continue
    }

    if (TRUE_FALSE_HINT.test(line)) {
      sawTrueFalseHint = true
      inOptions = true
      continue
    }

    const lettered = line.match(OPTION_LINE)
    if (lettered) {
      let text = lettered[2]
      if (CORRECT_MARK.test(text)) {
        markedCorrect.push(options.length)
        text = text.replace(CORRECT_MARK, "")
      }
      options.push(text.trim())
      inOptions = true
      continue
    }

    // Bullets count as options only once the question text has been read;
    // otherwise a question that itself begins with a dash would be eaten.
    const bullet = line.match(BULLET_LINE)
    if (bullet && questionParts.length > 0) {
      let text = bullet[1]
      if (CORRECT_MARK.test(text)) {
        markedCorrect.push(options.length)
        text = text.replace(CORRECT_MARK, "")
      }
      options.push(text.trim())
      inOptions = true
      continue
    }

    if (inOptions) {
      // A wrapped option line: append to the previous option rather than
      // starting a new one, so a long option is not split in half.
      if (options.length > 0) {
        options[options.length - 1] = `${options[options.length - 1]} ${line.trim()}`
        continue
      }
    }

    questionParts.push(line.replace(QUESTION_START, "").trim())
  }

  const question = questionParts.join(" ").replace(/\s+/g, " ").trim()
  if (!question) return null

  // ── Type ────────────────────────────────────────────────────────────────
  let type: ParsedType = "SHORT_ANSWER"
  if (options.length >= 2) {
    type = markedCorrect.length > 1 ? "MULTIPLE_SELECT" : "MULTIPLE_CHOICE"
  } else if (sawTrueFalseHint || /^(true|false)$/i.test(answerRaw ?? "")) {
    type = "TRUE_FALSE"
  }

  // ── Correct answer ──────────────────────────────────────────────────────
  let correct = ""

  if (type === "TRUE_FALSE") {
    if (/^true$/i.test(answerRaw ?? "")) correct = "true"
    else if (/^false$/i.test(answerRaw ?? "")) correct = "false"
  } else if (options.length > 0) {
    if (markedCorrect.length > 0) {
      correct = markedCorrect.map((i) => options[i]).join(" | ")
    } else if (answerRaw) {
      // A bare letter refers to an option by position; anything else has to
      // match an option's text, case-insensitively.
      const asLetter = answerRaw.match(/^[(\[]?([A-Ha-h])[)\].]?$/)
      if (asLetter) {
        const index = letterToIndex(asLetter[1])
        if (index >= 0 && index < options.length) correct = options[index]
        else warnings.push(`Answer "${answerRaw}" does not match any option.`)
      } else {
        const hit = options.find(
          (o) => o.toLowerCase() === answerRaw!.toLowerCase()
        )
        if (hit) correct = hit
        else warnings.push(`Answer "${answerRaw}" does not match any option.`)
      }
    }
  } else if (answerRaw) {
    correct = answerRaw
  }

  // ── What the author still needs to do ───────────────────────────────────
  if (!correct) {
    warnings.push("No correct answer found — set it before saving.")
  }
  if (type === "MULTIPLE_CHOICE" && options.length < 2) {
    warnings.push("Fewer than two options.")
  }
  if (options.length > 0 && new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    warnings.push("Two options are identical.")
  }

  return {
    question,
    type,
    options: type === "TRUE_FALSE" ? [] : options,
    correct_answer: correct,
    explanation,
    points,
    warnings,
  }
}

/**
 * Parses pasted text into questions.
 *
 * Never throws: unparseable input yields zero questions and the offending lines
 * in `ignored`, which the caller shows. A parser that throws on a messy paste
 * sends the author back to the form they were trying to avoid.
 */
export function parseQuestions(text: string): ParseResult {
  if (!text || !text.trim()) return { questions: [], ignored: [] }

  const questions: ParsedQuestion[] = []
  const ignored: string[] = []

  for (const block of blocks(text)) {
    try {
      const parsed = parseBlock(block)
      if (parsed) questions.push(parsed)
      else ignored.push(...block.filter((l) => l.trim()))
    } catch {
      ignored.push(...block.filter((l) => l.trim()))
    }
  }

  return { questions, ignored }
}

/** A short, honest summary for the preview header. */
export function summarise(result: ParseResult): string {
  const n = result.questions.length
  if (n === 0) return "Nothing recognised yet."
  const needsWork = result.questions.filter((q) => q.warnings.length > 0).length
  const base = `${n} question${n === 1 ? "" : "s"} found`
  return needsWork > 0 ? `${base} · ${needsWork} need attention` : `${base} · all complete`
}
