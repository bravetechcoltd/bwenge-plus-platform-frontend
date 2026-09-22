// @ts-nocheck
"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { changePasswordWithOTP, requestPasswordChange, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle,
  ArrowLeft, ArrowRight, Home, RefreshCw, ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

/* ── Password strength ── */
function getStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  return s
}
const sColor = ["#ef4444", "#f59e0b", "#eab308", "#22c55e"]
const sLabel = ["Weak", "Fair", "Good", "Strong"]

/* ── Right panel tips ── */
const tips = [
  { title: "At least 8 characters", desc: "Keep it long for better security" },
  { title: "Mix letters & numbers", desc: "Add uppercase, lowercase, digits" },
  { title: "Use a special character", desc: "!, @, #, $ make passwords stronger" },
]

/* ── Simple Input ── */
function Input({
  id, name, type = "text", value, onChange, placeholder, required, disabled, rightEl, className = "",
}: {
  id?: string; name?: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; required?: boolean; disabled?: boolean
  rightEl?: React.ReactNode; className?: string
}) {
  return (
    <div className="relative">
      <input
        id={id} name={name} type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        required={required} disabled={disabled}
        className={`w-full ${rightEl ? "pr-9" : "pr-3.5"} pl-3.5 py-2.5
          text-sm bg-white/80 dark:bg-white/5
          border border-border rounded-lg outline-none
          transition-colors duration-150 focus:border-primary
          text-foreground placeholder:text-muted-foreground/60
          disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{rightEl}</div>}
    </div>
  )
}

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

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.bwengeAuth)

  const emailParam = searchParams.get("email") || ""
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState("")
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [cooldown])

  const strength = getStrength(newPassword)
  const pwMatch = confirmPassword && newPassword === confirmPassword
  const otpFilled = otp.every(Boolean)
  const canSubmit = otpFilled && newPassword.length >= 8 && pwMatch

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...otp]; next[i] = v; setOtp(next)
    setLocalError("")
    if (v && i < 5) otpRefs.current[i + 1]?.focus()
  }
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (text.length === 6) { setOtp(text.split("")); otpRefs.current[5]?.focus() }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLocalError("")
    try {
      await dispatch(changePasswordWithOTP({ email: emailParam, otp: otp.join(""), new_password: newPassword })).unwrap()
      setSuccess(true)
      toast.success("Password changed successfully!")
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: any) {
      setLocalError(err || "Invalid code or something went wrong.")
      setOtp(["", "", "", "", "", ""])
      otpRefs.current[0]?.focus()
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !emailParam) return
    setIsResending(true)
    try {
      await dispatch(requestPasswordChange(emailParam)).unwrap()
      toast.success("New code sent!")
      setCooldown(60)
    } catch { toast.error("Failed to resend code") }
    finally { setIsResending(false) }
  }

  /* ── Success screen ── */
  if (success) {
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
                  transition={{ type: "spring", delay: 0.15 }}
                  className="w-12 h-12 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </motion.div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Success</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Password changed!</h1>
                <p className="text-[11px] text-muted-foreground">Your password has been updated. Redirecting…</p>
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
          <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">All done.</h2>
          <p className="text-[13px] text-white/70 mt-3">Redirecting you to sign in…</p>
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
          <Link href="/forgot-password" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-3 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[300px] space-y-3"
          >
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Reset Password</p>
              <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Enter new password.</h1>
              <p className="text-[11px] text-muted-foreground">
                Code sent to <span className="font-semibold text-foreground">{emailParam || "your email"}</span>
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {(localError || error) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                >
                  <p className="text-[11px] text-destructive leading-snug">{localError || error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-2.5">

{/* OTP - Compact & Smart */}
<div>
  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-1.5">Verification Code</p>
  <div className="flex gap-1.5 justify-center" onPaste={handlePaste}>
    {otp.map((digit, i) => (
      <input
        key={i}
        ref={(el) => (otpRefs.current[i] = el)}
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={(e) => handleOtpChange(i, e.target.value)}
        onKeyDown={(e) => handleOtpKeyDown(i, e)}
        disabled={isLoading}
        className={`w-11 h-11 rounded-lg text-center text-sm font-semibold border rounded-lg transition-all outline-none ${
          digit 
            ? "border-primary bg-primary/5 text-primary" 
            : "border-border bg-white/80 dark:bg-white/5 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
        }`}
      />
    ))}
  </div>
  <div className="flex justify-end mt-1">
    <button
      type="button"
      onClick={handleResend}
      disabled={isResending || cooldown > 0}
      className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1 transition-colors"
    >
      {isResending ? (
        <><Loader2 className="w-2.5 h-2.5 animate-spin" /><span>Sending…</span></>
      ) : cooldown > 0 ? (
        `Resend in ${cooldown}s`
      ) : (
        <><RefreshCw className="w-2.5 h-2.5" /><span>Resend code</span></>
      )}
    </button>
  </div>
</div>

              {/* New password */}
              <Input
                id="newPassword" name="newPassword"
                type={showPw ? "text" : "password"}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                required disabled={isLoading}
                rightEl={
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              {/* Strength */}
              <AnimatePresence>
                {newPassword && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i < strength ? sColor[strength - 1] : "var(--border)" }} />
                      ))}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: strength > 0 ? sColor[strength - 1] : "var(--muted-foreground)" }}>
                      {strength > 0 ? sLabel[strength - 1] : "Too weak"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirm password */}
              <Input
                id="confirmPassword" name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required disabled={isLoading}
                className={confirmPassword && !pwMatch ? "border-red-300 dark:border-red-800 focus:border-red-400" : ""}
                rightEl={
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              <AnimatePresence>
                {confirmPassword && !pwMatch && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-red-500">Passwords do not match</motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit" disabled={isLoading || !canSubmit}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                  hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting…</span></>
                  : <><ShieldCheck className="w-4 h-4" /><span>Reset Password</span></>}
              </button>
            </form>

            <p className="text-center text-[11px] text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="text-foreground font-semibold hover:underline underline-offset-2 transition-colors">
                Sign in →
              </Link>
            </p>
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
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Password Reset</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-12 py-6 gap-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">Almost there</p>
            <div className="space-y-0.5">
              <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Choose.</h2>
              <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">Strong.</h2>
              <h2 className="text-[38px] font-bold text-white/40 leading-[1.0] tracking-tight">Secure.</h2>
            </div>
            <p className="text-[13px] text-white/70 mt-3 leading-relaxed max-w-xs">
              Choose a strong password that you haven't used before to keep your account safe.
            </p>
          </motion.div>

          <div className="w-10 h-px bg-white/20" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-1">Password tips</p>
            <div className="space-y-0">
              {tips.map((t, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-white/10 group">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-bold text-white">{t.title}</p>
                    <p className="text-[11px] text-white/60 leading-snug">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="px-12 py-2 border-t border-white/10 flex-shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0">Security</p>
          <p className="text-[13px] font-semibold text-white">OTP expires after 15 minutes</p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}