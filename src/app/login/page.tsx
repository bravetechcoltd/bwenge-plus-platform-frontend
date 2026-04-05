"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { loginBwenge, clearError, setInstitutionData } from '@/lib/features/auth/auth-slice'
import type { AppDispatch, RootState } from '@/lib/store'
import { Eye, EyeOff, Loader2, ArrowRight, Home } from 'lucide-react'
import Link from 'next/link'
import { getRoleDashboardPath } from "@/app/utils/roleNavigation"
import { GoogleOAuthProviderWrapper, GoogleLoginButton } from '@/components/auth/google-login'
import { toast } from 'sonner'
import { GoogleOneTapLogin } from '@/components/auth/GoogleOneTap'

/* ── Stats for right panel ── */
const stats = [
  ["500+", "Courses"],
  ["100+", "Institutions"],
  ["10K+", "Learners"],
]

const highlights = [
  { label: "MOOC", desc: "Open access courses for everyone" },
  { label: "SPOC", desc: "Private institutional learning" },
  { label: "Certified", desc: "Industry-recognized certificates" },
]

/* ── Simple input with placeholder ── */
interface InputProps {
  id: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  required?: boolean
  disabled?: boolean
  rightEl?: React.ReactNode
}

function Input({ id, name, type = 'text', value, onChange, placeholder, required, disabled, rightEl }: InputProps) {
  return (
    <div className="relative">
      <input
        id={id} name={name} type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        required={required} disabled={disabled}
        className={`w-full ${rightEl ? 'pr-9' : 'pr-3.5'} pl-3.5 py-2.5
          text-sm bg-white/80 dark:bg-white/5
          border border-border rounded-lg outline-none
          transition-colors duration-150
          focus:border-primary dark:focus:border-primary
          text-foreground placeholder:text-muted-foreground/60
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{rightEl}</div>
      )}
    </div>
  )
}

export default function BwengePlusLoginPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const {
    isLoading, error, isAuthenticated, user,
    requiresVerification, verificationEmail,
    errorCode, rejectionReason,
  } = useSelector((state: RootState) => state.bwengeAuth)

  const hasRedirected = React.useRef(false)
  const hasRedirectedToVerify = React.useRef(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      const dashboardPath = getRoleDashboardPath(user.bwenge_role)
      if (user.institution) {
        sessionStorage.setItem('current_institution', JSON.stringify(user.institution))
        if (!user.institution?._protected) {
          dispatch(setInstitutionData({
            ...user.institution,
            _protected: {
              system: 'BWENGEPLUS',
              last_updated: new Date().toISOString(),
              immutable_fields: ['id', 'name', 'type', 'slug', 'created_at'],
              version: 1,
            },
          }))
        }
        toast.success(`Welcome back to ${user.institution.name || 'BwengePlus'}!`, {
          description: 'Your institution data is protected',
        })
      }
      hasRedirected.current = true
      setTimeout(() => router.push(dashboardPath), 500)
    }
  }, [isAuthenticated, user, router, dispatch])

  useEffect(() => { return () => { dispatch(clearError()) } }, [dispatch])

  useEffect(() => {
    if (requiresVerification && verificationEmail && !hasRedirectedToVerify.current) {
      hasRedirectedToVerify.current = true
      toast.error("Please verify your email before signing in.")
      router.push(`/verify-email?email=${encodeURIComponent(verificationEmail)}`)
    }
  }, [requiresVerification, verificationEmail, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    hasRedirected.current = false
    try {
      const result = await dispatch(loginBwenge(formData)).unwrap()
      if (result.user) {
        if (result.user.institution || result.user.primary_institution_id) {
          toast.success('Institution data preserved successfully', {
            description: 'Your institution context is protected across systems',
          })
        }
        localStorage.setItem('bwenge_protection_active', 'true')
        localStorage.setItem('last_system_login', 'bwengeplus')
      }
    } catch (err: any) {
      if (err.includes?.('protection') || err.includes?.('institution')) {
        toast.error('Data Protection Alert', {
          description: 'Your institution data is being safeguarded. Please contact support if this persists.',
        })
      }
    }
  }

  return (
    <GoogleOAuthProviderWrapper>
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

{!isAuthenticated && (
  <GoogleOneTapLogin 
    autoSelect={false} 
    cancelOnTapOutside={false} 
    context="signin" 
    forceDisplay={true}  
  />
)}
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
            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>

          {/* Form — vertically centered */}
          <div className="flex-1 flex items-center justify-center px-8 py-3 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-[300px] space-y-3"
            >
              {/* Heading */}
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Sign in</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Welcome back.</h1>
                <p className="text-[11px] text-muted-foreground">Continue your learning journey.</p>
              </div>

              {/* Error states */}
              <AnimatePresence>
                {error && errorCode === 'PENDING_APPROVAL' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="border-l-[3px] border-amber-400 bg-amber-50 dark:bg-amber-950/20 pl-3 pr-3 py-2 rounded-r"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400 mb-0.5">Under Review</p>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 leading-snug">{error}</p>
                  </motion.div>
                )}
                {error && errorCode === 'APPLICATION_REJECTED' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="border-l-[3px] border-red-400 bg-red-50 dark:bg-red-950/20 pl-3 pr-3 py-2 rounded-r"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-400 mb-0.5">Not Approved</p>
                    <p className="text-[11px] text-red-500/80 dark:text-red-400/70 leading-snug">{error}</p>
                    {rejectionReason && <p className="text-[10px] text-red-400/60 mt-0.5 italic">Reason: {rejectionReason}</p>}
                  </motion.div>
                )}
                {error && !errorCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                  >
                    <p className="text-[11px] text-destructive leading-snug">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <Input
                  id="email" name="email" type="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="Email address"
                  required disabled={isLoading}
                />
                <Input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  placeholder="Password"
                  required disabled={isLoading}
                  rightEl={
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                />

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer group/rem select-none">
                    <button type="button" role="checkbox" aria-checked={rememberMe}
                      onClick={() => !isLoading && setRememberMe(!rememberMe)} disabled={isLoading}
                      className={`w-3.5 h-3.5 rounded-sm border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
                        rememberMe ? 'bg-primary border-primary' : 'bg-background border-border group-hover/rem:border-muted-foreground'
                      }`}>
                      {rememberMe && (
                        <svg className="w-2 h-2 text-primary-foreground" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span className="text-[11px] text-muted-foreground">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                    hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2">
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></>
                    : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.16em]">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google OAuth */}
              <GoogleLoginButton />

              {/* Register link */}
              <p className="text-center text-[11px] text-muted-foreground">
                No account?{' '}
                <Link href="/register" className="text-foreground font-semibold hover:underline underline-offset-2 transition-colors">
                  Apply to join BwengePlus →
                </Link>
              </p>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
            <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
              © {new Date().getFullYear()} BwengePlus · Institution-grade learning
            </p>
          </div>
        </div>

        {/* ══ RIGHT — Primary color editorial panel ══ */}
        <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary flex-col">

          {/* Top label row */}
          <div className="flex items-center justify-between px-12 h-11 border-b border-white/10 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">E-Learning Platform</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
          </div>

          {/* Editorial body — vertically centered */}
          <div className="flex-1 flex flex-col justify-center px-12 py-6 gap-7">

            {/* Display headline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">Ubwenge burarahurwa</p>
              <div className="space-y-0.5">
                <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Learn.</h2>
                <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">Grow.</h2>
                <h2 className="text-[38px] font-bold text-white/40 leading-[1.0] tracking-tight">Succeed.</h2>
              </div>
              <p className="text-[13px] text-white/70 mt-3 leading-relaxed max-w-xs">
                Access hundreds of courses across MOOC and SPOC formats from Rwanda's leading institutions.
              </p>
            </motion.div>

            {/* Rule */}
            <div className="w-10 h-px bg-white/20" />

            {/* Highlights list */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.45 }}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-3">Platform features</p>
              <div className="space-y-0">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start justify-between gap-6 py-3 border-b border-white/10 group">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">{h.label}</p>
                      <p className="text-[13px] text-white group-hover:text-white transition-colors duration-200">{h.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5 group-hover:text-white/60 transition-colors" />
                  </div>
                ))}
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </GoogleOAuthProviderWrapper>
  )
}