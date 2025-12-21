"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { registerBwenge, clearError } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight,
  User, Phone, Globe, CheckCircle, Sparkles, BookOpen, Home,
  Check, ChevronRight, Calendar, Users, GraduationCap, Linkedin,
  FileText, ClipboardList, Clock,
} from "lucide-react"
import Link from "next/link"
import { GoogleOAuthProviderWrapper } from "@/components/auth/google-login"
import { toast } from "sonner"

/* ── Password strength ──────────────────────────────────────── */
function getStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  return s
}
const strengthColor = ["#ef4444", "#f59e0b", "#eab308", "#22c55e"]
const strengthLabel = ["Weak", "Fair", "Good", "Strong"]

/* ── Steps config ───────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Account Setup", icon: Lock },
  { id: 3, label: "Background", icon: GraduationCap },
]

const EDUCATION_LEVELS = [
  "High School / Secondary",
  "Diploma / Certificate",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Other",
]

const GENDERS = ["Male", "Female", "Prefer not to say", "Other"]

/* ── Floating particles ─────────────────────────────────────── */
function FloatingParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 10 + 14, delay: Math.random() * 6,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-10, -55], opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

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

  // After successful submission, show success screen
  useEffect(() => {
    if (applicationSubmitted && applicationEmail) {
      // already handled by rendering below
    }
  }, [applicationSubmitted, applicationEmail])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const pw = form.password
  const strength = getStrength(pw)
  const pwMatch = form.confirm_password && form.password === form.confirm_password

  // Step validation
  const step1Valid = form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.phone_number.trim() && form.country.trim()
  const step2Valid = form.password.length >= 8 && pwMatch
  const step3Valid = form.education_level && form.motivation.trim().length >= 20

  const canNext = () => {
    if (step === 1) return !!step1Valid
    if (step === 2) return !!step2Valid
    return true
  }

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error("Please agree to the Terms of Service"); return }
    if (!step3Valid) { toast.error("Please fill all required fields"); return }

    try {
      await dispatch(registerBwenge({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        phone_number: form.phone_number || undefined,
        country: form.country || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        education_level: form.education_level || undefined,
        motivation: form.motivation,
        linkedin_url: form.linkedin_url || undefined,
      })).unwrap()

      toast.success("Application submitted! Check your email for confirmation.")
    } catch (err: any) {
      // error shown via Redux state
    }
  }

  // ── Application submitted success screen ─────────────────────
  if (applicationSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Your application to join BwengePlus has been received. Our admin team will review it within <strong>24–48 hours</strong>.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 text-sm font-semibold">Confirmation sent to:</span>
            </div>
            <p className="text-blue-800 text-sm font-mono">{applicationEmail}</p>
          </div>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>You will receive an email once a decision is made</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>If approved, you can log in and start learning</span>
            </div>
          </div>
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <GoogleOAuthProviderWrapper>
      <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-primary">

        {/* ═══ LEFT — Form ═══ */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-5 lg:p-6 relative z-20">
          <Link href="/"
            className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-xs font-medium transition-all hover:scale-105 group z-30 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-[480px]"
          >
            <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

              {/* Card Header */}
              <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
                <div className="w-12 h-12 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center mb-2">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                  Apply to <span className="text-primary">BwengePlus</span>
                </h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Learner account application — Admin approval required</p>
              </div>

              {/* Step indicators */}
              <div className="px-6 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon
                    const active = step === s.id
                    const done = step > s.id
                    return (
                      <React.Fragment key={s.id}>
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs font-bold ${
                            done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                          }`}>
                            {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-[9px] font-medium ${active ? "text-primary" : done ? "text-green-500" : "text-gray-400"}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`flex-1 h-px mx-1 mb-3 transition-colors ${step > s.id ? "bg-green-400" : "bg-gray-200"}`} />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              {/* Card Body */}
              <div className="px-5 pb-5 space-y-3">

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">

                    {/* ── STEP 1: Personal Info ── */}
                    {step === 1 && (
                      <motion.div key="step1"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                        className="space-y-2.5"
                      >
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personal Information</p>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-2">
                          {(["first_name", "last_name"] as const).map((field, i) => (
                            <div key={field} className="relative group">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                                  <User className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                                </div>
                              </div>
                              <input type="text" name={field} value={form[field]} onChange={handleChange}
                                placeholder={i === 0 ? "First name *" : "Last name *"} required disabled={isLoading}
                                className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Email */}
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                              <Mail className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>
                          <input type="email" name="email" value={form.email} onChange={handleChange}
                            placeholder="Email address *" required disabled={isLoading}
                            className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                          />
                        </div>

                        {/* Phone + Country */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                                <Phone className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                              </div>
                            </div>
                            <input type="tel" name="phone_number" value={form.phone_number} onChange={handleChange}
                              placeholder="Phone number *" required disabled={isLoading}
                              className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                            />
                          </div>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                                <Globe className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                              </div>
                            </div>
                            <input type="text" name="country" value={form.country} onChange={handleChange}
                              placeholder="Country *" required disabled={isLoading}
                              className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                            />
                          </div>
                        </div>

                        {/* Date of Birth + Gender */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                                <Calendar className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                              </div>
                            </div>
                            <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
                              disabled={isLoading}
                              className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none"
                            />
                          </div>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                                <Users className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                              </div>
                            </div>
                            <select name="gender" value={form.gender} onChange={handleChange}
                              disabled={isLoading}
                              className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none"
                            >
                              <option value="">Gender (optional)</option>
                              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>

                        <button type="button" onClick={handleNext} disabled={!canNext()}
                          className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                        >
                          <span>Next: Account Setup</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}

                    {/* ── STEP 2: Account Setup ── */}
                    {step === 2 && (
                      <motion.div key="step2"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                        className="space-y-2.5"
                      >
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Create Password</p>

                        {/* Password */}
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                              <Lock className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>
                          <input type={showPw ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                            placeholder="Password (min 8 chars) *" required disabled={isLoading}
                            className="w-full pl-11 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                          />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                          >
                            {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Strength bar */}
                        {pw && (
                          <div className="space-y-1 -mt-1.5">
                            <div className="flex gap-1">
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                                  style={{ backgroundColor: i < strength ? strengthColor[strength - 1] : "#e5e7eb" }}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] font-medium" style={{ color: strength > 0 ? strengthColor[strength - 1] : "#6b7280" }}>
                              {strength > 0 ? strengthLabel[strength - 1] : "Too weak"}
                            </p>
                          </div>
                        )}

                        {/* Confirm password */}
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              form.confirm_password ? (pwMatch ? "bg-green-50" : "bg-red-50") : "bg-gray-100 group-focus-within:bg-primary/10"
                            }`}>
                              {form.confirm_password ? (
                                pwMatch ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                              )}
                            </div>
                          </div>
                          <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange}
                            placeholder="Confirm password *" required disabled={isLoading}
                            className={`w-full pl-11 pr-9 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none ${
                              form.confirm_password && !pwMatch ? "border-red-300" : "border-gray-200"
                            }`}
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                          >
                            {showConfirm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={handleBack}
                            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                          >
                            Back
                          </button>
                          <button type="button" onClick={handleNext} disabled={!canNext()}
                            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── STEP 3: Background & Motivation ── */}
                    {step === 3 && (
                      <motion.div key="step3"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                        className="space-y-2.5"
                      >
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Background & Motivation</p>

                        {/* Education Level */}
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                              <GraduationCap className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>
                          <select name="education_level" value={form.education_level} onChange={handleChange}
                            required disabled={isLoading}
                            className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none"
                          >
                            <option value="">Select education level *</option>
                            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>

                        {/* LinkedIn */}
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                              <Linkedin className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>
                          <input type="url" name="linkedin_url" value={form.linkedin_url} onChange={handleChange}
                            placeholder="LinkedIn profile URL (optional)" disabled={isLoading}
                            className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none"
                          />
                        </div>

                        {/* Motivation */}
                        <div className="relative group">
                          <div className="absolute left-3 top-3 pointer-events-none">
                            <div className="w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                              <FileText className="w-3 h-3 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>
                          <textarea name="motivation" value={form.motivation} onChange={handleChange}
                            placeholder="Why do you want to join BwengePlus? (min 20 characters) *"
                            required rows={3} disabled={isLoading}
                            className="w-full pl-11 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 outline-none resize-none"
                          />
                          <div className="flex justify-end mt-0.5">
                            <span className={`text-[10px] ${form.motivation.length >= 20 ? "text-green-500" : "text-gray-400"}`}>
                              {form.motivation.length}/20 min
                            </span>
                          </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <div onClick={() => !isLoading && setAgreed(!agreed)}
                            className={`mt-0.5 w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              agreed ? "bg-primary border-primary" : "bg-white border-gray-300 group-hover:border-primary/50"
                            }`}
                          >
                            {agreed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-[11px] text-gray-500 leading-relaxed select-none">
                            I agree to the{" "}
                            <Link href="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>
                            {" "}and{" "}
                            <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>
                          </span>
                        </label>

                        <div className="flex gap-2">
                          <button type="button" onClick={handleBack}
                            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                          >
                            Back
                          </button>
                          <motion.button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isLoading || !step3Valid || !agreed}
                            whileHover={{ scale: isLoading || !step3Valid || !agreed ? 1 : 1.01 }}
                            whileTap={{ scale: isLoading ? 1 : 0.99 }}
                            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group shadow-sm"
                          >
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                            {isLoading ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Submitting…</span></>
                            ) : (
                              <><span>Submit Application</span><ArrowRight className="w-3.5 h-3.5" /></>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Sign in link */}
                <p className="text-center text-xs text-gray-500 pt-1">
                  Already have an approved account?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ═══ RIGHT — Branding ═══ */}
        <div className="hidden lg:flex w-full lg:w-[45%] relative overflow-hidden flex-col items-center justify-center bg-primary">
          <FloatingParticles />
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute right-[-15%] top-[5%] w-[65%] h-[75%] rounded-full bg-white/5" />
          <div className="absolute left-[-10%] bottom-[-10%] w-[55%] h-[55%] rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center px-10 py-8 gap-5 w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Exclusive Platform</span>
                <Sparkles className="w-3 h-3 text-yellow-300" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Join BwengePlus
                <span className="block text-blue-200 mt-0.5">By Invitation.</span>
              </h2>
              <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                Our admin team reviews each application to maintain the quality of our learning community.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="w-full bg-white/10 rounded-xl p-5 space-y-3"
            >
              {[
                { icon: ClipboardList, text: "Fill in your personal & academic details" },
                { icon: Clock, text: "Admin reviews your application (24–48 hrs)" },
                { icon: Mail, text: "Get notified by email when approved" },
                { icon: BookOpen, text: "Log in and start learning immediately" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-white/90 text-[13px]">{text}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex items-center justify-center gap-5 text-white/80 text-xs"
            >
              {[["10K+", "Learners"], ["100+", "Courses"], ["35+", "Institutions"]].map(([num, label]) => (
                <div key={label} className="text-center">
                  <div className="font-bold text-white text-base">{num}</div>
                  <div>{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

      </div>
    </GoogleOAuthProviderWrapper>
  )
}
