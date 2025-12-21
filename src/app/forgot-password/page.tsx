"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { requestPasswordChange, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Mail,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Sparkles,
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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.bwengeAuth)

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    try {
      await dispatch(requestPasswordChange(email.toLowerCase().trim())).unwrap()
      setSent(true)
      toast.success("Verification code sent! Check your email.")
    } catch (err: any) {
      // shown via redux state
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute right-[-15%] top-[5%] w-[60%] h-[70%] rounded-full bg-white/5" />
        <FloatingParticles />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[360px] relative z-10"
        >
          <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">
            <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-12 h-12 rounded-full bg-green-100 border-4 border-white shadow-lg flex items-center justify-center mb-2"
              >
                <Mail className="w-6 h-6 text-green-500" />
              </motion.div>
              <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
              <p className="text-[11px] text-gray-400 mt-0.5 text-center">
                We sent a code to <span className="font-semibold text-primary">{email}</span>
              </p>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 text-center leading-relaxed">
                  Enter the 6-digit code along with your new password on the next page.
                </p>
              </div>
              <motion.button
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Enter Reset Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
              <button
                onClick={() => setSent(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3 h-3" /> Use a different email
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-primary">
      {/* ═══════════ LEFT — Form ═══════════ */}
      <div className="w-full lg:w-[46%] flex items-center justify-center p-4 sm:p-5 lg:p-6 relative z-20">
        <Link
          href="/login"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-xs font-medium transition-all hover:scale-105 group z-30 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Login</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-[360px]"
        >
          <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

            {/* Header */}
            <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
              <div className="w-12 h-12 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Forgot Password?</h1>
              <p className="text-[11px] text-gray-400 mt-0.5 text-center max-w-[220px]">
                Enter your email and we'll send a verification code to reset your password.
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-3">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                    <Mail className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as any)}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>

              {/* Submit */}
              <motion.button
                onClick={handleSubmit}
                disabled={isLoading || !email.trim()}
                whileHover={{ scale: isLoading || !email.trim() ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group shadow-sm"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                {isLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending code…</span></>
                ) : (
                  <><span className="tracking-wide">Send Reset Code</span><ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </motion.button>

              {/* Links */}
              <div className="flex items-center justify-between pt-1">
                <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Back to Sign In
                </Link>
                <Link href="/register" className="text-xs text-primary font-semibold hover:underline">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════ RIGHT — Branding ═══════════ */}
      <div className="hidden lg:flex w-full lg:w-[54%] relative overflow-hidden flex-col items-center justify-center bg-primary">
        <FloatingParticles />
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute right-[-15%] top-[5%] w-[65%] h-[75%] rounded-full bg-white/5" />
        <div className="absolute left-[-10%] bottom-[-10%] w-[55%] h-[55%] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center px-10 py-8 gap-5 max-w-md">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Account Recovery</span>
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight text-center">
            Regain Access<br />
            <span className="text-blue-200">Securely &amp; Quickly</span>
          </h2>
          <p className="text-white/70 text-sm text-center leading-relaxed max-w-xs">
            We'll send a one-time code to your registered email. Use it to set a new password.
          </p>

          <div className="w-full space-y-3 mt-2">
            {[
              { step: "1", title: "Enter your email", desc: "We'll look up your account" },
              { step: "2", title: "Get your code", desc: "Check your inbox for a 6-digit OTP" },
              { step: "3", title: "Set new password", desc: "Choose a strong, new password" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3 bg-white/10 rounded-xl p-3.5">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                  {step}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}