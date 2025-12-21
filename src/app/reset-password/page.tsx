// @ts-nocheck
"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { changePasswordWithOTP, requestPasswordChange, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

function FloatingParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 1, duration: Math.random() * 10 + 14, delay: Math.random() * 5,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-10, -50], opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

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
      await dispatch(changePasswordWithOTP({
        email: emailParam,
        otp: otp.join(""),
        new_password: newPassword,
      })).unwrap()
      setSuccess(true)
      toast.success("Password changed successfully!")
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: any) {
      setLocalError(err || "Invalid code or something went wrong. Please try again.")
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
    } catch {
      toast.error("Failed to resend code")
    } finally {
      setIsResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <FloatingParticles />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[340px] relative z-10"
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
            >
              <ShieldCheck className="w-9 h-9 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Changed!</h2>
            <p className="text-sm text-gray-500 mb-1">Your password has been updated successfully.</p>
            <p className="text-xs text-gray-400 mb-4">Redirecting to login…</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full"
                initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-primary">
      {/* ═══════════ LEFT — Form ═══════════ */}
      <div className="w-full lg:w-[50%] flex items-center justify-center p-4 sm:p-5 relative z-20">
        <Link
          href="/forgot-password"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-xs font-medium transition-all hover:scale-105 group z-30 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-[390px]"
        >
          <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

            {/* Header */}
            <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
              <div className="w-12 h-12 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Reset Password</h1>
              <p className="text-[11px] text-gray-400 mt-0.5 text-center">
                Code sent to <span className="font-semibold text-primary">{emailParam || "your email"}</span>
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3.5">

              {/* Error */}
              <AnimatePresence>
                {(localError || error) && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">{localError || error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OTP */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2.5 text-center">
                  Verification Code
                </p>
                <div className="flex justify-center gap-1.5" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-10 h-11 text-center text-xl font-bold border-2 rounded-xl transition-all outline-none ${
                        digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-gray-50 text-gray-800 focus:border-primary focus:bg-white"
                      }`}
                      whileFocus={{ scale: 1.05 }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
                {/* Resend */}
                <div className="text-center mt-2">
                  <button
                    onClick={handleResend}
                    disabled={isResending || cooldown > 0}
                    className="text-[11px] text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto transition-colors"
                  >
                    {isResending ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Sending…</>
                    ) : cooldown > 0 ? (
                      `Resend in ${cooldown}s`
                    ) : (
                      <><RefreshCw className="w-3 h-3" />Resend code</>
                    )}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                    <Lock className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div className="space-y-1 -mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i < strength ? sColor[strength - 1] : "#e5e7eb" }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: strength > 0 ? sColor[strength - 1] : "#6b7280" }}>
                    {strength > 0 ? sLabel[strength - 1] : "Too weak"}
                  </p>
                </div>
              )}

              {/* Confirm */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    confirmPassword ? (pwMatch ? "bg-green-50" : "bg-red-50") : "bg-gray-100 group-focus-within:bg-primary/10"
                  }`}>
                    {confirmPassword ? (
                      pwMatch ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    )}
                  </div>
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                  className={`w-full pl-12 pr-10 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none ${
                    confirmPassword && !pwMatch ? "border-red-300" : "border-gray-200"
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all">
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Submit */}
              <motion.button
                onClick={handleSubmit}
                disabled={isLoading || !canSubmit}
                whileHover={{ scale: isLoading || !canSubmit ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group shadow-sm"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                {isLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Resetting…</span></>
                ) : (
                  <><ShieldCheck className="w-3.5 h-3.5" /><span>Reset Password</span></>
                )}
              </motion.button>

              <p className="text-center text-xs text-gray-400">
                Remember your password?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════ RIGHT — Branding ═══════════ */}
      <div className="hidden lg:flex w-full lg:w-[50%] relative overflow-hidden flex-col items-center justify-center bg-primary">
        <FloatingParticles />
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute right-[-15%] top-[5%] w-[65%] h-[75%] rounded-full bg-white/5" />
        <div className="absolute left-[-10%] bottom-[-10%] w-[55%] h-[55%] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center px-10 py-8 gap-4 max-w-md text-center">
          <h2 className="text-3xl font-bold text-white">
            Almost there!<br />
            <span className="text-blue-200 text-2xl">Enter your new password.</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Choose a strong password that you haven't used before.
          </p>

          <div className="w-full mt-2 space-y-2">
            {[
              ["At least 8 characters", "Keep it long for better security"],
              ["Mix letters & numbers", "Add uppercase, lowercase, digits"],
              ["Use a special character", "!, @, #, $ make passwords stronger"],
            ].map(([title, sub]) => (
              <div key={title} className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-white/60 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="bg-white rounded-xl p-8"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
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