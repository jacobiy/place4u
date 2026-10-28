import React, { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import ProtectedRoute from "./component/ProtectedRoute";
import { supabase } from "./utils/Supabase";
import { claimPostSignInRedirect } from "./utils/authReturn";
import PrivacyConsent from "./component/PrivacyConsent";
import AuthModal from "./component/AuthModal";
import Loading from "./component/loading";
import { applySeo, resolveSeoForPath } from "./utils/seo";

// Code-split route components for fast initial load & reduced bundle size
const Landing = lazy(() => import("./pages/landing/Landing"));
const About = lazy(() => import("./pages/landing/About"));
const ResetPassword = lazy(() => import("./pages/resetpassword/resetpassword"));
const ChangePassword = lazy(() => import("./pages/resetpassword/changepassword"));
const TenantDashboard = lazy(() => import("./pages/Tenant/TenantDashboard"));
const LandlordDashboard = lazy(() => import("./pages/Landlord/MainLandLord"));
const AgentDashboard = lazy(() => import("./pages/Agent/MainAgent"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/legal/DataProtectionNotice"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const ComplianceNotice = lazy(() => import("./pages/legal/ComplianceNotice"));
const DisputeResolution = lazy(() => import("./pages/legal/DisputeResolution"));
const CookiePreferences = lazy(() => import("./pages/legal/StoragePreferences"));

// OAuth Callback handler component
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const processAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (isMounted) navigate("/login", { replace: true });
          return;
        }

        // Resolve the role authoritatively from public.users. No email or
        // metadata inference for the ROLE — it only counts once the row is read
        // back from the database below.
        //
        // The row is created SERVER-SIDE by the `on_auth_user_created` trigger
        // on auth.users (database/auth_signup_profile_sync.sql), so it already
        // exists by the time we get here — including the first sign-in right
        // after email confirmation. This component deliberately does NOT create
        // it: the browser carries a self-insert RLS policy
        // (users_insert_self_non_admin), so a bootstrap here would let a REVOKED
        // account — one whose public.users row an admin deleted — walk in via
        // /auth/callback on a still-valid session and resurrect its own profile.
        // If the row is genuinely absent we fail closed, below.
        //
        // select('*') rather than a column list: role_confirmed is added by
        // database/oauth_role_onboarding.sql, and naming a column that does not
        // exist yet would make this read fail and lock every user out. With '*'
        // it is simply absent (undefined) until the migration is applied.
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        const role = userData?.user_type;
        if (!role || (role === "admin" && userData.is_verified === false)) {
          // No authoritative profile (or a disabled admin): never guess a portal.
          await supabase.auth.signOut().catch(() => {});
          if (isMounted) navigate("/login", { replace: true });
          return;
        }

        // An OAuth (Google) signup cannot carry a role — the provider only knows
        // name/email — so the trigger provisions it as 'tenant' with
        // role_confirmed = false. Send those accounts to the one-time role picker
        // instead of straight into the tenant portal. (Absent/undefined when the
        // migration has not been applied, in which case we fall through as before.)
        if (userData.role_confirmed === false) {
          if (isMounted) navigate("/complete-profile", { replace: true });
          return;
        }

        if (isMounted) navigate(`/${role}`, { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        if (isMounted) navigate("/login", { replace: true });
      }
    };

    processAuth();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return <Loading fullScreen message="Completing sign in..." />;
}

// Fallback spinner while loading route chunks
function RouteLoader() {
  return <Loading fullScreen message="Loading page..." />;
}

// Route-scoped SEO. Side-effect-only, rendered once inside the Router: it
// applies the title, description, canonical and social tags for the current
// path so the single static index.html head is correct per URL. The route →
// metadata map lives in src/utils/seo.js — add new pages there, not here.
// Private portals resolve to a `noindex` entry, which is also how a crawler
// that executes JS is kept out of them.
function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    applySeo(resolveSeoForPath(pathname));
  }, [pathname]);

  return null;
}

// Resilient boundary handling chunk loading, adblocker interception, and general React errors
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Application error caught by boundary:", error, errorInfo);

    // Auto-reload once for stale chunks / dynamic import network failures
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /dynamically imported module|loading chunk|failed to fetch|importing a module script failed/i.test(
        error?.message || ''
      );

    if (isChunkError && typeof window !== 'undefined') {
      const reloadKey = `chunk_reload_${window.location.pathname}`;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error || '');
      const isChunkOrAdblockError =
        this.state.error?.name === 'ChunkLoadError' ||
        /dynamically imported module|loading chunk|failed to fetch|blocked_by_client|importing a module script failed/i.test(
          errorMessage
        );

      if (isChunkOrAdblockError) {
        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Notice: Module Loading Interruption</h2>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              A client-side network interruption or adblocker may have blocked this module request. Please refresh or whitelist localhost in your adblocker.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        );
      }

      // Standard application runtime error fallback
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
            An unexpected error occurred in this view.
          </p>
          {errorMessage && (
            <div className="max-w-md mb-6 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-left">
              <p className="text-[11px] font-mono text-red-300 break-words line-clamp-3">
                {errorMessage}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global onboarding + post-sign-in guard.
//
// Supabase only honours `redirectTo` when the target is on the project's
// Redirect URLs allowlist; otherwise it SILENTLY falls back to the Site URL.
// That is exactly how a Google sign-in ends up on "https://place4u.xyz/#" with
// the account still defaulted to 'tenant': /auth/callback is never reached, so
// the role check inside it never runs. Watching the session from here instead
// means the picker runs wherever the provider drops the user — and it also
// closes the gap where an un-onboarded account navigates straight to /tenant.
//
// It additionally finishes the sign-in when the provider returned to a PUBLIC
// page (the Site-URL fallback above): a session that appears on "/", "/login"
// or "/signup" is sent straight to the portal its role belongs to, so the user
// never lands on a signed-in-but-looks-signed-out landing page. The "did we
// arrive from a provider?" test lives in utils/authReturn.js.
// This guard must never run on /auth/callback — that route owns its own
// redirect and the two racing would be pointless.
const PUBLIC_ENTRY_PATHS = ["/", "/login", "/signup"];

function RoleOnboardingGate() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (location.pathname === "/complete-profile") return;
      if (location.pathname === "/auth/callback") return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled || !session?.user) return;

        // select('*') so that a missing role_confirmed column (migration not
        // applied yet) is simply undefined instead of a failing query.
        const { data: row } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled || !row) return;

        if (row.role_confirmed === false) {
          navigate("/complete-profile", { replace: true });
          return;
        }

        // A disabled admin is not sent anywhere: ProtectedRoute fails them
        // closed, and bouncing them onto /admin would only create a loop.
        if (row.user_type === "admin" && row.is_verified === false) return;

        // Finish a provider sign-in that landed on a public page (tokens are
        // already in the session — nothing else routes the user onward).
        // claimPostSignInRedirect() self-limits to once per page load, so a
        // signed-in user who deliberately opens "/" is not trapped.
        if (
          PUBLIC_ENTRY_PATHS.includes(location.pathname) &&
          row.user_type &&
          claimPostSignInRedirect(session)
        ) {
          navigate(`/${row.user_type}`, { replace: true });
        }
      } catch (err) {
        // This guard must never break navigation.
        console.warn("Role onboarding check failed (non-fatal):", err);
      }
    };

    check();

    const { data } = supabase.auth.onAuthStateChange(() => {
      // MUST defer to a macrotask. The auth client holds an internal lock during
      // this callback, and issuing a PostgREST query inline re-enters that lock
      // and deadlocks the client permanently (every page sticks on its spinner).
      // Same rule as useAuth.js / ProtectedRoute.jsx.
      setTimeout(() => { if (!cancelled) check(); }, 0);
    });

    return () => {
      cancelled = true;
      data?.subscription?.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return null;
}

// Stable role arrays. Passing an inline `["tenant"]` literal creates a new
// array on every render, which would re-run ProtectedRoute's auth effect (and
// tear down/re-create its auth subscription) needlessly on each render.
const TENANT_ROLES = ["tenant"];
const LANDLORD_ROLES = ["landlord"];
const AGENT_ROLES = ["agent"];
const ADMIN_ROLES = ["admin"];

export default function App() {
  return (
    <>
      <ChunkErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          {/* Keep legacy auth URLs working, but show the shared modal over the landing page. */}
          <Route path="/login" element={<Landing />} />
          <Route path="/signup" element={<Landing />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* The protected OAuth role picker opens in AuthModal over the landing page. */}
          <Route path="/complete-profile" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/compliance" element={<ComplianceNotice />} />
          <Route path="/popia-notice" element={<ComplianceNotice />} />
          <Route path="/dispute-resolution" element={<DisputeResolution />} />
          <Route path="/cookie-preferences" element={<CookiePreferences />} />
          <Route path="/cookies" element={<CookiePreferences />} />

          <Route
            path="/tenant"
            element={
              <ProtectedRoute allowedRoles={TENANT_ROLES}>
                <TenantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord"
            element={
              <ProtectedRoute allowedRoles={LANDLORD_ROLES}>
                <LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent"
            element={
              <ProtectedRoute allowedRoles={AGENT_ROLES}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/payments" element={<Navigate to="/admin/payments" replace />} />
          <Route path="/paymentns" element={<Navigate to="/admin/payments" replace />} />
          <Route path="/agent-applications" element={<Navigate to="/admin/agent-applications" replace />} />
          <Route path="/landlord-applications" element={<Navigate to="/admin/landlord-applications" replace />} />
          <Route path="/dashboard" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AuthModal />
      </Suspense>
      </ChunkErrorBoundary>
      <RouteSeo />
      <RoleOnboardingGate />
      <PrivacyConsent />
    </>
  );
}
