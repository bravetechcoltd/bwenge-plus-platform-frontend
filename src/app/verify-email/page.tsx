// @ts-nocheck
"use client"

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { clearError, clearVerificationState } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck, Home } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { toast } from "sonner"

/* ── Logo ── */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
        <svg viewBox="0 0 40 40" className="w-3.5 h-3.5" fill="none">
          <ellipse cx="20" cy="10" rx="12" ry="4" fill="white" />
          <polygon points="20,3 8,10 20,14 32,10" fill="white" />
          <rect x="10" y="14" width="9" height="16" rx="1.5" fill="white" />
          <rect x="21" y="14" width="9" height="16" rx="1.5" fill="white" />
        </svg>
      </div>
      <span className="text-sm font-bold text-foreground tracking-tight">BwengePlus</span>
    </div>
  )
}

/* ── Right panel info ── */
const verifySteps = [
  { num: "01", title: "Check your inbox", desc: "Look for an email from BwengePlus" },
  { num: "02", title: "Enter the code", desc: "Type all 6 digits in the boxes" },
  { num: "03", title: "Start learning", desc: "Your account activates immediately" },
]

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const { error } = useSelector((state: RootState) => state.bwengeAuth)

  const emailParam = searchParams.get("email") || ""
  const redirectParam = searchParams.get("redirect") || ""
  const redirectTarget = redirectParam ? decodeURIComponent(redirectParam) : "/login"
  const isJoinFlow = redirectTarget.includes("/join")

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const [localError, setLocalError] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [cooldown])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]; next[index] = value; setOtp(next)
    setLocalError("")
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    if (value && index === 5 && next.every(Boolean)) handleVerify(next.join(""))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (text.length === 6) {
      const digits = text.split(""); setOtp(digits)
      otpRefs.current[5]?.focus()
      handleVerify(text)
    }
  }

  const handleVerify = async (code?: string) => {
    const otpString = code || otp.join("")
    if (otpString.length !== 6) { setLocalError("Please enter all 6 digits"); return }
    setIsVerifying(true); setLocalError("")
    try {
      const res = await api.post("/auth/verify-email", { email: emailParam, otp: otpString })
      if (res.data.success) {
        dispatch(clearVerificationState()); dispatch(clearError())
        setVerified(true)
        toast.success(isJoinFlow ? "Email verified! Continuing to join your institution…" : "Email verified! Welcome to BwengePlus 🎉")
        setTimeout(() => router.push(redirectTarget), 2200)
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Invalid or expired code. Please try again.")
      setOtp(["", "", "", "", "", ""]); otpRefs.current[0]?.focus()
    } finally { setIsVerifying(false) }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !emailParam) return
    setIsResending(true)
    try {
      await api.post("/auth/resend-verification", { email: emailParam })
      toast.success("New verification code sent!"); setCooldown(60)
    } catch (err: any) { toast.error(err.response?.data?.message || "Failed to resend code") }
    finally { setIsResending(false) }
  }

  /* ── Verified success screen ── */
  if (verified) {
    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-[45%] h-full flex flex-col bg-background border-r border-border/40">
          <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
            <Logo />
            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center px-8 py-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[300px] space-y-4 text-center"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-12 h-12 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </motion.div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Verified</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Email verified!</h1>
                <p className="text-[11px] text-muted-foreground">
                  {isJoinFlow ? "Returning to join your institution…" : "Redirecting to sign in…"}
                </p>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5 }} />
              </div>
            </motion.div>
          </div>
          <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
            <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
              © {new Date().getFullYear()} BwengePlus · Institution-grade learning
            </p>
          </div>
        </div>
        <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary flex-col items-center justify-center px-12">
          <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Welcome</h2>
          <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">aboard.</h2>
          <p className="text-[13px] text-white/70 mt-3">Your account is now active.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ══ LEFT — Form column ══ */}
      <div className="w-full lg:w-[45%] h-full flex flex-col bg-background border-r border-border/40">

        {/* Top nav */}
        <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
          <Logo />
          <Link
            href={isJoinFlow ? redirectTarget : "/register"}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> {isJoinFlow ? "Back to invitation" : "Back to register"}
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[300px] space-y-3"
          >
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Email Verification</p>
              <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Verify your email.</h1>
              <p className="text-[11px] text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-foreground">{emailParam || "your email"}</span>
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {localError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                >
                  <p className="text-[11px] text-destructive leading-snug">{localError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP inputs */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-2">Verification Code</p>
              <div className="flex gap-1.5" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isVerifying}
                    className={`flex-1 h-10 text-center text-base font-bold border-2 rounded-lg transition-all outline-none ${
                      digit ? "border-primary bg-primary/5 text-primary" : "border-border bg-white/80 dark:bg-white/5 text-foreground focus:border-primary"
                    } disabled:opacity-50`}
                  />
                ))}
              </div>
            </div>

            {/* Verify button */}
            <button
              onClick={() => handleVerify()}
              disabled={isVerifying || otp.some((d) => !d)}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isVerifying
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying…</span></>
                : <><CheckCircle className="w-4 h-4" /><span>Verify Email</span></>}
            </button>

            {/* Resend */}
            <div className="text-center space-y-1">
              <p className="text-[11px] text-muted-foreground">Didn't receive the code?</p>
              <button
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
              >
                {isResending ? <><Loader2 className="w-3 h-3 animate-spin" />Sending…</>
                  : cooldown > 0 ? `Resend in ${cooldown}s`
                    : <><RefreshCw className="w-3 h-3" />Resend code</>}
              </button>
            </div>
          </motion.div>
        </div>

        <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
          <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
            © {new Date().getFullYear()} BwengePlus · Institution-grade learning
          </p>
        </div>
      </div>

      {/* ══ RIGHT — Primary editorial panel ══ */}
      <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary flex-col">
        <div className="flex items-center justify-between px-12 h-11 border-b border-white/10 flex-shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Email Verification</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-12 py-6 gap-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">One last step</p>
            <div className="space-y-0.5">
              <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Confirm.</h2>
              <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">Your.</h2>
              <h2 className="text-[38px] font-bold text-white/40 leading-[1.0] tracking-tight">Identity.</h2>
            </div>
            <p className="text-[13px] text-white/70 mt-3 leading-relaxed max-w-xs">
              Check your inbox for the 6-digit code. It only takes a moment.
            </p>
          </motion.div>

          <div className="w-10 h-px bg-white/20" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">How to verify</p>
            <div className="space-y-0">
              {verifySteps.map((s) => (
                <div key={s.num} className="flex items-start gap-4 py-3 border-b border-white/10 group">
                  <span className="text-[26px] font-black leading-none text-white/20 flex-shrink-0 w-9 text-right group-hover:text-white/40 transition-colors duration-200 font-mono tabular-nums">
                    {s.num}
                  </span>
                  <div className="pt-0.5 space-y-0.5">
                    <p className="text-[13px] font-bold text-white group-hover:text-white transition-colors duration-200">{s.title}</p>
                    <p className="text-[11px] text-white/60 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="px-12 py-4 border-t border-white/10 flex-shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">Code validity</p>
          <p className="text-[13px] font-semibold text-white">Expires after 15 minutes</p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailForm />
    </Suspense>
  )
}