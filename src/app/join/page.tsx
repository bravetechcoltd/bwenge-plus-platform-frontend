"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Cookies from "js-cookie";
import { toast } from "sonner";
import {
  Building2, Loader2, CheckCircle2, XCircle, GraduationCap,
  UserCog, Crown, ArrowRight, LogIn, UserPlus, Home, Clock,
  ShieldCheck, Sparkles, Lock, Mail, Eye, EyeOff, User, AlertCircle,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/lib/store";
import { loginBwenge, registerBwenge, clearError, fetchBwengeProfile } from "@/lib/features/auth/auth-slice";
import { getRoleDashboardPath } from "@/app/utils/roleNavigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const ROLE_META: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  MEMBER:          { label: "Member / Student",  Icon: GraduationCap, color: "text-blue-600",   bg: "bg-blue-50"   },
  INSTRUCTOR:      { label: "Instructor",         Icon: UserCog,       color: "text-green-600",  bg: "bg-green-50"  },
  CONTENT_CREATOR: { label: "Content Creator",    Icon: Sparkles,      color: "text-amber-600",  bg: "bg-amber-50"  },
  ADMIN:           { label: "Administrator",      Icon: Crown,         color: "text-purple-600", bg: "bg-purple-50" },
};

interface InviteInfo {
  institution: { id: string; name: string; logo_url?: string; description?: string; type: string; slug: string };
  role: string;
  expires_at?: string;
  invitation_id: string;
}

/* ── Floating background particles ────────────────────────────────────── */
function Particles() {
  const pts = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 3 + 1,
    d: Math.random() * 10 + 14,
    delay: Math.random() * 6,
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pts.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
          animate={{ y: [-10, -55], opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: p.d, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Institution card shown on right/top panel ─────────────────────────── */
function InstitutionCard({ info }: { info: InviteInfo }) {
  const role = ROLE_META[info.role] ?? ROLE_META.MEMBER;
  const RoleIcon = role.Icon;
  return (
    <div className="flex flex-col items-center text-center space-y-4 px-4">
      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl overflow-hidden">
        {info.institution.logo_url ? (
          <img src={info.institution.logo_url} alt={info.institution.name} className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-10 h-10 text-white/80" />
        )}
      </div>

      {/* Name + type */}
      <div>
        <h2 className="text-2xl font-bold text-white">{info.institution.name}</h2>
        <p className="text-white/60 text-xs uppercase tracking-widest mt-0.5">{info.institution.type?.replace(/_/g, " ")}</p>
      </div>

      {/* Description */}
      {info.institution.description && (
        <p className="text-white/70 text-sm leading-relaxed max-w-xs line-clamp-3">
          {info.institution.description}
        </p>
      )}

      {/* Role badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm`}>
        <RoleIcon className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-semibold">You'll join as {role.label}</span>
      </div>

      {/* Expiry */}
      {info.expires_at && (
        <div className="flex items-center gap-1.5 text-white/50 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Link expires {new Date(info.expires_at).toLocaleDateString()}</span>
        </div>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-1.5 text-white/60 text-xs mt-2">
        <ShieldCheck className="w-3.5 h-3.5 text-green-300" />
        <span>Secured by BwengePlus</span>
      </div>
    </div>
  );
}

/* ── Stable layout wrapper — defined OUTSIDE JoinPageInner so it keeps the
     same component identity across re-renders and never unmounts its children ── */
function Layout({ inviteInfo, children }: { inviteInfo: InviteInfo | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-primary relative">
      <Particles />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Back home */}
      <Link
        href="/"
        className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium transition-all"
      >
        <Home className="w-3.5 h-3.5" /> Home
      </Link>

      {/* Left – action panel */}
      <div className="w-full lg:w-[44%] flex items-center justify-center p-4 sm:p-6 relative z-20 min-h-screen lg:min-h-0">
        {children}
      </div>

      {/* Right – institution info */}
      <div className="hidden lg:flex w-full lg:w-[56%] relative flex-col items-center justify-center p-10">
        {inviteInfo && <InstitutionCard info={inviteInfo} />}
        {!inviteInfo && (
          <div className="flex items-center gap-3 text-white/60">
            <Building2 className="w-8 h-8" />
            <span className="text-lg font-medium">BwengePlus Institutions</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main inner component (uses useSearchParams) ──────────────────────── */
function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const dispatch = useDispatch<AppDispatch>();
  const {
    user, isAuthenticated, token: reduxToken,
    isLoading: authLoading, error: authError,
    requiresVerification, verificationEmail,
  } = useSelector((state: RootState) => state.bwengeAuth);

  // States
  const [phase, setPhase] = useState<"loading" | "preview" | "joining" | "done" | "error">("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  // Register form
  const [regForm, setRegForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [showRegPw, setShowRegPw] = useState(false);

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  /* Step 1 – verify token */
  useEffect(() => {
    if (!token) {
      setErrorMsg("No invite token found in this link.");
      setPhase("error");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/institutions/invite/verify?token=${token}`);
        const data = await res.json();
        if (data.success) {
          setInviteInfo(data.data);
          setPhase("preview");
        } else {
          setErrorMsg(data.message || "Invalid invite link.");
          setPhase("error");
        }
      } catch {
        setErrorMsg("Could not verify the invite link. Please try again.");
        setPhase("error");
      }
    })();
  }, [token]);

  /* Step 2 – accept invite (called after we confirm user is authed) */
  const acceptInvite = useCallback(async () => {
    setPhase("joining");
    try {
      const res = await fetch(`${API_URL}/institutions/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh Redux user state so institution_ids, primary_institution_id,
        // institution_role are all current before redirecting to the dashboard.
        try {
          const refreshed = await dispatch(fetchBwengeProfile()).unwrap();
          // Sync the individual institution cookies that storeAuthData normally sets
          if (refreshed?.primary_institution_id) {
            Cookies.set("bwenge_primary_institution_id", refreshed.primary_institution_id, { expires: 7 });
          }
          if (refreshed?.institution_role) {
            Cookies.set("bwenge_institution_role", refreshed.institution_role, { expires: 7 });
          }
          if (refreshed?.institution_ids?.length) {
            Cookies.set("bwenge_institution_ids", JSON.stringify(refreshed.institution_ids), { expires: 7 });
          }
        } catch {
          // profile refresh is best-effort; membership was still created successfully
        }
        setPhase("done");
        toast.success(data.message || "Successfully joined!");
        setTimeout(() => {
          // After profile refresh, user bwenge_role may have been promoted (e.g. to INSTRUCTOR)
          // so re-read from the store isn't possible here yet — use the response role to decide
          const joinedRole = data.data?.role ?? user?.bwenge_role ?? "LEARNER";
          const roleMap: Record<string, string> = {
            ADMIN: "INSTITUTION_ADMIN",
            INSTRUCTOR: "INSTRUCTOR",
            CONTENT_CREATOR: "CONTENT_CREATOR",
            MEMBER: "LEARNER",
          };
          router.push(getRoleDashboardPath(roleMap[joinedRole] ?? joinedRole));
        }, 2000);
      } else {
        setErrorMsg(data.message || "Failed to join institution.");
        setPhase("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setPhase("error");
    }
  }, [token, getToken, router, user, dispatch]);

  /* If authenticated and verified → auto-accept */
  useEffect(() => {
    if (phase === "preview" && isAuthenticated && inviteInfo && user?.is_verified !== false) {
      acceptInvite();
    }
  }, [phase, isAuthenticated, inviteInfo, user?.is_verified, acceptInvite]);

  /* After register with requires_verification → redirect to verify-email */
  useEffect(() => {
    if (requiresVerification && verificationEmail && phase === "preview") {
      const redirectTarget = encodeURIComponent(`/join?token=${token}`);
      router.push(`/verify-email?email=${encodeURIComponent(verificationEmail)}&redirect=${redirectTarget}`);
    }
  }, [requiresVerification, verificationEmail, phase, token, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    try {
      await dispatch(loginBwenge(loginForm)).unwrap();
      // acceptInvite triggers via the useEffect above once isAuthenticated flips
    } catch { /* authError shown via selector */ }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    try {
      await dispatch(registerBwenge({ ...regForm, confirm_password: regForm.password })).unwrap();
      // If requires_verification → the useEffect above handles redirect to verify-email
      // If no verification needed → isAuthenticated flips → acceptInvite fires
    } catch { /* authError shown via selector */ }
  };

  /* ── Phase: loading ─────────────────────────────────────────────────── */
  if (phase === "loading") {
    return (
      <Layout inviteInfo={inviteInfo}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/70 p-8 flex flex-col items-center gap-4 w-full max-w-sm"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-gray-600 font-medium">Verifying invite link…</p>
        </motion.div>
      </Layout>
    );
  }

  /* ── Phase: error ───────────────────────────────────────────────────── */
  if (phase === "error") {
    return (
      <Layout inviteInfo={inviteInfo}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/70 p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link Invalid</h2>
            <p className="text-gray-500 text-sm mt-1">{errorMsg}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
        </motion.div>
      </Layout>
    );
  }

  /* ── Phase: joining ─────────────────────────────────────────────────── */
  if (phase === "joining") {
    return (
      <Layout inviteInfo={inviteInfo}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/70 p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Joining…</h2>
            <p className="text-gray-500 text-sm mt-1">Setting up your membership</p>
          </div>
        </motion.div>
      </Layout>
    );
  }

  /* ── Phase: done ────────────────────────────────────────────────────── */
  if (phase === "done") {
    const role = ROLE_META[inviteInfo?.role ?? "MEMBER"] ?? ROLE_META.MEMBER;
    const RoleIcon = role.Icon;
    return (
      <Layout inviteInfo={inviteInfo}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/70 p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Welcome aboard!</h2>
            <p className="text-gray-500 text-sm mt-1">
              You joined <strong>{inviteInfo?.institution.name}</strong> as{" "}
              <span className={role.color + " font-semibold"}>{role.label}</span>
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${role.bg} border`}>
            <RoleIcon className={`w-4 h-4 ${role.color}`} />
            <span className={`text-sm font-semibold ${role.color}`}>{role.label}</span>
          </div>
          <p className="text-xs text-gray-400">Redirecting to dashboard…</p>
        </motion.div>
      </Layout>
    );
  }

  /* ── Phase: preview — unauthenticated user needs to login/register ─── */
  const inputCls = "w-full pl-11 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium outline-none";
  const iconWrap = "absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-gray-100 group-focus-within:bg-primary/10 flex items-center justify-center transition-colors pointer-events-none";
  const iconCls  = "w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors";

  return (
    <Layout inviteInfo={inviteInfo}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <div className="bg-white/98 backdrop-blur-2xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/70 overflow-hidden">

          {/* Header */}
          <div className="pt-5 pb-3 px-6 border-b border-gray-100/80 text-center">
            {/* Mobile institution preview */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {inviteInfo?.institution.logo_url ? (
                  <img src={inviteInfo.institution.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{inviteInfo?.institution.name}</p>
                <p className="text-xs text-primary font-medium">
                  {ROLE_META[inviteInfo?.role ?? "MEMBER"]?.label ?? "Member"}
                </p>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-primary border-4 border-white shadow-md flex items-center justify-center mx-auto mb-1.5">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">
              Join <span className="text-primary">{inviteInfo?.institution.name}</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAuthenticated
                ? `Joining as ${user?.first_name}…`
                : "Sign in or create an account to join"}
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">

            {/* Auth error */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{authError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth tabs */}
            <div className="flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
              {(["login", "register"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setAuthTab(tab); dispatch(clearError()); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    authTab === tab ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "login" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {tab === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* Login form */}
            <AnimatePresence mode="wait">
              {authTab === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-2.5"
                >
                  <div className="relative group">
                    <div className={iconWrap}><Mail className={iconCls} /></div>
                    <input
                      type="email" required placeholder="Email address"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                      disabled={authLoading}
                    />
                  </div>
                  <div className="relative group">
                    <div className={iconWrap}><Lock className={iconCls} /></div>
                    <input
                      type={showPw ? "text" : "password"} required placeholder="Password"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full pl-11 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium outline-none"
                      disabled={authLoading}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                    >
                      {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80">Forgot password?</Link>
                  </div>
                  <button
                    type="submit" disabled={authLoading}
                    className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                    {authLoading ? "Signing in…" : "Sign In & Join"}
                  </button>
                </motion.form>
              )}

              {/* Register form */}
              {authTab === "register" && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleRegister}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {(["first_name", "last_name"] as const).map((field, i) => (
                      <div key={field} className="relative group">
                        <div className={iconWrap}><User className={iconCls} /></div>
                        <input
                          type="text" required
                          placeholder={i === 0 ? "First name" : "Last name"}
                          value={regForm[field]}
                          onChange={e => setRegForm(f => ({ ...f, [field]: e.target.value }))}
                          className={inputCls}
                          disabled={authLoading}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="relative group">
                    <div className={iconWrap}><Mail className={iconCls} /></div>
                    <input
                      type="email" required placeholder="Email address"
                      value={regForm.email}
                      onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                      disabled={authLoading}
                    />
                  </div>
                  <div className="relative group">
                    <div className={iconWrap}><Lock className={iconCls} /></div>
                    <input
                      type={showRegPw ? "text" : "password"} required placeholder="Create password"
                      value={regForm.password}
                      onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full pl-11 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium outline-none"
                      disabled={authLoading}
                    />
                    <button type="button" onClick={() => setShowRegPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                    >
                      {showRegPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <button
                    type="submit" disabled={authLoading}
                    className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {authLoading ? "Creating account…" : "Register & Join"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Divider + invite summary */}
            <div className="relative flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">your invitation</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              ROLE_META[inviteInfo?.role ?? "MEMBER"]?.bg ?? "bg-gray-50"
            } border-gray-100`}>
              {(() => {
                const r = ROLE_META[inviteInfo?.role ?? "MEMBER"] ?? ROLE_META.MEMBER;
                const I = r.Icon;
                return (
                  <>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${r.bg}`}>
                      <I className={`w-5 h-5 ${r.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{inviteInfo?.institution.name}</p>
                      <p className={`text-xs font-medium ${r.color}`}>{r.label}</p>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      </motion.div>
    </Layout>
  );
}

/* ── Exported page with Suspense (required for useSearchParams) ─────────── */
export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
