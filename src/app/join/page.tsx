"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/store"
import { loginAndJoin, registerAndJoin, clearError } from "@/lib/features/auth/auth-slice"
import { getRoleDashboardPath } from "@/app/utils/roleNavigation"
import {
  Building2, Loader2, CheckCircle2, XCircle, GraduationCap,
  UserCog, Crown, LogIn, UserPlus, Home, Clock,
  ShieldCheck, Sparkles, Lock, Mail, Eye, EyeOff, User, AlertCircle, ArrowRight, Check,
} from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

const ROLE_META: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  MEMBER:          { label: "Member / Student",  Icon: GraduationCap, color: "text-primary",  bg: "bg-primary/10"  },
  INSTRUCTOR:      { label: "Instructor",         Icon: UserCog,       color: "text-emerald-600", bg: "bg-emerald-500/10" },
  CONTENT_CREATOR: { label: "Content Creator",    Icon: Sparkles,      color: "text-amber-600",   bg: "bg-amber-500/10"  },
  ADMIN:           { label: "Administrator",      Icon: Crown,         color: "text-primary",  bg: "bg-primary/10"  },
}

interface InviteInfo {
  institution: { id: string; name: string; logo_url?: string; description?: string; type: string; slug: string }
  role: string
  expires_at?: string
  invitation_id: string
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

/* ── Simple Input ── */
function Input({
  id, name, type = "text", value, onChange, placeholder, required, disabled, rightEl,
}: {
  id?: string; name?: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; required?: boolean; disabled?: boolean; rightEl?: React.ReactNode
}) {
  return (
    <div className="relative">
      <input
        id={id} name={name} type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        required={required} disabled={disabled}
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

function JoinPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const dispatch = useDispatch<AppDispatch>()
  const {
    user, isAuthenticated,
    isLoading: authLoading, error: authError,
    requiresVerification, verificationEmail,
  } = useSelector((state: RootState) => state.bwengeAuth)

  const [phase, setPhase] = useState<"loading" | "preview" | "joining" | "done" | "error">("loading")
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [authTab, setAuthTab] = useState<"login" | "register">("login")

  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [showPw, setShowPw] = useState(false)
  const [regForm, setRegForm] = useState({ first_name: "", last_name: "", email: "", password: "", motivation: "" })
  const [showRegPw, setShowRegPw] = useState(false)

  /* Token verification */
  useEffect(() => {
    if (!token) { setErrorMsg("No invite token found in this link."); setPhase("error"); return }
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/institutions/invite/verify?token=${token}`)
        const data = await res.json()
        if (data.success) { setInviteInfo(data.data); setPhase("preview") }
        else { setErrorMsg(data.message || "Invalid invite link."); setPhase("error") }
      } catch { setErrorMsg("Could not verify the invite link. Please try again."); setPhase("error") }
    })()
  }, [token])

  /* Redirect on authenticated */
  useEffect(() => {
    if (phase === "preview" && isAuthenticated && inviteInfo) {
      setPhase("done")
      const joinedRole = user?.institution_role ?? user?.bwenge_role ?? "LEARNER"
      const roleMap: Record<string, string> = {
        ADMIN: "INSTITUTION_ADMIN", INSTRUCTOR: "INSTRUCTOR",
        CONTENT_CREATOR: "CONTENT_CREATOR", MEMBER: "LEARNER",
      }
      setTimeout(() => router.push(getRoleDashboardPath(roleMap[joinedRole] ?? joinedRole)), 2000)
    }
  }, [phase, isAuthenticated, inviteInfo, user, router])

  /* Verify email redirect */
  useEffect(() => {
    if (requiresVerification && verificationEmail && phase === "preview") {
      const redirectTarget = encodeURIComponent(`/join?token=${token}`)
      router.push(`/verify-email?email=${encodeURIComponent(verificationEmail)}&redirect=${redirectTarget}`)
    }
  }, [requiresVerification, verificationEmail, phase, token, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); dispatch(clearError())
    try { await dispatch(loginAndJoin({ ...loginForm, token })).unwrap() } catch { }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); dispatch(clearError())
    try { await dispatch(registerAndJoin({ ...regForm, confirm_password: regForm.password, token })).unwrap() } catch { }
  }

  const role = ROLE_META[inviteInfo?.role ?? "MEMBER"] ?? ROLE_META.MEMBER
  const RoleIcon = role.Icon

  /* ── Loading ── */
  if (phase === "loading") {
    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-[45%] h-full flex flex-col bg-background border-r border-border/40">
          <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
            <Logo />
            <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-[11px] text-muted-foreground">Verifying invite link…</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary" />
      </div>
    )
  }

  /* ── Error ── */
  if (phase === "error") {
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
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[300px] space-y-4 text-center"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Invalid Link</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Link invalid.</h1>
                <p className="text-[11px] text-muted-foreground">{errorMsg}</p>
              </div>
              <Link href="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Home className="w-4 h-4" /> Go Home
              </Link>
            </motion.div>
          </div>
          <div className="px-6 h-8 border-t border-border/40 flex items-center flex-shrink-0">
            <p className="text-[9px] text-muted-foreground/40 tracking-widest uppercase font-medium">
              © {new Date().getFullYear()} BwengePlus · Institution-grade learning
            </p>
          </div>
        </div>
        <div className="hidden lg:flex w-full lg:w-[55%] h-full bg-primary flex-col items-center justify-center px-12">
          <h2 className="text-[38px] font-bold text-white leading-[1.0] tracking-tight">Link</h2>
          <h2 className="text-[38px] font-bold text-white/60 leading-[1.0] tracking-tight">expired</h2>
          <h2 className="text-[38px] font-bold text-white/30 leading-[1.0] tracking-tight">or invalid.</h2>
        </div>
      </div>
    )
  }

  /* ── Done ── */
  if (phase === "done") {
    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-[45%] h-full flex flex-col bg-background border-r border-border/40">
          <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
            <Logo />
          </div>
          <div className="flex-1 flex items-center justify-center px-8 py-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-[300px] space-y-4 text-center"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Success</p>
                <h1 className="text-[22px] font-bold text-foreground leading-none tracking-tight">Welcome aboard!</h1>
                <p className="text-[11px] text-muted-foreground">
                  Joined <span className="font-semibold text-foreground">{inviteInfo?.institution.name}</span> as{" "}
                  <span className={`font-semibold ${role.color}`}>{role.label}</span>
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">Redirecting to dashboard…</p>
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
          <h2 className="text-[38px] font-bold text-white/70 leading-[1.0] tracking-tight">to the</h2>
          <h2 className="text-[38px] font-bold text-white/40 leading-[1.0] tracking-tight">team.</h2>
        </div>
      </div>
    )
  }

  /* ── Preview — login/register to join ── */
  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ══ LEFT — Form column ══ */}
      <div className="w-full lg:w-[58%] h-full flex flex-col bg-background border-r border-border/40">

        {/* Top nav */}
        <div className="flex items-center justify-between px-6 h-11 border-b border-border/40 flex-shrink-0">
          <Logo />

          {/* Auth tabs in nav */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setAuthTab(tab); dispatch(clearError()) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                  authTab === tab ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "login" ? <LogIn className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {tab === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-3 h-3" /> Home
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-3 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[380px] space-y-3"
          >
            {/* Heading */}
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Invitation</p>
              <h1 className="text-[20px] font-bold text-foreground leading-none tracking-tight">
                Join <span className="text-primary">{inviteInfo?.institution.name}</span>
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {isAuthenticated ? `Joining as ${user?.first_name}…` : "Sign in or create an account to accept."}
              </p>
            </div>

            {/* Mobile institution preview */}
            <div className="lg:hidden flex items-center gap-3 p-3 bg-primary/5 border border-primary/15 rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {inviteInfo?.institution.logo_url
                  ? <img src={inviteInfo.institution.logo_url} alt="" className="w-full h-full object-cover" />
                  : <Building2 className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground leading-tight">{inviteInfo?.institution.name}</p>
                <p className={`text-[10px] font-semibold ${role.color}`}>{role.label}</p>
              </div>
            </div>

            {/* Auth error */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="border-l-[3px] border-destructive bg-destructive/5 pl-3 pr-3 py-2 rounded-r"
                >
                  <p className="text-[11px] text-destructive leading-snug">{authError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress indicator */}
            <div className="w-full h-px bg-border overflow-hidden rounded-full">
              <motion.div className="h-full bg-primary"
                animate={{ width: authTab === "login" ? "50%" : "100%" }}
                transition={{ duration: 0.35, ease: "easeOut" }} />
            </div>

            <AnimatePresence mode="wait">

              {/* Login form */}
              {authTab === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleLogin}
                  className="space-y-2"
                >
                  <Input type="email" placeholder="Email address" required value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} disabled={authLoading} />
                  <Input
                    type={showPw ? "text" : "password"} placeholder="Password" required
                    value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={authLoading}
                    rightEl={
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    }
                  />
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <button type="submit" disabled={authLoading}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                      hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2">
                    {authLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></>
                      : <><LogIn className="w-4 h-4" /><span>Sign In &amp; Join</span></>}
                  </button>
                </motion.form>
              )}

              {/* Register form */}
              {authTab === "register" && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleRegister}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="text" placeholder="First name *" required value={regForm.first_name}
                      onChange={(e) => setRegForm((f) => ({ ...f, first_name: e.target.value }))} disabled={authLoading} />
                    <Input type="text" placeholder="Last name *" required value={regForm.last_name}
                      onChange={(e) => setRegForm((f) => ({ ...f, last_name: e.target.value }))} disabled={authLoading} />
                  </div>
                  <Input type="email" placeholder="Email address *" required value={regForm.email}
                    onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))} disabled={authLoading} />
                  <Input
                    type={showRegPw ? "text" : "password"} placeholder="Create password *" required
                    value={regForm.password} onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={authLoading}
                    rightEl={
                      <button type="button" tabIndex={-1} onClick={() => setShowRegPw(!showRegPw)}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        {showRegPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    }
                  />
                  <textarea
                    required rows={2} placeholder="Why do you want to join BwengePlus? *"
                    value={regForm.motivation}
                    onChange={(e) => setRegForm((f) => ({ ...f, motivation: e.target.value }))}
                    disabled={authLoading}
                    className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-white/5 border border-border rounded-lg outline-none
                      resize-none focus:border-primary transition-colors text-foreground
                      placeholder:text-muted-foreground/60 disabled:opacity-50"
                  />
                  <button type="submit" disabled={authLoading}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold
                      hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2">
                    {authLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating account…</span></>
                      : <><UserPlus className="w-4 h-4" /><span>Register &amp; Join</span></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Invitation summary */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.16em]">your invitation</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${role.bg} border-border`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.bg}`}>
                <RoleIcon className={`w-4 h-4 ${role.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground">{inviteInfo?.institution.name}</p>
                <p className={`text-[10px] font-medium ${role.color}`}>{role.label}</p>
              </div>
              {inviteInfo?.expires_at && (
                <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(inviteInfo.expires_at).toLocaleDateString()}</span>
                </div>
              )}
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
      <div className="hidden lg:flex w-full lg:w-[42%] h-full bg-primary flex-col">
        <div className="flex items-center justify-between px-10 h-11 border-b border-white/10 flex-shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Institution Invite</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/50">Rwanda · Education</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-10 py-6 gap-6">

          {/* Institution info */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.42, ease: "easeOut" }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                {inviteInfo?.institution.logo_url
                  ? <img src={inviteInfo.institution.logo_url} alt={inviteInfo.institution.name} className="w-full h-full object-cover" />
                  : <Building2 className="w-8 h-8 text-white/70" />}
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 mb-1">You're invited to join</p>
                <h2 className="text-[28px] font-bold text-white leading-[1.05] tracking-tight">{inviteInfo?.institution.name}</h2>
                <p className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">{inviteInfo?.institution.type?.replace(/_/g, " ")}</p>
              </div>
              {inviteInfo?.institution.description && (
                <p className="text-[13px] text-white/70 leading-relaxed max-w-xs line-clamp-3">
                  {inviteInfo.institution.description}
                </p>
              )}
              {/* Role badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                <RoleIcon className="w-4 h-4 text-white" />
                <span className="text-[13px] text-white font-semibold">You'll join as {role.label}</span>
              </div>
            </div>
          </motion.div>

          <div className="w-10 h-px bg-white/20 mx-auto" />

          {/* Details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.42 }}
            className="space-y-2"
          >
            {inviteInfo?.expires_at && (
              <div className="flex items-center gap-3 py-3 border-b border-white/10">
                <Clock className="w-4 h-4 text-white/50 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-white">Link expires</p>
                  <p className="text-[11px] text-white/60">{new Date(inviteInfo.expires_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-3 border-b border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-white">Secured by BwengePlus</p>
            </div>
          </motion.div>
        </div>

        <div className="px-10 py-4 border-t border-white/10 flex-shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">BwengePlus</p>
          <p className="text-[13px] font-semibold text-white">Rwanda's leading e-learning platform</p>
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

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinPageInner />
    </Suspense>
  )
}