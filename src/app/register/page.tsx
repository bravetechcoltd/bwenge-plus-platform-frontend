"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { registerBwenge, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Eye, EyeOff, Loader2, ArrowRight, User, CheckCircle, Home,
  Check, ChevronRight, GraduationCap, Clock,
} from "lucide-react"
import Link from "next/link"
import { GoogleOAuthProviderWrapper } from "@/components/auth/google-login"
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
const strengthColor = ["#ef4444", "#f59e0b", "#eab308", "#22c55e"]

const STEPS = [
  { id: 1, label: "Personal", icon: User },
  { id: 2, label: "Account", icon: Eye },
  { id: 3, label: "Background", icon: GraduationCap },
]

const EDUCATION_LEVELS = [
  "High School / Secondary", "Diploma / Certificate", "Bachelor's Degree",
  "Master's Degree", "PhD / Doctorate", "Other",
]
const GENDERS = ["Male", "Female", "Prefer not to say", "Other"]

const processSteps = [
  { num: "01", title: "Apply", desc: "Fill in your personal and academic details" },
  { num: "02", title: "Review", desc: "Admin team reviews within 24–48 hours" },
  { num: "03", title: "Approve", desc: "You receive an email once a decision is made" },
  { num: "04", title: "Access", desc: "Log in and start learning immediately" },
]

/* ── Simple Input with placeholder ── */
interface InputProps {
  id: string; name: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; required?: boolean; disabled?: boolean; rightEl?: React.ReactNode
}
function Input({ id, name, type = "text", value, onChange, placeholder, required, disabled, rightEl }: InputProps) {
  return (
    <div className="relative">
      <input
        id={id} name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        className={`w-full ${rightEl ? "pr-9" : "pr-3"} pl-3 py-2 text-sm
          bg-white/80 dark:bg-white/5 border border-border rounded-lg outline-none
          transition-colors duration-150 focus:border-primary
          text-foreground placeholder:text-muted-foreground/60
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {rightEl && <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10">{rightEl}</div>}
    </div>
  )
}

/* ── Select with placeholder ── */
interface SelectFieldProps {
  id: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  placeholder: string; required?: boolean; disabled?: boolean; options: string[]
}
function SelectInput({ id, name, value, onChange, placeholder, required, disabled, options }: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        id={id} name={name} value={value} onChange={onChange}
        required={required} disabled={disabled}
        className={`w-full pl-3 pr-3 py-2 text-sm bg-white/80 dark:bg-white/5
          border border-border rounded-lg outline-none appearance-none
          transition-colors focus:border-primary disabled:opacity-50
          ${value ? "text-foreground" : "text-muted-foreground/60"}`}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

/* ── Date input ── */
function DateInput({ id, name, value, onChange, placeholder, disabled }: {
  id: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; disabled?: boolean
}) {
  return (
    <input
      id={id} name={name} type="date" value={value} onChange={onChange}
      disabled={disabled} placeholder={placeholder}
      className="w-full pl-3 pr-3 py-2 text-sm bg-white/80 dark:bg-white/5
        border border-border rounded-lg outline-none transition-colors
        focus:border-primary text-foreground disabled:opacity-50
        placeholder:text-muted-foreground/60"
    />
  )
}

/* ══ Main ══ */
export default function RegisterPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error, applicationSubmitted, applicationEmail } = useSelector(
    (state: RootState) => state.bwengeAuth
  )

  const [step, setStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone_number: "", country: "",
    date_of_birth: "", gender: "",
    password: "", confirm_password: "",
    education_level: "", motivation: "", linkedin_url: "",
  })

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const pw = form.password
  const strength = getStrength(pw)
  const pwMatch = form.confirm_password && form.password === form.confirm_password

  const step1Valid = !!(form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.phone_number.trim() && form.country.trim())
  const step2Valid = form.password.length >= 8 && !!pwMatch
  const step3Valid = !!(form.education_level && form.motivation.trim().length >= 20)

  const canNext = () => step === 1 ? step1Valid : step === 2 ? step2Valid : true
  const handleNext = () => { if (step < 3) setStep((s) => s + 1) }
  const handleBack = () => { if (step > 1) setStep((s) => s - 1) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error("Please agree to the Terms of Service"); return }
    if (!step3Valid) { toast.error("Please fill all required fields"); return }
    try {
      await dispatch(registerBwenge({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        email: form.email.trim(), password: form.password, confirm_password: form.confirm_password,
        phone_number: form.phone_number || undefined, country: form.country || undefined,
        date_of_birth: form.date_of_birth || undefined, gender: form.gender || undefined,
        education_level: form.education_level || undefined, motivation: form.motivation,
        linkedin_url: form.linkedin_url || undefined,
      })).unwrap()
      toast.success("Application submitted! Check your email for confirmation.")
    } catch (_) {}
  }

  /* ── Success screen ── */
  if (applicationSubmitted) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
          className="bg-background rounded-xl border border-border/50 p-7 max-w-md w-full"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Application Submitted</h2>
          <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
            Our admin team will review your application within <strong className="text-foreground">24–48 hours</strong>.
          </p>
          <div className="bg-muted border border-border/50 rounded-lg p-3 mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-0.5">Confirmation sent to</p>
            <p className="text-sm font-mono text-foreground">{applicationEmail}</p>
          </div>
          <div className="space-y-2 mb-5">
            {[
              { icon: Clock, text: "You'll receive an email once a decision is made" },
              { icon: CheckCircle, text: "If approved, log in and start learning" },
            ].map(({ icon: I, text }, i) => (
              <div key={i} className="flex items-center gap-2">
                <I className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <GoogleOAuthProviderWrapper>
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══ LEFT — Form column ══ */}
        <div className="w-full lg:w-[58%] h-full flex flex-col bg-background border-r border-border/40">

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

            {/* Step indicators */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done = step > s.id; const active = step === s.id
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex items-center gap-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-200 ${
                        done ? "bg-emerald-500" : active ? "bg-primary" : "bg-border"}`}>
                        {done
                          ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          : <span className={`text-[9px] font-black ${active ? "text-white" : "text-muted-foreground"}`}>{s.id}</span>}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors hidden sm:block ${
                        active ? "text-foreground" : done ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-5 h-px mx-1.5 transition-colors duration-300 ${step > s.id ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>

          {/* Form centered */}
          <div className="flex-1 flex items-center justify-center px-8 py-3 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-[420px] space-y-2.5"
            >
              {/* Heading */}
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Apply · Step {step} of {STEPS.length}
                </p>
                <h1 className="text-[20px] font-bold text-foreground leading-none tracking-tight">
                  {step === 1 ? "Personal details." : step === 2 ? "Set your password." : "Your background."}
                </h1>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                  >
                    <p className="text-[11px] text-destructive">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress bar */}
              <div className="w-full h-px bg-border overflow-hidden rounded-full">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>

              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">

                  {/* STEP 1 */}
                  {step === 1 && (
                    <motion.div key="s1"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name *" required disabled={isLoading} />
                        <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name *" required disabled={isLoading} />
                      </div>
                      <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address *" required disabled={isLoading} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input id="phone_number" name="phone_number" type="tel" value={form.phone_number} onChange={handleChange} placeholder="Phone number *" required disabled={isLoading} />
                        <Input id="country" name="country" value={form.country} onChange={handleChange} placeholder="Country *" required disabled={isLoading} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DateInput id="date_of_birth" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} placeholder="Date of birth" disabled={isLoading} />
                        <SelectInput id="gender" name="gender" value={form.gender} onChange={handleChange} placeholder="Gender" disabled={isLoading} options={GENDERS} />
                      </div>
                      <button type="button" onClick={handleNext} disabled={!canNext()}
                        className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                          hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-2">
                        Next: Account Setup <ChevronRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 2 */}
                  {step === 2 && (
                    <motion.div key="s2"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2"
                    >
                      <Input
                        id="password" name="password" type={showPw ? "text" : "password"}
                        value={form.password} onChange={handleChange}
                        placeholder="Password (min 8 characters) *"
                        required disabled={isLoading}
                        rightEl={
                          <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        }
                      />

                      <AnimatePresence>
                        {pw && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="space-y-1"
                          >
                            <div className="flex gap-1">
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
                                  style={{ backgroundColor: i < strength ? strengthColor[strength - 1] : "var(--border)" }} />
                              ))}
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest"
                              style={{ color: strength > 0 ? strengthColor[strength - 1] : "var(--muted-foreground)" }}>
                              {strength > 0 ? ["Weak", "Fair", "Good", "Strong"][strength - 1] : "Too weak"}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative">
                        <input
                          id="confirm_password" name="confirm_password"
                          type={showConfirm ? "text" : "password"}
                          value={form.confirm_password} onChange={handleChange}
                          placeholder="Confirm password *"
                          required disabled={isLoading}
                          className={`w-full pr-9 pl-3 py-2 text-sm
                            bg-white/80 dark:bg-white/5 rounded-lg outline-none
                            transition-colors text-foreground disabled:opacity-50
                            placeholder:text-muted-foreground/60
                            border ${form.confirm_password && !pwMatch
                              ? "border-red-300 dark:border-red-800 focus:border-red-400"
                              : "border-border focus:border-primary"}`}
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <AnimatePresence>
                        {form.confirm_password && !pwMatch && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-[10px] text-red-500">Passwords do not match</motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-2">
                        <button type="button" onClick={handleBack}
                          className="flex-1 border border-border text-muted-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-muted/40 transition-colors">
                          Back
                        </button>
                        <button type="button" onClick={handleNext} disabled={!canNext()}
                          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                            hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-2">
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3 */}
                  {step === 3 && (
                    <motion.div key="s3"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2"
                    >
                      <SelectInput
                        id="education_level" name="education_level"
                        value={form.education_level} onChange={handleChange}
                        placeholder="Education level *"
                        required disabled={isLoading} options={EDUCATION_LEVELS}
                      />

                      <Input id="linkedin_url" name="linkedin_url" type="url"
                        value={form.linkedin_url} onChange={handleChange}
                        placeholder="LinkedIn profile URL (optional)"
                        disabled={isLoading}
                      />

                      {/* Motivation */}
                      <div>
                        <textarea
                          id="motivation" name="motivation" value={form.motivation} onChange={handleChange}
                          required rows={3} disabled={isLoading}
                          placeholder="Your motivation for joining BwengePlus *"
                          className="w-full pl-3 pr-3 pt-2.5 pb-2 text-sm
                            bg-white/80 dark:bg-white/5 border border-border rounded-lg outline-none resize-none
                            focus:border-primary transition-colors text-foreground disabled:opacity-50
                            placeholder:text-muted-foreground/60"
                        />
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Min. 20 characters</span>
                          <span className={`text-[9px] font-bold tabular-nums ${form.motivation.length >= 20 ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {form.motivation.length}
                          </span>
                        </div>
                      </div>

                      {/* Terms */}
                      <label className="flex items-start gap-2 cursor-pointer group/terms select-none">
                        <button type="button" role="checkbox" aria-checked={agreed}
                          onClick={() => !isLoading && setAgreed(!agreed)} disabled={isLoading}
                          className={`mt-0.5 w-3.5 h-3.5 rounded-sm border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                            agreed ? "bg-primary border-primary" : "bg-background border-border group-hover/terms:border-muted-foreground"}`}>
                          {agreed && (
                            <svg className="w-2 h-2 text-primary-foreground" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className="text-[11px] text-muted-foreground leading-snug">
                          I agree to the{" "}
                          <Link href="/terms" className="text-foreground font-semibold hover:underline underline-offset-2">Terms of Service</Link>
                          {" "}and{" "}
                          <Link href="/privacy" className="text-foreground font-semibold hover:underline underline-offset-2">Privacy Policy</Link>
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <button type="button" onClick={handleBack}
                          className="flex-1 border border-border text-muted-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-muted/40 transition-colors">
                          Back
                        </button>
                        <button type="submit" onClick={handleSubmit} disabled={isLoading || !step3Valid || !agreed}
                          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                            hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                            flex items-center justify-center gap-2">
                          {isLoading
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Submitting…</span></>
                            : <><span>Submit Application</span><ArrowRight className="w-3.5 h-3.5" /></>}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Sign in link */}
              <p className="text-center text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
                Already approved?{" "}
                <Link href="/login" className="text-foreground font-semibold hover:underline underline-offset-2">Sign in →</Link>
              </p>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
            <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
              Admin approval required · BwengePlus
            </p>
          </div>
        </div>

        {/* ══ RIGHT — Primary color editorial panel ══ */}
        <div className="hidden lg:flex w-full lg:w-[42%] h-full bg-primary flex-col">

          {/* Top label */}
          <div className="flex items-center justify-between px-10 h-11 border-b border-white/10 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">How it works</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Application process</span>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center px-10 py-5">

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.42, ease: "easeOut" }}
              className="mb-6"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-2">Join BwengePlus</p>
              <h2 className="text-[30px] font-bold text-white leading-[1.05] tracking-tight">By invitation.</h2>
              <p className="text-white/70 text-[13px] mt-1.5 leading-relaxed">
                Each application is reviewed to maintain the quality of our learning community.
              </p>
            </motion.div>

            {/* Numbered process steps */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.42 }}
              className="space-y-0"
            >
              {processSteps.map((s) => (
                <div key={s.num} className="flex items-start gap-4 py-3 border-b border-white/10 group">
                  <span className="text-[28px] font-black leading-none text-white/20 flex-shrink-0 w-9 text-right group-hover:text-white/40 transition-colors duration-200 font-mono tabular-nums">
                    {s.num}
                  </span>
                  <div className="pt-0.5 space-y-0.5">
                    <p className="text-[13px] font-bold text-white group-hover:text-white transition-colors duration-200">{s.title}</p>
                    <p className="text-[11px] text-white/60 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom strip */}
          <div className="px-10 py-4 border-t border-white/10 flex-shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">Review time</p>
            <p className="text-[13px] font-semibold text-white">24–48 hours from submission</p>
          </div>
        </div>

      </div>
    </GoogleOAuthProviderWrapper>
  )
}