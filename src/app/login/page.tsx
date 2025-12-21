"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { loginBwenge, clearError, setInstitutionData } from '@/lib/features/auth/auth-slice'
import type { AppDispatch, RootState } from '@/lib/store'
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2,
  ArrowRight, Sparkles, ShieldCheck, Smartphone, Globe, Home,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { getRoleDashboardPath } from "@/app/utils/roleNavigation"
import { GoogleOAuthProviderWrapper, GoogleLoginButton } from '@/components/auth/google-login'
import { toast } from 'sonner'
import { GoogleOneTapLogin } from '@/components/auth/GoogleOneTap'

/* ─────────────────────────── Floating Particles (right panel) ─────────────────────────── */
function FloatingParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 10 + 14,
    delay: Math.random() * 6,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-10, -55], opacity: [0, 0.8, 0.8, 0], scale: [1, 1.4, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────── Feature Carousel Data ─────────────────────────── */
const features = [
  {
    title: 'One-Tap Login',
    description: "Sign in instantly if you're already logged into Google",
    icon: Smartphone,
    color: 'bg-primary',
    protection: 'Fast, secure authentication',
  },
  {
    title: 'Protected Institution Data',
    description: 'Your institution affiliation, roles, and settings are safeguarded across systems.',
    icon: ShieldCheck,
    color: 'bg-primary',
    protection: 'Field-level protection prevents data loss',
  },
  {
    title: 'Global Access',
    description: 'Access your learning from anywhere, on any device',
    icon: Globe,
    color: 'bg-primary',
    protection: 'Cloud-synced progress',
  },
]

export default function BwengePlusLoginPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error, isAuthenticated, user, requiresVerification, verificationEmail, errorCode, rejectionReason } = useSelector(
    (state: RootState) => state.bwengeAuth
  )
  const hasRedirected = React.useRef(false)
  const hasRedirectedToVerify = React.useRef(false)

  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      const dashboardPath = getRoleDashboardPath(user.bwenge_role)
      if (user.institution) {
        sessionStorage.setItem('current_institution', JSON.stringify(user.institution))
        if (!user.institution?._protected) {
          dispatch(
            setInstitutionData({
              ...user.institution,
              _protected: {
                system: 'BWENGEPLUS',
                last_updated: new Date().toISOString(),
                immutable_fields: ['id', 'name', 'type', 'slug', 'created_at'],
                version: 1,
              },
            })
          )
        }
        toast.success(`Welcome back to ${user.institution.name || 'BwengePlus'}!`, {
          description: 'Your institution data is protected',
        })
      }
      hasRedirected.current = true
      setTimeout(() => router.push(dashboardPath), 500)
    }
  }, [isAuthenticated, user, router, dispatch])

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)

  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  /* Redirect to verify-email when login fails because account is unverified.
     The ref guard prevents re-firing after the user returns from verify-email. */
  useEffect(() => {
    if (requiresVerification && verificationEmail && !hasRedirectedToVerify.current) {
      hasRedirectedToVerify.current = true
      toast.error("Please verify your email before signing in.")
      router.push(`/verify-email?email=${encodeURIComponent(verificationEmail)}`)
    }
  }, [requiresVerification, verificationEmail, router])

  useEffect(() => {
    const t = setInterval(
      () => setCurrentFeature((p) => (p + 1) % features.length),
      8000
    )
    return () => clearInterval(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    hasRedirected.current = false
    try {
      const result = await dispatch(loginBwenge(formData)).unwrap()
      if (result.user) {
        const hasInstitutionData =
          result.user.institution || result.user.primary_institution_id
        if (hasInstitutionData) {
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
          description:
            'Your institution data is being safeguarded. Please contact support if this persists.',
        })
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
<GoogleOAuthProviderWrapper>
  {/* Full-screen split layout - COMPACT VERSION */}
  <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden relative bg-primary">
    {/* Show One Tap on login page only if not authenticated */}
    {!isAuthenticated && (
      <GoogleOneTapLogin
        autoSelect={false}
        cancelOnTapOutside={false}
        context="signin"
        forceDisplay={false} // Don't force on login page, let it show naturally
      />
    )}
    
    {/* Background overlay for better contrast */}
    <div className="absolute inset-0 bg-black/5 pointer-events-none" />

    {/* ══════════════════ LEFT PANEL – Login Form ══════════════════ */}
    <div className="w-full lg:w-[44%] flex items-center justify-center p-4 sm:p-5 lg:p-6 relative z-20">
      {/* Back to Home pill button – top-left */}
      <Link
        href="/"
        className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-xs font-medium transition-all hover:scale-105 group z-30 shadow-sm"
      >
        <Home className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-[380px]"
      >
        {/* Compact White Card */}
        <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

          {/* Card Header */}
          <div className="pt-5 pb-3 px-6 flex flex-col items-center border-b border-gray-100/80">
            <div className="w-12 h-12 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center mb-2">
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                <ellipse cx="20" cy="10" rx="12" ry="4" fill="white" />
                <polygon points="20,3 8,10 20,14 32,10" fill="white" />
                <rect x="10" y="14" width="9" height="16" rx="2" fill="white" />
                <rect x="21" y="14" width="9" height="16" rx="2" fill="white" />
                <rect x="28" y="10" width="2" height="7" rx="1" fill="#f59e0b" />
                <ellipse cx="29" cy="17" rx="2" ry="1.5" fill="#f59e0b" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              <span className="text-gray-900">Bwenge</span>
              <span className="text-primary">Plus</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">Sign in to continue learning</p>
          </div>

          {/* Card Body */}
          <div className="px-5 py-4 space-y-3">

            {/* Error display */}
            <AnimatePresence>
              {error && errorCode === 'PENDING_APPROVAL' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-800 font-semibold">Application Under Review</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
              {error && errorCode === 'APPLICATION_REJECTED' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-700 font-semibold">Application Not Approved</p>
                    <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{error}</p>
                    {rejectionReason && (
                      <p className="text-xs text-red-500 mt-1 italic">Reason: {rejectionReason}</p>
                    )}
                  </div>
                </motion.div>
              )}
              {error && !errorCode && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">{error}</p>
                    {error.includes('institution') && (
                      <p className="text-xs text-red-400 mt-0.5">
                        Your institution data is protected.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Input */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-7 h-7 rounded-lg bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                  <Mail className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-12 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium outline-none"
                placeholder="Email address"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-7 h-7 rounded-lg bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors">
                  <Lock className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-12 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium outline-none"
                placeholder="Password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <div
                  onClick={() => !isLoading && setRememberMe(!rememberMe)}
                  className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                    rememberMe
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300 group-hover:border-primary/50'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
                      <path
                        d="M1.5 5L4 7.5L8.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-500 select-none">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.99 }}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group shadow-sm"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>

            {/* OR divider */}
            <div className="relative flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google Login */}
            <GoogleLoginButton />

            {/* Sign Up Link - NEW SECTION */}
            <div className="mt-4 pt-2 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="text-primary font-semibold hover:text-primary/80 transition-colors inline-flex items-center gap-1 group/register"
                >
                  Apply to join BwengePlus
                  <ArrowRight className="w-3 h-3 group-hover/register:translate-x-0.5 transition-transform" />
                </Link>
              </p>
            </div>

            {/* Decorative dots */}
            <div className="flex items-center justify-center gap-1 pt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i === 0 ? 'w-4 h-1 bg-primary' : 'w-1 h-1 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>

    {/* ══════════════════ RIGHT PANEL – Decorative / Feature Showcase ══════════════════ */}
    <div className="hidden lg:flex w-full lg:w-[56%] relative overflow-hidden flex-col items-center justify-center bg-primary">
      <FloatingParticles />

      {/* Background shapes */}
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute right-[-15%] top-[5%] w-[65%] h-[75%] rounded-full bg-white/5" />
      <div className="absolute left-[-10%] bottom-[-10%] w-[55%] h-[55%] rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6 py-8 gap-4">

        {/* Tagline */}
        <div className="text-center space-y-1">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-1.5 mb-1"
          >
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
              Education Platform
            </span>
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold text-white tracking-tight"
          >
            Bwenge<span className="text-blue-200">Plus</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-white/70 text-xs font-medium"
          >
            Secure • Protected • Smart
          </motion.p>
        </div>

        {/* Feature Carousel */}
        <div className="w-full max-w-xs">
          <div className="relative h-24 overflow-hidden">
            {features.map((feat, index) => {
              const FIcon = feat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{
                    opacity: index === currentFeature ? 1 : 0,
                    x: index === currentFeature ? 0 : 30,
                  }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center px-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-md mb-1.5`}
                  >
                    <FIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-0.5">{feat.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{feat.description}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Dot nav */}
          <div className="flex justify-center gap-1.5 mt-1">
            {features.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentFeature(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentFeature ? 'w-5 bg-white' : 'w-1 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 text-white/80 text-xs mt-2">
          <div className="text-center">
            <div className="font-bold text-white text-sm">10K+</div>
            <div>Learners</div>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-center">
            <div className="font-bold text-white text-sm">100+</div>
            <div>Institutions</div>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-center">
            <div className="font-bold text-white text-sm">500+</div>
            <div>Courses</div>
          </div>
        </div>

        {/* Additional CTA for new users */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-4 pt-4 border-t border-white/20 w-full max-w-xs text-center"
        >
          <p className="text-white/70 text-xs mb-2">New to BwengePlus?</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-all group"
          >
            <span>Create free account</span>
            <Zap className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  </div>
</GoogleOAuthProviderWrapper>
  )
}