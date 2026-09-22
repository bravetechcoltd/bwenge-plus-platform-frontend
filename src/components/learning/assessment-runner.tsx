"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileQuestion,
  Info,
  Loader2,
  Lock,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { RichText, isRichTextEmpty, richTextToPlain } from "@/components/ui/rich-text"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { takeReadiness } from "@/lib/learning/prefetch"
import {
  SecureAssessmentBriefing,
  SecureSessionShell,
  LeaveAssessmentDialog,
  FullscreenPrompt,
} from "@/components/learning/secure-assessment-session"
import { useAssessmentCamera } from "@/hooks/use-assessment-camera"
import {
  SecurityPreCheck,
  CameraStatusChip,
} from "@/components/learning/security-pre-check"
import {
  learningApi,
  type ProgressDiff,
  LearningApiError,
  type AssessmentReadiness,
  type AttemptResult,
  type AttemptSession,
  type LearningStepNode,
  type SanitizedQuestion,
} from "@/lib/learning/api"
import { AssessmentSkeleton, LearningErrorState } from "@/components/learning/learning-states"
import { useAssessmentIntegrity } from "@/hooks/use-assessment-integrity"
import {
  useAssessmentNavigationGuard,
  type LeaveReason,
} from "@/hooks/use-assessment-navigation-guard"
import { AssessmentIntegrityWarning } from "@/components/learning/assessment-integrity-warning"

/**
 * ============================================================================
 * AssessmentRunner — the full assessment experience (plan §10)
 * ============================================================================
 *
 *   Readiness → Instructions → In progress → Confirm → Submitting → Result
 *
 * What is deliberately absent from this component:
 *
 *   • **Any answer key.** Questions arrive sanitized from
 *     `POST /assessments/:id/attempts`. The old screen built a
 *     `correctAnswersMap` from the course payload and rendered correct answers
 *     from it.
 *   • **Any scoring.** It used to compute `earnedPoints` locally and then post
 *     that score to `/progress/complete-step`. Score, pass/fail and progress
 *     now all come back from the server's grader.
 *   • **The timer as a control.** The countdown here is display only; the
 *     attempt's real deadline lives on the server.
 */

const AUTOSAVE_INTERVAL_MS = 20_000
const AUTOSAVE_DEBOUNCE_MS = 800

type Phase =
  | "loading"
  | "readiness"
  | "instructions"
  | "in-progress"
  | "submitting"
  | "result"

export function AssessmentRunner({
  step,
  courseId,
  onGraded,
  onContinue,
  onExit,
  onReviewLesson,
  onGuardChange,
}: {
  step: LearningStepNode
  courseId: string
  /** Fired after a submission so the page can refresh the learning path. */
  /**
   * Called once the attempt is graded. Receives the server's `ProgressDiff`
   * when the submission produced one, so the page can merge it instead of
   * refetching the whole path — the same single-merge route lesson completion
   * takes (LP-CONS-001 §5.5).
   */
  onGraded: (diff?: ProgressDiff) => void
  onContinue: () => void
  /**
   * Leave the assessment without advancing past it.
   *
   * Distinct from `onContinue` on purpose. Continue means "I am done with
   * this, move me forward" and is correct on the result screen, where the
   * next step has just been unlocked. Exit means "get me out of here", and
   * is pressed mid-attempt — when the next step is still locked, because the
   * learner has not passed yet. Routing Exit through Continue sent them at a
   * locked door, which refused, so the button did nothing at all.
   *
   * The caller must also skip the navigation guard: the learner has already
   * confirmed in the exit dialog, and asking a second time is not a second
   * safeguard, it is a bug that looks like one.
   */
  onExit?: () => void
  /**
   * Go back to the lesson this activity belongs to.
   *
   * Distinct from `onContinue`, which moves *forward*. "Review the lesson"
   * was wired to `onContinue` and so advanced past the material the learner
   * had just failed on — the exact opposite of what the button says. Absent
   * for an activity with no owning lesson (a module final), where the caller
   * decides what "back" means.
   */
  onReviewLesson?: () => void
  /**
   * LC-CONS-001 §14.2 interception point 1.
   *
   * Selecting another step in the Learning Sidebar is a `setState` call in the
   * page above — not a route change, so no browser event fires and, before
   * this, nothing observed it. The runner hands the page a gate to await
   * before it changes the step. This is the most common way a learner leaves
   * an assessment, and it was the one exit with no lock on it.
   */
  onGuardChange?: (guard: ((reason: LeaveReason) => Promise<boolean>) | null) => void
}) {
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>("loading")
  const [readiness, setReadiness] = useState<AssessmentReadiness | null>(null)
  const [session, setSession] = useState<AttemptSession | null>(null)
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [error, setError] = useState<LearningApiError | null>(null)

  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  const dirtyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittingRef = useRef(false)
  /** Local clock at the moment the attempt was opened, for skew correction. */
  const sessionOpenedAtRef = useRef(Date.now())

  // ── Behaviour monitoring (LS-SEC-002 §11) ────────────────────────────────
  //
  // Off unless the assessment's policy says otherwise — `mode: "OFF"` is the
  // platform default, so this observes nothing until a course author opts in.
  // The hook reports; the server decides. `verdict` below is the server's
  // answer, never a locally computed one.
  const integrity = useAssessmentIntegrity({
    attemptId: session?.attempt_id ?? null,
    policy: session?.proctoring ?? null,
    active: phase === "in-progress",
    onAutoSubmit: () => {
      // The server has already decided; this only saves the round trip. The
      // sweep submits the attempt regardless if this never runs (§12.4).
      void handleSubmitRef.current?.(true)
    },
  })

  // ── Navigation guard (LC-CONS-001 §14, findings P-13/P-14/P-15) ──────────
  //
  // Active only while an attempt is genuinely open and unsubmitted. Note it is
  // NOT conditional on the proctoring mode: with `mode: "OFF"` the guard still
  // asks, because losing a half-finished attempt to a stray click is a bad
  // outcome regardless of policy. It simply records nothing (§14.4).
  // ── Camera (AS-CAM-001 §6.1) ────────────────────────────────────────────
  //
  // Reports through `integrity.reportCameraEvent`, which is the existing
  // queue — not a second pipeline. The hook has no other route to the
  // server and no authority over the attempt at all.
  const cameraPolicy = readiness?.proctoring ?? session?.proctoring ?? null
  const cameraEnabled = (cameraPolicy as any)?.camera_mode === "RECORD"
  const cameraRequired = (cameraPolicy as any)?.camera_required === true

  const camera = useAssessmentCamera({
    attemptId: session?.attempt_id ?? null,
    enabled: cameraEnabled,
    startedAt: session?.started_at ? new Date(session.started_at).getTime() : null,
    onEvent: (event) => integrity.reportCameraEvent(event.type, event.meta),
  })

  // The pre-check gates Start only where the camera is required. Everywhere
  // else a failed check is recorded and the learner proceeds.
  const [cameraCheckPassed, setCameraCheckPassed] = useState(false)
  const cameraBlocksStart = cameraEnabled && cameraRequired && !cameraCheckPassed

  const attemptOpen = phase === "in-progress" && !!session?.attempt_id

  // The deliberate exit — the header's Exit control — as distinct from the
  // incidental departures the navigation guard already covers (a sidebar step,
  // the back button, an in-app link). Both end in a confirmation; this one
  // knows it may be submitting the attempt, so it owns its own pending state.
  const [exitOpen, setExitOpen] = useState(false)
  const [exiting, setExiting] = useState(false)

  // ── Full screen ends when the attempt does ──────────────────────────────
  //
  // Full screen means "an attempt is open". Leaving it while one is open is
  // an event worth recording; being held in it after the attempt is over is
  // just a locked door with nobody behind it — the learner is on a result
  // screen with no browser chrome, and the only way out is the same Escape
  // press the assessment spent the last hour treating as an offence.
  //
  // Keyed on the phase rather than called at each `setPhase("result")`, so
  // every route out is covered by construction: the learner submitting, the
  // server auto-submitting, a submission that failed into the result screen,
  // and the deadline expiring. A call sited at one of those is a call the
  // next one added will forget.
  //
  // Held in a ref because the hook returns a fresh object every render, so an
  // unmount cleanup that depended on it would fire on every render instead.
  const exitFullscreenRef = useRef(integrity.exitFullscreen)
  exitFullscreenRef.current = integrity.exitFullscreen

  useEffect(() => {
    if (phase === "in-progress") return
    void exitFullscreenRef.current()
  }, [phase])

  // Leaving the page entirely — a sidebar step, the back button — ends the
  // attempt's claim on the screen just as finishing it does.
  useEffect(() => {
    return () => {
      void exitFullscreenRef.current()
    }
  }, [])

  const reportInAppNavigation = integrity.reportInAppNavigation

  const navigationGuard = useAssessmentNavigationGuard({
    active: attemptOpen,
    onConfirmedLeave: (reason) => {
      // Fire-and-forget on confirmation only. Cancelling records nothing —
      // backing out is compliance, not a violation (§14.6 rule 5).
      reportInAppNavigation(reason)
    },
  })

  // Hand the gate up to the page so a sidebar step change can await it.
  const requestLeave = navigationGuard.requestLeave
  useEffect(() => {
    if (!onGuardChange) return
    onGuardChange(attemptOpen ? requestLeave : null)
    return () => onGuardChange(null)
  }, [onGuardChange, attemptOpen, requestLeave])

  /**
   * Set between pressing "Retake assessment" and actually starting the new
   * attempt.
   *
   * A retake resets the *display* state to `pending` and deliberately keeps
   * the attempt history, so the previous result is still the latest one the
   * server will return. `loadReadiness` treats `pending` as "show the
   * result", which meant a retake reloaded the very screen it was pressed on
   * — the button looked like it did nothing at all. Worse, the reset also
   * changes `step.state`, which rebuilds `loadReadiness` and re-runs the
   * effect below, so clearing the phase once was not enough to escape.
   *
   * A ref, because it has to survive exactly those re-renders.
   */
  const retakeIntentRef = useRef(false)

  // A genuinely different activity starts with no retake in flight.
  useEffect(() => {
    retakeIntentRef.current = false
  }, [step.ref_id])

  // ── Load readiness (and the latest result if there is one) ───────────────
  const loadReadiness = useCallback(async () => {
    setPhase("loading")
    setError(null)
    try {
      // The course bundle already carries readiness for every activity the
      // learner has reached, so opening one for the first time costs no
      // request at all. `takeReadiness` hands an entry over once and then
      // drops it: attempts-used and the lock state it implies change as soon
      // as an attempt is submitted or reset, and a cache that kept answering
      // with the opening snapshot would misreport attempts remaining.
      const data =
        takeReadiness(step.ref_id) ?? (await learningApi.getReadiness(step.ref_id))
      setReadiness(data)

      // A finished attempt goes straight to its result, so revisiting a passed
      // assessment shows the review rather than the start screen — unless the
      // learner has just asked for a retake, which means the opposite.
      //
      // `data.has_passed` is in the condition because the step is not reliable
      // here: preparing a retake sets the progress row back to `pending`, so a
      // learner who passed and was then offered a retake ends up with a step
      // that no longer says they passed. The attempt history still does.
      const showLatestResult =
        !retakeIntentRef.current &&
        (data.has_passed ||
          step.state === "passed" ||
          step.state === "failed" ||
          step.state === "pending")

      if (showLatestResult) {
        const latest = await learningApi.getLatestResult(step.ref_id)
        if (latest) {
          setResult(latest)
          setPhase("result")
          return
        }
      }

      setPhase("readiness")
    } catch (err) {
      setError(
        err instanceof LearningApiError
          ? err
          : new LearningApiError(0, "LOAD_FAILED", "Could not load this assessment.")
      )
      setPhase("readiness")
    }
  }, [step.ref_id, step.state])

  useEffect(() => {
    setSession(null)
    setResult(null)
    setAnswers({})
    setQuestionIndex(0)
    setFlagged(new Set())
    setSecondsLeft(null)
    submittingRef.current = false
    void loadReadiness()
  }, [loadReadiness])

  // ── Countdown (display only) ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "in-progress" || !session?.expires_at) return

    // The offset between this device's clock and the server's, measured once
    // at attempt open. A learner whose system time is wrong by an hour would
    // otherwise see an hour missing from — or added to — their countdown. The
    // deadline itself has always been server-owned; this fixes the display.
    const skewMs = session.server_time
      ? new Date(session.server_time).getTime() - sessionOpenedAtRef.current
      : 0

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(session.expires_at!).getTime() - (Date.now() + skewMs)) / 1000
        )
      )
      setSecondsLeft(remaining)
      if (remaining === 0) {
        // Auto-submit at zero. The server already treats the deadline as
        // authoritative — this just saves the learner a click.
        void handleSubmit(true)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.expires_at])

  // ── Autosave ─────────────────────────────────────────────────────────────
  const flushDraft = useCallback(async () => {
    if (!session || !dirtyRef.current || submittingRef.current) return
    dirtyRef.current = false
    setSaveState("saving")
    try {
      await learningApi.saveDraft(session.attempt_id, answers)
      setSaveState("saved")
    } catch {
      // A failed autosave is recoverable — the answers stay in memory and the
      // next interval retries. Never interrupt the learner for this.
      setSaveState("error")
      dirtyRef.current = true
    }
  }, [session, answers])

  useEffect(() => {
    if (phase !== "in-progress") return
    const id = setInterval(() => void flushDraft(), AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [phase, flushDraft])

  useEffect(() => {
    if (phase !== "in-progress") return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void flushDraft(), AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [answers, phase, flushDraft])

  // ── Start / resume ───────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    // ── Full screen, synchronously, inside the click ──────────────────────
    //
    // This must happen *before* the first `await`. `requestFullscreen`
    // requires transient user activation, and activation does not survive an
    // awaited network call — a fullscreen request made after `openAttempt`
    // resolves is rejected by every browser, silently, with no error the user
    // would ever see. Firing it here keeps it inside the gesture that
    // authorised it.
    //
    // Not awaited, for the same reason the call is placed here: awaiting the
    // promise would push the rest of the handler past the activation window
    // for no benefit. A rejection is not an error condition — the learner
    // simply continues without full screen, and `FullscreenPrompt` offers it
    // again from inside the session (AS-SEC-001 §21.2).
    if (readiness?.proctoring?.require_fullscreen && integrity.fullscreenSupported) {
      void integrity.enterFullscreen()
    }

    setStarting(true)
    try {
      const opened = await learningApi.openAttempt(step.ref_id)
      // The retake has been taken up; later loads may show results again.
      retakeIntentRef.current = false
      sessionOpenedAtRef.current = Date.now()
      setSession(opened)
      setAnswers(opened.draft_answers ?? {})
      setQuestionIndex(0)
      setPhase("in-progress")

      // Started after the attempt exists, because a chunk needs an attempt id
      // to belong to. Not awaited: a slow camera must not delay the learner
      // reaching their first question.
      if (cameraEnabled) void camera.startRecording()

      if (opened.resumed) {
        toast({
          title: "Attempt resumed",
          description: "Your saved answers were restored.",
        })
      }
    } catch (err) {
      const apiError =
        err instanceof LearningApiError
          ? err
          : new LearningApiError(0, "START_FAILED", "Could not start this assessment.")

      toast({
        title:
          apiError.code === "ATTEMPT_LIMIT_REACHED"
            ? "No attempts remaining"
            : "Couldn't start",
        description: apiError.message,
        variant: "destructive",
      })
      void loadReadiness()
    } finally {
      setStarting(false)
    }
  }, [step.ref_id, toast, loadReadiness, readiness, integrity])

  // ── Submit ───────────────────────────────────────────────────────────────
  // Held in a ref so the integrity hook — declared above it — can call it
  // without reordering the component or duplicating the logic.
  const handleSubmitRef = useRef<((auto?: boolean) => Promise<void>) | null>(null)

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!session || submittingRef.current) return

      submittingRef.current = true
      setConfirmOpen(false)
      setPhase("submitting")

      // Stop and flush before the attempt closes, so the last chunks are
      // uploaded while the page is still alive. The server finalises the
      // recording either way — this only improves what it has to work with.
      if (cameraEnabled) {
        try {
          const { chunks, durationMs } = await camera.stopRecording()
          await learningApi
            .completeRecording(session.attempt_id, {
              expected_chunks: chunks,
              duration_ms: durationMs,
            })
            .catch(() => undefined)
        } catch {
          // A recording that cannot be settled must never block a submission.
        }
      }

      try {
        const graded = await learningApi.submitAttempt(session.attempt_id, answers)
        setResult(graded)
        setPhase("result")
        // Grading an activity rolls the lesson, the module and the course up
        // and can unlock what came after it. The diff carries all of that.
        onGraded((graded as any).progress_diff)

        if (graded.requires_manual_grading) {
          toast({
            title: "Submitted",
            description: "Your instructor will grade this and you'll be notified.",
          })
        } else if (graded.passed) {
          toast({
            title: "Passed",
            description: `You scored ${Math.round(graded.percentage ?? 0)}%.`,
          })
        } else {
          toast({
            title: auto ? "Time's up — submitted" : "Not passed yet",
            description: `You scored ${Math.round(graded.percentage ?? 0)}%. You need ${graded.passing_score}% to pass.`,
            variant: "destructive",
          })
        }
      } catch (err) {
        const apiError = err as LearningApiError

        // A duplicate submission returns the original result rather than
        // grading twice — show that instead of an error.
        if (apiError?.code === "ALREADY_SUBMITTED" && apiError.data) {
          setResult(apiError.data as AttemptResult)
          setPhase("result")
          onGraded()
        } else {
          toast({
            title: "Submission failed",
            description: apiError?.message || "Please try again.",
            variant: "destructive",
          })
          setPhase("in-progress")
          submittingRef.current = false
        }
      }
    },
    [session, answers, onGraded, toast]
  )

  handleSubmitRef.current = handleSubmit

  // ── Retake ───────────────────────────────────────────────────────────────
  const handleRetake = useCallback(async () => {
    try {
      retakeIntentRef.current = true
      await learningApi.retakeAssessment(step.ref_id, courseId)
      setResult(null)
      setSession(null)
      setAnswers({})
      setQuestionIndex(0)
      setFlagged(new Set())
      onGraded()
      await loadReadiness()
    } catch (err) {
      retakeIntentRef.current = false
      const apiError = err as LearningApiError
      toast({
        title: "Couldn't start a retake",
        description: apiError?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }, [step.ref_id, courseId, onGraded, loadReadiness, toast])

  const setAnswer = useCallback(
    (questionId: string, value: any) => {
      dirtyRef.current = true
      setSaveState("idle")
      // Answering is the definition of working on the assessment, so it is
      // what resets the idle clock. Deliberately not mouse movement or key
      // presses: a cat on a keyboard would keep an abandoned attempt looking
      // alive, and the record is meant to describe progress, not motion.
      integrity.noteActivity()
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    [integrity]
  )

  const goToQuestion = useCallback(
    (index: number) => {
      integrity.noteActivity()
      setQuestionIndex(index)
    },
    [integrity]
  )

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  if (phase === "loading") return <AssessmentSkeleton />

  if (error && phase === "readiness" && !readiness) {
    return <LearningErrorState error={error} courseId={courseId} onRetry={loadReadiness} />
  }

  if (phase === "result" && result) {
    return (
      <ResultView
        result={result}
        readiness={readiness}
        onRetake={handleRetake}
        onContinue={onContinue}
        onReviewLesson={onReviewLesson}
        onReviewHistory={loadReadiness}
      />
    )
  }

  if (phase === "submitting") {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-[820px] flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-foreground">Submitting your answers…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Don't close this page. Your work is being graded.
        </p>
      </div>
    )
  }

  if (phase === "in-progress" && session) {
    const proctoring = session.proctoring ?? null
    const monitored = !!proctoring && proctoring.mode !== "OFF"

    // Whether walking out ends the attempt. Only true where the policy
    // already ends attempts on its own; everywhere else the attempt stays
    // open and resumable, and saying otherwise would be a threat the system
    // does not carry out.
    const submitsOnLeave = proctoring?.auto_submit_at != null

    const answeredCount = session.questions.filter((q) => isAnswered(answers[q.id])).length

    const handleExitConfirmed = async () => {
      setExiting(true)
      try {
        // Recorded either way: leaving a monitored assessment is an event,
        // whether or not it costs the learner the attempt.
        reportInAppNavigation("IN_APP_LINK")
        if (submitsOnLeave) {
          await handleSubmit(true)
        } else {
          // Out, not onward. `onContinue` would advance to the next step,
          // which is locked until this assessment is passed.
          ;(onExit ?? onContinue)()
        }
      } finally {
        setExiting(false)
        setExitOpen(false)
      }
    }

    return (
      <>
        <SecureSessionShell
          status={{
            title: session.title,
            secondsLeft,
            answered: answeredCount,
            total: session.questions.length,
            saveState,
            online: integrity.online,
            pendingEvents: integrity.pendingEvents,
            monitored,
            isAway: integrity.isAway,
            cameraChip: cameraEnabled ? (
              <CameraStatusChip
                state={camera.state}
                pendingChunks={camera.pendingChunks}
              />
            ) : null,
          }}
          onRequestLeave={() => setExitOpen(true)}
        >
          <InProgressView
            session={session}
            answers={answers}
            questionIndex={questionIndex}
            setQuestionIndex={goToQuestion}
            onAnswer={setAnswer}
            flagged={flagged}
            onToggleFlag={toggleFlag}
            saveState={saveState}
            secondsLeft={secondsLeft}
            onRequestSubmit={() => setConfirmOpen(true)}
            integrity={integrity}
          />
        </SecureSessionShell>

        <LeaveAssessmentDialog
          open={exitOpen}
          onOpenChange={setExitOpen}
          submitsOnLeave={submitsOnLeave}
          submitting={exiting}
          onStay={() => setExitOpen(false)}
          onLeave={() => void handleExitConfirmed()}
        />

        {/*
          The blocking final warning (LS-SEC-002 §12.1).

          A learner must never lose an attempt without a prior, acknowledged
          warning (AC A-17), so this one blocks until they confirm they have
          read it. The soft first warning is a banner inside the view.
        */}
        <IntegrityWarningDialog
          open={
            (integrity.verdict?.level === "FINAL_WARN" ||
              integrity.verdict?.level === "PERSISTENT") &&
            !integrity.acknowledged
          }
          verdict={integrity.verdict}
          onAcknowledge={integrity.acknowledge}
        />

        <SubmitConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          session={session}
          answers={answers}
          onConfirm={() => void handleSubmit(false)}
          onReviewUnanswered={(index) => {
            setConfirmOpen(false)
            setQuestionIndex(index)
          }}
        />

        {/*
          The leave warning (LC-CONS-001 §14.4).

          Distinct from `IntegrityWarningDialog` above: that one is the server's
          escalation ladder speaking after the fact, this one is the moment of
          decision, before anything is recorded. Its copy adapts to the resolved
          policy — under `mode: "OFF"` it is a plain "your draft is saved"
          confirmation and records nothing.
        */}
        <AssessmentIntegrityWarning
          reason={navigationGuard.pendingReason}
          policy={session.proctoring ?? null}
          verdict={integrity.verdict}
          onConfirm={navigationGuard.confirmLeave}
          onCancel={navigationGuard.cancelLeave}
        />
      </>
    )
  }

  return (
    <ReadinessView
      step={step}
      readiness={readiness}
      starting={starting}
      onStart={handleStart}
      onContinue={onContinue}
      preCheckBlocks={cameraBlocksStart}
      preCheck={
        cameraEnabled ? (
          <SecurityPreCheck
            camera={camera}
            required={cameraRequired}
            onReady={setCameraCheckPassed}
          />
        ) : null
      }
    />
  )
}

// ============================================================================
// READINESS
// ============================================================================

function ReadinessView({
  step,
  readiness,
  starting,
  onStart,
  onContinue,
  preCheck,
  preCheckBlocks,
}: {
  step: LearningStepNode
  readiness: AssessmentReadiness | null
  starting: boolean
  onStart: () => void
  onContinue: () => void
  /** The camera check, rendered under the briefing when one is required. */
  preCheck?: React.ReactNode
  /**
   * True while a required camera has not passed its check.
   *
   * The only condition in the system where a camera fault stops a learner —
   * and it stops them before they have invested anything (§3.5).
   */
  preCheckBlocks?: boolean
}) {
  /**
   * The monitored-assessment acknowledgement.
   *
   * Held here rather than in the parent because it is a property of *this
   * screen*: leaving the readiness view and coming back should ask again.
   * An acknowledgement that persists is one the learner stopped reading.
   */
  const [briefingAck, setBriefingAck] = useState(false)

  if (!readiness) return <AssessmentSkeleton />

  // Only a policy that is actually switched on produces a briefing, and only
  // a briefing can be acknowledged. Resuming an attempt already under way
  // does not re-ask.
  const needsAcknowledgement =
    !readiness.has_open_attempt &&
    !!readiness.proctoring &&
    readiness.proctoring.mode !== "OFF"

  const {
    title,
    description,
    question_count,
    total_points,
    passing_score,
    time_limit_minutes,
    attempts,
    can_start,
    cannot_start_reason,
    has_open_attempt,
    requires_manual_grading,
    history,
    best_percentage,
  } = readiness

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1 font-normal">
          <FileQuestion className="h-3 w-3" />
          {step.kind === "module_final" ? "Module final" : "Assessment"}
        </Badge>
        {requires_manual_grading && (
          <Badge variant="outline" className="border-warning/40 text-warning">
            Instructor graded
          </Badge>
        )}
      </div>

      <h1 className="text-xl font-semibold leading-snug text-foreground">{title}</h1>
      {/*
        Instructions are authored in the rich text editor now, so they arrive
        as HTML. Rendered as text they would show their own markup to the
        learner, on the screen where the rules are explained — the worst place
        to look broken.
      */}
      <RichText
        html={description}
        size="compact"
        className="mt-2 text-muted-foreground"
      />

      {/* Facts the learner needs before committing */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Questions" value={String(question_count)} />
        <StatTile label="Total points" value={String(total_points)} />
        <StatTile label="To pass" value={`${passing_score}%`} />
        <StatTile
          label="Time limit"
          value={time_limit_minutes ? `${time_limit_minutes} min` : "None"}
        />
      </div>

      {/* Attempts */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Attempts used:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {attempts.used}
          </span>
          {attempts.allowed !== null ? (
            <span className="tabular-nums"> of {attempts.allowed}</span>
          ) : (
            <span className="text-success"> · unlimited retakes</span>
          )}
        </span>
        {best_percentage !== null && (
          <span className="text-sm text-muted-foreground">
            Best score:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {Math.round(best_percentage)}%
            </span>
          </span>
        )}
      </div>

      {/*
        The monitored-assessment briefing.

        Shown only when a proctoring policy is actually in force, and only
        while there is still an attempt to start. Nobody should discover the
        terms of an assessment by breaking one of them, so the rules listed
        are derived from the resolved policy rather than written by hand —
        the screen cannot claim a restriction that is not switched on, and
        cannot omit one that is.
      */}
      {!readiness.has_passed && can_start && (
        <SecureAssessmentBriefing
          policy={readiness.proctoring ?? null}
          acknowledged={briefingAck}
          onAcknowledgedChange={setBriefingAck}
          className="mt-5"
        />
      )}

      {/* The camera check sits under the briefing: the learner reads what is
          recorded, then sees what the camera actually sees. */}
      {!readiness.has_passed && can_start && preCheck ? (
        <div className="mt-4">{preCheck}</div>
      ) : null}

      {/*
        Instructions — preserved verbatim from the original screen, and shown
        only while there is still something to begin. Telling a learner who
        has passed that they need 70% to pass, and that copy-paste will be
        disabled, describes an assessment they are never taking again.
      */}
      {!readiness.has_passed && (
      <Card className="mt-5 border-warning/30 bg-warning/5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-warning">
            <Info className="h-4 w-4" />
            Before you begin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-foreground/80">
            {time_limit_minutes && (
              <>
                <li>• The timer starts as soon as you begin and cannot be paused.</li>
                <li>• The assessment submits automatically when time runs out.</li>
              </>
            )}
            <li>• Your answers save automatically as you go.</li>
            <li>• You can move freely between questions before submitting.</li>
            <li>
              • You need {passing_score}% to pass and unlock the next step.
            </li>
            {requires_manual_grading && (
              <li>• Some questions are graded by your instructor, so your score won't appear immediately.</li>
            )}

            {/*
              Monitoring is stated up front, never covert (LS-SEC-002 §21.3).
              Telling learners is both the ethical position and — for a control
              whose value is deterrence — the effective one.
            */}
            {readiness.proctoring && readiness.proctoring.mode !== "OFF" ? (
              <>
                <li>
                  • Stay on this page while the assessment is open. Moving away is
                  recorded.
                </li>
                {readiness.proctoring.require_fullscreen && (
                  <li>• This assessment runs in full screen.</li>
                )}
                {readiness.proctoring.block_copy_paste && (
                  <li>• Copying and pasting are disabled during the assessment.</li>
                )}
                {readiness.proctoring.auto_submit_at !== null && (
                  <li>
                    • After {readiness.proctoring.auto_submit_at} reminders, your
                    assessment will be submitted automatically with the answers you
                    have saved.
                  </li>
                )}
              </>
            ) : null}
          </ul>
        </CardContent>
      </Card>
      )}

      {/* Passed — a result, not a refusal. */}
      {readiness.has_passed && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-foreground/80">
            You've passed this{best_percentage !== null ? ` with ${Math.round(best_percentage)}%` : ""}.
            Your result is recorded — there's nothing left to do here.
          </p>
        </div>
      )}

      {/* Locked / limit reached */}
      {!readiness.has_passed && !can_start && cannot_start_reason && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{cannot_start_reason}</p>
        </div>
      )}

      {/*
        Actions.

        A passed activity offers one thing: moving on. "Start a retake" and
        "Resume attempt" were not merely noise here — pressing either calls
        `prepareRetake`, which sets the progress row back to `pending` and
        `is_completed = false`, so the most prominent control on the screen
        was the one that revoked the learner's pass and re-locked the step
        behind it.
      */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {readiness.has_passed ? (
          <Button size="lg" onClick={onContinue} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            {/*
              The acknowledgement gates starting, but only where there is
              something to acknowledge: an unproctored assessment shows no
              briefing, so requiring a tick nobody was offered would be an
              unopenable door. Resuming is not gated either — the learner
              agreed to these terms when the attempt began.
            */}
            <Button
              size="lg"
              onClick={onStart}
              disabled={
                !can_start ||
                starting ||
                (needsAcknowledgement && !briefingAck) ||
                preCheckBlocks === true
              }
              className="gap-2"
            >
              {starting && <Loader2 className="h-4 w-4 animate-spin" />}
              {has_open_attempt
                ? "Resume attempt"
                : attempts.used > 0
                  ? "Start a retake"
                  : "Start assessment"}
            </Button>
            {!can_start && (
              <Button size="lg" variant="outline" onClick={onContinue}>
                Back to lessons
              </Button>
            )}
          </>
        )}
      </div>

      {/* History */}
      {history.length > 0 && <AttemptHistoryTable history={history} />}
    </div>
  )
}

/**
 * Print suppression for the assessment surface (LS-SEC-002 §5.1 D5).
 *
 * Deterrence, and labelled as such: it stops Ctrl+P capturing a question set,
 * and does nothing against a screenshot. Injected only while a monitored
 * assessment is open, so printing a lesson, a certificate or a notes page is
 * untouched.
 *
 * The replacement notice matters. A blank page reads as a bug; a page that
 * says why it is blank reads as a rule, and a learner who prints by habit
 * learns something instead of filing a support ticket.
 */
const ASSESSMENT_PRINT_CSS = `
@media print {
  [data-assessment-surface] { display: none !important; }
  [data-assessment-surface]::after { content: none !important; }

  body::after {
    content: "This assessment cannot be printed while it is in progress.";
    display: block;
    padding: 4rem 2rem;
    text-align: center;
    font-family: system-ui, sans-serif;
    font-size: 14pt;
  }
}
`

// ============================================================================
// INTEGRITY WARNING (LS-SEC-002 §12.1)
// ============================================================================

/**
 * The second warning, which blocks until acknowledged.
 *
 * A learner must never lose an attempt without having been warned and having
 * confirmed they read it (AC A-17), so this is deliberately modal where the
 * first warning is a banner. It carries no dismiss affordance other than the
 * acknowledgement — closing it by accident would defeat its purpose.
 */
/**
 * The blocking warning, for both levels that block.
 *
 * `FINAL_WARN` and `PERSISTENT` are the same *interaction* — a modal the
 * learner must acknowledge before continuing — and differ only in what they
 * say. Building a second component for the second level would have duplicated
 * the focus trap, the escape handling and the acknowledgement wiring so that
 * two copies could drift apart; the level selects the copy instead.
 *
 * Every word comes from the server's verdict message. The client never
 * composes a threat of its own, which is how AC B5 stays true: a dialog can
 * only warn about submission when the resolved policy will actually submit,
 * because only the server knows and only the server writes the sentence.
 */
function IntegrityWarningDialog({
  open,
  verdict,
  onAcknowledge,
}: {
  open: boolean
  verdict: {
    level?: string
    message: string | null
    remaining_before_submit: number | null
  } | null
  onAcknowledge: () => void
}) {
  const persistent = verdict?.level === "PERSISTENT"

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onAcknowledge() }}>
      <DialogContent size="md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-warning">
            <AlertTriangle className="h-5 w-5" />
            {persistent ? "This is being recorded" : "Please stay on this page"}
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground/80">
            {verdict?.message ??
              "Leaving the assessment isn't allowed while it's in progress."}
          </DialogDescription>
        </DialogHeader>

        {/*
          Said once, plainly, and only where it is true: under a policy that
          never auto-submits, the learner's work is not at risk. Leaving that
          unsaid invites them to assume the opposite and rush the paper.
        */}
        {persistent && verdict?.remaining_before_submit === null ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Your attempt is still open and your answers are saved. Nothing here
            ends it — but your instructor will see how often this happened.
          </p>
        ) : null}

        <DialogFooter>
          <Button onClick={onAcknowledge} autoFocus>
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// IN PROGRESS
// ============================================================================

function InProgressView({
  session,
  answers,
  questionIndex,
  setQuestionIndex,
  onAnswer,
  flagged,
  onToggleFlag,
  saveState,
  secondsLeft,
  onRequestSubmit,
  integrity,
}: {
  integrity: ReturnType<typeof useAssessmentIntegrity>
  session: AttemptSession
  answers: Record<string, any>
  questionIndex: number
  setQuestionIndex: (index: number) => void
  onAnswer: (questionId: string, value: any) => void
  flagged: Set<string>
  onToggleFlag: (questionId: string) => void
  saveState: "idle" | "saving" | "saved" | "error"
  secondsLeft: number | null
  onRequestSubmit: () => void
}) {
  const questions = session.questions
  const question = questions[questionIndex]
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length

  const timeTone =
    secondsLeft === null
      ? "text-muted-foreground"
      : session.time_limit_minutes && secondsLeft < session.time_limit_minutes * 60 * 0.05
        ? "text-destructive"
        : session.time_limit_minutes && secondsLeft < session.time_limit_minutes * 60 * 0.2
          ? "text-warning"
          : "text-muted-foreground"

  if (!question) return <AssessmentSkeleton />

  const policy = session.proctoring
  const monitored = policy && policy.mode !== "OFF"

  // §21.5 — `require_fullscreen` degrades to MONITOR where the browser cannot
  // do it (iOS Safari has no Element.requestFullscreen). A learner is never
  // blocked from an assessment by a capability their device lacks (AC A-20),
  // so where it is unsupported this renders nothing at all rather than an
  // apology the learner can do nothing about (§21.2: "degrade silently").
  //
  // `dismissed` is what makes F-5 pass. A browser can support full screen and
  // still refuse the request — a denied permission, or activation that
  // expired — and without a way out the prompt would sit there permanently,
  // offering a button that cannot work. Dismissing clears it.
  //
  // It resets on every successful entry, so pressing Escape later brings the
  // prompt back (F-3). Dismissing means "not now", not "never ask again".
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false)

  useEffect(() => {
    if (integrity.fullscreenActive) setFullscreenDismissed(false)
  }, [integrity.fullscreenActive])

  const fullscreenGate =
    monitored &&
    policy.require_fullscreen &&
    integrity.fullscreenSupported &&
    !integrity.fullscreenActive &&
    !fullscreenDismissed

  return (
    <div
      data-assessment-surface
      className={cn(
        "mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 sm:py-8",
        // Deterrence only (§5.1 D1/D2). Selection is disabled on the question
        // surface alone — never on notes, and never on lesson material, where
        // it would break legitimate study.
        monitored && policy.block_copy_paste && "select-none"
      )}
      onContextMenu={
        monitored && policy.block_context_menu
          ? (event) => event.preventDefault()
          : undefined
      }
    >
      {monitored && policy.block_print ? (
        <style dangerouslySetInnerHTML={{ __html: ASSESSMENT_PRINT_CSS }} />
      ) : null}

      {/* Soft warning. Non-blocking: the learner keeps working. */}
      {integrity.verdict &&
      integrity.verdict.level === "WARN" &&
      integrity.verdict.message ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-warning">{integrity.verdict.message}</p>
        </div>
      ) : null}

      {/*
        Full-screen prompt. Sits above the questions rather than replacing
        them, so the learner keeps their bearings and can keep working.

        This was an inline copy of `FullscreenPrompt` until now — two
        implementations of one control, and the copy that was actually mounted
        was the one missing the way out.
      */}
      {fullscreenGate ? (
        <FullscreenPrompt
          supported={integrity.fullscreenSupported}
          onEnter={() => void integrity.enterFullscreen()}
          onDismiss={() => setFullscreenDismissed(true)}
        />
      ) : null}

      {/*
        Position within the paper.

        Progress, answered count, autosave state and the countdown used to sit
        here too. They now live in the session header, which is always visible
        and never scrolls away; repeating them here would be two clocks on one
        wall — and two chances to disagree. What is left is the one fact the
        header does not carry: which question you are on.
      */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <span className="text-sm font-medium tabular-nums text-foreground">
          Question {questionIndex + 1}
          <span className="text-muted-foreground"> of {questions.length}</span>
        </span>
      </div>

      {/* Question rail */}
      <nav aria-label="Question navigation" className="mb-5">
        <ul className="flex flex-wrap gap-1.5">
          {questions.map((q, index) => {
            const answered = isAnswered(answers[q.id])
            const isCurrent = index === questionIndex
            const isFlagged = flagged.has(q.id)

            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setQuestionIndex(index)}
                  aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}${isFlagged ? ", flagged" : ""}`}
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "relative h-8 w-8 rounded-md border text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : answered
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {index + 1}
                  {isFlagged && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Question */}
      <Card className="shadow-none">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <RichText
              html={question.question}
              className="min-w-0 flex-1 text-[15px] font-medium leading-7 text-foreground"
            />
            <Badge variant="secondary" className="shrink-0 tabular-nums font-normal">
              {question.points} {question.points === 1 ? "pt" : "pts"}
            </Badge>
          </div>

          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt=""
              className="mb-4 max-h-64 rounded-lg border border-border object-contain"
            />
          )}

          <QuestionInput
            question={question}
            value={answers[question.id]}
            onChange={(value) => onAnswer(question.id, value)}
          />

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFlag(question.id)}
              className={cn("gap-1.5", flagged.has(question.id) && "text-warning")}
              aria-pressed={flagged.has(question.id)}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {flagged.has(question.id) ? "Flagged for review" : "Flag for review"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-5 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={questionIndex === 0}
          onClick={() => setQuestionIndex(questionIndex - 1)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Previous
        </Button>

        <div className="flex-1" />

        {questionIndex < questions.length - 1 ? (
          <Button size="sm" onClick={() => setQuestionIndex(questionIndex + 1)} className="gap-1.5">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={onRequestSubmit} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Review &amp; submit
          </Button>
        )}
      </div>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SanitizedQuestion
  value: any
  onChange: (value: any) => void
}) {
  const type = question.type.toUpperCase()

  if (type === "TRUE_FALSE") {
    return (
      <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2">
        {["True", "False"].map((option) => (
          <OptionRow key={option} id={`${question.id}-${option}`} selected={value === option}>
            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
            <Label htmlFor={`${question.id}-${option}`} className="flex-1 cursor-pointer text-sm font-normal">
              {option}
            </Label>
          </OptionRow>
        ))}
      </RadioGroup>
    )
  }

  if (type === "MULTIPLE_CHOICE" && question.options) {
    // A question whose key is a list expects multiple selections; the server
    // grades set-equality either way, so a checkbox group is the safe default
    // only when the UI knows it is multi-select. Single-select stays a radio.
    const isMulti = Array.isArray(value)

    if (isMulti) {
      const selected: string[] = value ?? []
      return (
        <div className="space-y-2">
          {question.options.map((option) => {
            const checked = selected.includes(option)
            return (
              <OptionRow key={option} id={`${question.id}-${option}`} selected={checked}>
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange(
                      next
                        ? [...selected, option]
                        : selected.filter((o) => o !== option)
                    )
                  }
                />
                <Label
                  htmlFor={`${question.id}-${option}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {option}
                </Label>
              </OptionRow>
            )
          })}
        </div>
      )
    }

    return (
      <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2">
        {question.options.map((option) => (
          <OptionRow key={option} id={`${question.id}-${option}`} selected={value === option}>
            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
            <Label
              htmlFor={`${question.id}-${option}`}
              className="flex-1 cursor-pointer text-sm font-normal"
            >
              {option}
            </Label>
          </OptionRow>
        ))}
      </RadioGroup>
    )
  }

  if (type === "ESSAY") {
    /*
     * An essay answer is written in the same editor the question was written
     * in. A marker reading a long answer against a rubric needs the learner's
     * headings, lists and emphasis; a textarea throws all of that away and
     * hands over one undifferentiated block.
     *
     * The stored value is HTML from here on. Everything that reads it has to
     * cope with both — see `isAnswered` and `formatAnswer` below, and
     * `RichText`, which keeps the line breaks of an answer submitted before
     * this change.
     */
    return (
      <RichTextEditor
        value={value ?? ""}
        onChange={onChange}
        placeholder="Write your answer…"
        className="border-input"
      />
    )
  }

  return (
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your answer"
      className="text-sm"
      aria-label={richTextToPlain(question.question)}
    />
  )
}

function OptionRow({
  children,
  selected,
}: {
  children: React.ReactNode
  id: string
  selected: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// CONFIRM
// ============================================================================

function SubmitConfirmDialog({
  open,
  onOpenChange,
  session,
  answers,
  onConfirm,
  onReviewUnanswered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AttemptSession
  answers: Record<string, any>
  onConfirm: () => void
  onReviewUnanswered: (index: number) => void
}) {
  const unanswered = useMemo(
    () =>
      session.questions
        .map((q, index) => ({ q, index }))
        .filter(({ q }) => !isAnswered(answers[q.id])),
    [session.questions, answers]
  )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>Once submitted, you can't change your answers for this attempt.</p>

              {unanswered.length > 0 ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-left">
                  <p className="font-medium text-warning">
                    {unanswered.length}{" "}
                    {unanswered.length === 1 ? "question is" : "questions are"} unanswered
                  </p>
                  <p className="mt-1 text-xs text-warning/90">
                    Question{unanswered.length === 1 ? " " : "s "}
                    {unanswered.map(({ index }) => index + 1).join(", ")} — unanswered
                    questions score zero.
                  </p>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  All {session.questions.length} questions answered.
                </p>
              )}

              <p className="font-medium">
                You need {session.passing_score}% to pass.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>Keep working</AlertDialogCancel>
          {unanswered.length > 0 && (
            <Button
              variant="outline"
              onClick={() => onReviewUnanswered(unanswered[0].index)}
            >
              Review unanswered
            </Button>
          )}
          <AlertDialogAction onClick={onConfirm}>Submit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================================
// RESULT
// ============================================================================

/**
 * What the learner is shown about their own monitoring.
 *
 * Rendered only when something was actually recorded — an assessment nobody
 * left should not carry a security panel, which would read as an accusation
 * where there is none and would train learners to expect one.
 *
 * Counts, never the timeline. A learner may know that events were recorded
 * against their attempt and how many; a replay of each signal would double
 * as a map of exactly what is detected and how long a gap goes unnoticed.
 */
function IntegritySummary({
  integrity,
}: {
  integrity: NonNullable<AttemptResult["integrity"]>
}) {
  const { recorded_events, repeated_warnings, auto_submitted } = integrity
  if (!auto_submitted && recorded_events === 0) return null

  return (
    <div
      className={cn(
        "mt-5 rounded-lg border px-4 py-3.5",
        auto_submitted
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            auto_submitted ? "text-destructive" : "text-muted-foreground"
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {auto_submitted
              ? "This attempt was submitted automatically"
              : "Activity recorded during this attempt"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {auto_submitted ? (
              <>
                You left the assessment {recorded_events} time
                {recorded_events === 1 ? "" : "s"}, which reached the limit for
                this assessment. The answers you had saved were submitted and
                graded — nothing was discarded.
              </>
            ) : (
              <>
                You left this assessment {recorded_events} time
                {recorded_events === 1 ? "" : "s"}. Your instructor can see this
                alongside your result.
                {repeated_warnings > 0
                  ? " You were reminded while the assessment was open."
                  : ""}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function ResultView({
  result,
  readiness,
  onRetake,
  onContinue,
  onReviewLesson,
}: {
  result: AttemptResult
  readiness: AssessmentReadiness | null
  onRetake: () => void
  onContinue: () => void
  onReviewLesson?: () => void
  onReviewHistory: () => void
}) {
  const pending = result.requires_manual_grading && !result.score_released
  const passed = result.passed === true
  const failed = result.score_released && result.passed === false

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Banner */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border px-4 py-4",
          pending
            ? "border-warning/40 bg-warning/10"
            : passed
              ? "border-success/40 bg-success/10"
              : "border-destructive/40 bg-destructive/10"
        )}
      >
        {pending ? (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        ) : passed ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        )}

        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-semibold",
              pending ? "text-warning" : passed ? "text-success" : "text-destructive"
            )}
          >
            {pending
              ? "Submitted — awaiting instructor grading"
              : passed
                ? "Passed"
                : "Not passed yet"}
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            {pending
              ? "Your instructor will grade this. You'll be notified as soon as your score is available."
              : passed
                ? "You've unlocked the next step."
                : `You scored ${Math.round(result.percentage ?? 0)}%, below the required ${result.passing_score}%. Review your answers below, then retake.`}
          </p>
          {result.is_late && (
            <p className="mt-1 text-xs text-muted-foreground">
              This attempt was submitted after the deadline and has been flagged for your instructor.
            </p>
          )}
        </div>
      </div>

      {/* What was recorded during the attempt (G-3). Renders nothing when
          there is nothing to report. */}
      {result.integrity ? <IntegritySummary integrity={result.integrity} /> : null}

      {/* Scores */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Your score"
          value={result.score_released ? `${Math.round(result.percentage ?? 0)}%` : "—"}
          tone={pending ? "muted" : passed ? "success" : "destructive"}
        />
        <StatTile
          label="Points"
          value={
            result.score_released
              ? `${result.score ?? 0}/${result.total_points ?? 0}`
              : "—"
          }
        />
        <StatTile label="To pass" value={`${result.passing_score}%`} />
        <StatTile label="Attempt" value={`#${result.attempt_number}`} />
      </div>

      {/* Guidance after a failure — what to do, not just what happened */}
      {failed && (
        <Card className="mt-5 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">What to do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            <p>1. See which questions you missed below.</p>
            <p>2. Revisit the lesson material — it stays unlocked.</p>
            <p>
              3. Retake when you're ready
              {readiness?.attempts.allowed === null
                ? " — there's no attempt limit."
                : ` — you have ${Math.max(
                    0,
                    (readiness?.attempts.allowed ?? 0) - (readiness?.attempts.used ?? 0)
                  )} attempt(s) left.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Per-question review */}
      {result.score_released && result.answers.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Your answers</h2>
          <div className="space-y-3">
            {result.answers.map((answer, index) => (
              <AnswerReviewCard
                key={answer.id ?? index}
                answer={answer}
                index={index}
                showCorrect={result.show_correct_answers}
              />
            ))}
          </div>
          {!result.show_correct_answers && (
            <p className="mt-3 text-xs text-muted-foreground">
              {failed
                ? "Correct answers stay hidden until you pass. You can see which questions you missed above — revisit the lesson and retake."
                : "Correct answers aren't shown for this assessment."}
            </p>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {passed && (
          <Button size="lg" onClick={onContinue} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {failed && (
          <Button size="lg" onClick={onRetake} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake assessment
          </Button>
        )}
        {pending && (
          <Button size="lg" variant="outline" onClick={onContinue}>
            Back to lessons
          </Button>
        )}
        {failed && onReviewLesson && (
          <Button size="lg" variant="outline" onClick={onReviewLesson}>
            Review the lesson
          </Button>
        )}
      </div>

      {readiness?.history && readiness.history.length > 0 && (
        <AttemptHistoryTable history={readiness.history} />
      )}
    </div>
  )
}

function AnswerReviewCard({
  answer,
  index,
  showCorrect,
}: {
  answer: AttemptResult["answers"][number]
  index: number
  showCorrect: boolean
}) {
  const ungraded = answer.is_graded === false
  const correct = answer.is_correct === true

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
              ungraded
                ? "bg-warning/15 text-warning"
                : correct
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
            )}
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-6 text-foreground">
              {answer.question?.question ?? "Question"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  ungraded ? "text-warning" : correct ? "text-success" : "text-destructive"
                )}
              >
                {ungraded ? (
                  <>
                    <Clock className="h-3.5 w-3.5" /> Awaiting grading
                  </>
                ) : correct ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Incorrect
                  </>
                )}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {answer.points_earned ?? 0} / {answer.points_possible} points
              </span>
            </div>

            <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Your answer
              </p>
              <AnswerBody value={answer.user_answer} className="mt-0.5 text-foreground" />
            </div>

            {showCorrect && !correct && answer.question?.correct_answer !== undefined && (
              <div className="mt-2 rounded-md border border-success/30 bg-success/10 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-success">
                  Correct answer
                </p>
                <AnswerBody
                  value={answer.question.correct_answer}
                  className="mt-0.5 text-success"
                />
              </div>
            )}

            {showCorrect && answer.question?.explanation && (
              <p className="mt-2 text-sm text-muted-foreground">
                {answer.question.explanation}
              </p>
            )}

            {answer.feedback && (
              <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                  Instructor feedback
                </p>
                <p className="mt-0.5 text-sm text-foreground">{answer.feedback}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AttemptHistoryTable({
  history,
}: {
  history: AssessmentReadiness["history"]
}) {
  if (history.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Attempt history</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((attempt) => (
              <TableRow key={attempt.attempt_id}>
                <TableCell className="tabular-nums">{attempt.attempt_number}</TableCell>
                <TableCell className="text-muted-foreground">
                  {attempt.submitted_at
                    ? new Date(attempt.submitted_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "In progress"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {attempt.percentage !== null ? `${Math.round(attempt.percentage)}%` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {attempt.time_taken_seconds
                    ? formatDuration(attempt.time_taken_seconds)
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {attempt.status === "SUBMITTED" ? (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      Grading
                    </Badge>
                  ) : attempt.passed === true ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/20">
                      Passed
                    </Badge>
                  ) : attempt.passed === false ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      Not passed
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

// ============================================================================
// SMALL PIECES
// ============================================================================

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "success" | "destructive" | "muted"
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <div
        className={cn(
          "text-xl font-bold tabular-nums",
          tone === "success"
            ? "text-success"
            : tone === "destructive"
              ? "text-destructive"
              : tone === "muted"
                ? "text-muted-foreground"
                : "text-foreground"
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function isAnswered(value: any): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0

  /*
   * An empty rich text editor is not an empty string.
   *
   * Quill emits "<p><br></p>" for a field the learner has clicked into and
   * left blank, which is eleven characters of nothing. Counted as an answer it
   * inflates "answered 5 of 5", empties the unanswered list on the review
   * step, and lets someone submit a blank paper believing they had filled it
   * in.
   */
  return !isRichTextEmpty(String(value))
}



function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

/**
 * An answer, as its author formatted it.
 *
 * An essay is written in the rich text editor, so it arrives as markup and has
 * to be rendered rather than printed — a learner reviewing their own
 * submission should see the answer they wrote, not its source. Choices are a
 * list of strings and stay plain. `RichText` keeps the line breaks of an
 * answer submitted before the field became an editor.
 */
function AnswerBody({ value, className }: { value: any; className?: string }) {
  if (Array.isArray(value) || value === null || value === undefined || value === "") {
    return (
      <p className={cn("break-words text-sm", className)}>{formatAnswer(value)}</p>
    )
  }

  if (typeof value !== "string") {
    return (
      <p className={cn("break-words text-sm", className)}>{formatAnswer(value)}</p>
    )
  }

  return <RichText html={value} size="compact" className={className} />
}

/** For anywhere the answer has to be one line of text: a row, a summary. */
function formatAnswer(value: any): string {
  if (value === null || value === undefined || value === "") return "Not answered"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  // An essay answer is markup now, and "<p>Because…</p>" is not an answer.
  const plain = richTextToPlain(String(value))
  return plain.length > 0 ? plain : "Not answered"
}
