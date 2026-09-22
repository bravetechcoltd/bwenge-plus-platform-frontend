"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { requestPasswordChange, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import { Mail, Loader2, AlertCircle, ArrowLeft, ArrowRight, Home } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

/* ── Right panel content ── */
const steps = [
  { num: "01", title: "Enter your email", desc: "We'll look up your account" },
  { num: "02", title: "Get your code", desc: "Check your inbox for a 6-digit OTP" },
  { num: "03", title: "Set new password", desc: "Choose a strong, new password" },
]

/* ── Simple input ── */
function Input({
  id, name, type = "text", value, onChange, placeholder, required, disabled, leftEl,
}: {
  id: string; name: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; required?: boolean; disabled?: boolean; leftEl?: React.ReactNode
}) {
  return (
    <div className="relative">
      {leftEl && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">{leftEl}</div>
      )}
      <input
        id={id} name={name} type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        required={required} disabled={disabled}
        className={`w-full ${leftEl ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5
          text-sm bg-white/80 dark:bg-white/5
          border border-border rounded-lg outline-none
          transition-colors duration-150 focus:border-primary
          text-foreground placeholder:text-muted-foreground/60
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
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
    } catch (_) {}
  }

  /* ── Sent confirmation screen — same two-column layout ── */
  if (sent) {
    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT */}
        <div className="w-full lg:w-[45%] h-full flex flex-col bg-background border-r border-border/40">
          <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
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
            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 py-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-[300px] space-y-3"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-0.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Email Sent</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Check your inbox.</h1>
                <p className="text-[11px] text-muted-foreground">
                  We sent a code to <span className="font-semibold text-foreground">{email}</span>
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/15 rounded-lg px-3.5 py-3">
                <p className="text-[11px] text-primary text-center leading-relaxed">
                  Enter the 6-digit code along with your new password on the next page.
                </p>
              </div>

              <button
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                  hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <span>Enter Reset Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSent(false)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Use a different email
              </button>
            </motion.div>
          </div>

          <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
            <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
              © {new Date().getFullYear()} BwengePlus · Institution-grade learning
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary flex-col">
          <div className="flex items-center justify-between px-12 h-11 border-b border-white/10 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Account Recovery</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
          </div>
          <div className="flex-1 flex flex-col justify-center px-12 py-6 gap-7">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">What's next</p>
              <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Almost</h2>
              <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">there.</h2>
              <p className="text-[13px] text-white/70 mt-3 leading-relaxed max-w-xs">
                Use the code from your email together with your new password to regain access.
              </p>
            </motion.div>
            <div className="w-10 h-px bg-white/20" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22, duration: 0.45 }}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">Recovery steps</p>
              <div className="space-y-0">
                {steps.map((s) => (
                  <div key={s.num} className="flex items-start gap-4 py-3 border-b border-white/10 group">
                    <span className="text-[26px] font-black leading-none text-white/20 flex-shrink-0 w-9 text-right group-hover:text-white/40 transition-colors font-mono tabular-nums">{s.num}</span>
                    <div className="pt-0.5 space-y-0.5">
                      <p className="text-[13px] font-bold text-white">{s.title}</p>
                      <p className="text-[11px] text-white/60 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          <div className="px-12 py-4 border-t border-white/10 flex-shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">Secure process</p>
            <p className="text-[13px] font-semibold text-white">OTP expires in 15 minutes</p>
          </div>
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
          <Link href="/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Login
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
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Account Recovery</p>
              <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Forgot password?</h1>
              <p className="text-[11px] text-muted-foreground">Enter your email and we'll send a reset code.</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                >
                  <p className="text-[11px] text-destructive leading-snug">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-2">
              <Input
                id="email" name="email" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required disabled={isLoading}
                leftEl={<Mail className="w-3.5 h-3.5 text-muted-foreground" />}
              />

              <button
                type="submit" disabled={isLoading || !email.trim()}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                  hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending code…</span></>
                  : <><span>Send Reset Code</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-[11px] text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="text-foreground font-semibold hover:underline underline-offset-2 transition-colors">
                Sign in →
              </Link>
            </p>

            <p className="text-center text-[11px] text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline underline-offset-2 transition-colors">
                Apply to join →
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
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Account Recovery</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-12 py-6 gap-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">Secure reset</p>
            <div className="space-y-0.5">
              <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Regain.</h2>
              <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">Access.</h2>
              <h2 className="text-[38px] font-bold text-white/40 leading-[1.0] tracking-tight">Securely.</h2>
            </div>
            <p className="text-[13px] text-white/70 mt-3 leading-relaxed max-w-xs">
              We'll send a one-time code to your registered email. Use it to set a new password instantly.
            </p>
          </motion.div>

          <div className="w-10 h-px bg-white/20" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-1">How it works</p>
            <div className="space-y-0">
              {steps.map((s) => (
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

        <div className="px-12 py-1 border-t border-white/10 flex-shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 ">Code validity</p>
          <p className="text-[13px] font-semibold text-white">OTP expires after 15 minutes</p>
        </div>
      </div>
    </div>
  )
}