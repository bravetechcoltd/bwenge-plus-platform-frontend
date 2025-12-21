// @ts-nocheck

"use client"

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { clearError, clearVerificationState } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { toast } from "sonner"

function FloatingParticles() {
  const particles = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 1, duration: Math.random() * 10 + 14, delay: Math.random() * 5,
  })), [])
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

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const { error } = useSelector((state: RootState) => state.bwengeAuth)

  const emailParam = searchParams.get("email") || ""
  const redirectParam = searchParams.get("redirect") || ""
  // Decode the redirect target; fall back to /login
  const redirectTarget = redirectParam ? decodeURIComponent(redirectParam) : "/login"
  // Detect if this came from a join/invite flow
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
    const next = [...otp]
    next[index] = value
    setOtp(next)
    setLocalError("")
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    // Auto-submit when all filled
    if (value && index === 5 && next.every(Boolean)) {
      handleVerify(next.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (text.length === 6) {
      const digits = text.split("")
      setOtp(digits)
      otpRefs.current[5]?.focus()
      handleVerify(text)
    }
  }

  const handleVerify = async (code?: string) => {
    const otpString = code || otp.join("")
    if (otpString.length !== 6) { setLocalError("Please enter all 6 digits"); return }
    setIsVerifying(true)
    setLocalError("")
    try {
      const res = await api.post("/auth/verify-email", { email: emailParam, otp: otpString })
      if (res.data.success) {
        // Clear requiresVerification from Redux FIRST so login page won't bounce back
        dispatch(clearVerificationState())
        dispatch(clearError())
        setVerified(true)
        toast.success(
          isJoinFlow
            ? "Email verified! Continuing to join your institution…"
            : "Email verified! Welcome to BwengePlus 🎉"
        )
        setTimeout(() => router.push(redirectTarget), 2200)
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Invalid or expired code. Please try again.")
      setOtp(["", "", "", "", "", ""])
      otpRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !emailParam) return
    setIsResending(true)
    try {
      await api.post("/auth/resend-verification", { email: emailParam })
      toast.success("New verification code sent!")
      setCooldown(60)
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code")
    } finally {
      setIsResending(false)
    }
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <FloatingParticles />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-9 h-9 text-green-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-sm text-gray-500 mb-1">Your account is now active.</p>
          <p className="text-xs text-gray-400">
            {isJoinFlow ? "Returning to join your institution…" : "Redirecting to sign in…"}
          </p>
          <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5 }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute right-[-15%] top-[5%] w-[60%] h-[70%] rounded-full bg-white/5" />
      <div className="absolute left-[-10%] bottom-[-10%] w-[50%] h-[50%] rounded-full bg-white/5" />
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[380px] relative z-10"
      >
        <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

          {/* Header */}
          <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
            <div className="w-12 h-12 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center mb-2">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="text-[11px] text-gray-400 mt-0.5 text-center">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-primary">{emailParam || "your email"}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* Error */}
            <AnimatePresence>
              {localError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{localError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP inputs */}
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3 text-center">
                Verification Code
              </p>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl transition-all outline-none ${
                      digit
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 bg-gray-50 text-gray-800 focus:border-primary focus:bg-white"
                    }`}
                    whileFocus={{ scale: 1.05 }}
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>

            {/* Verify button */}
            <motion.button
              onClick={() => handleVerify()}
              disabled={isVerifying || otp.some((d) => !d)}
              whileHover={{ scale: isVerifying || otp.some((d) => !d) ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isVerifying ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Verifying…</span></>
              ) : (
                <><CheckCircle className="w-3.5 h-3.5" /><span>Verify Email</span></>
              )}
            </motion.button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1.5">Didn't receive the code?</p>
              <button
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
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

            {/* Back link */}
            <Link
              href={isJoinFlow ? redirectTarget : "/register"}
              className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1"
            >
              <ArrowLeft className="w-3 h-3" />
              {isJoinFlow ? "Back to invitation" : "Back to registration"}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="bg-white rounded-xl p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
      </div>
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