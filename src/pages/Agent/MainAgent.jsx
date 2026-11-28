import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Lock } from "lucide-react";
import { globalStyle, T } from "./Styles/designTokens";
import "./Styles/agent-ui.css";
import "./MainAgent.css";
import { Sidebar } from "./SideBar";
import { Dashboard } from "./Dashboard";
import { Applications } from "./Applications";
import { ApplicationDetail } from "./ApplicationDetail";
import ApplicationManager from "./ApplicationManager";
import MatchPipelineView from "../../component/MatchPipelineView";
import { Properties } from "./Properties";
import { Wallet } from "./Wallet";
import { Profile } from "./Profile";
import { Settings } from "./Settings";
import { AgentQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../utils/Supabase";
import { subscribeToApplicationUpdates, broadcastApplicationUpdate } from "../../services/applicationSync";
import { AgentDashboardSkeleton } from "../../component/DashboardSkeletons";

// Cache key for the last-known verification status. This lets the portal
// render the correct layout on the very first frame, eliminating the
// "unverified → verified" flash that happens while the DB roundtrip resolves.
// The DB (profile / userRow / authIsVerified) remains the single source of
// truth — the cache is *only* used as the initial value and is updated on
// every successful load.
const AGENT_VERIFIED_CACHE_KEY = 'place4u_agent_verified';

function readCachedVerified(userId) {
  if (!userId) return false;
  try {
    const raw = sessionStorage.getItem(AGENT_VERIFIED_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Only trust the cache when it belongs to the current user.
    return parsed?.userId === userId ? Boolean(parsed.verified) : false;
  } catch { return false; }
}

function writeCachedVerified(userId, verified) {
  try {
    sessionStorage.setItem(AGENT_VERIFIED_CACHE_KEY, JSON.stringify({ userId, verified: Boolean(verified) }));
  } catch { /* storage unavailable — no-op */ }
}

export default function MainAgent() {
  const { user, isVerified: authIsVerified, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard");
  const [userRow, setUserRow] = useState(null);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenantById, setTenantById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  // Track whether the initial data fetch has completed at least once. Until it
  // has, we show the loading spinner rather than rendering the unverified/locked
  // state, which prevents the "flash of locked dashboard" for verified agents.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [managedApp, setManagedApp] = useState(null);
  const [detailAppId, setDetailAppId] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const { data: uRow } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
      setUserRow(uRow || null);

      const profileRes = await AgentQueries.getAgentProfile(user.id);
      if (profileRes.success) {
        if (!profileRes.data) {
           const createRes = await AgentQueries.createAgentProfile({ userId: user.id });
           if (createRes.success) setProfile(createRes.data);
        } else {
           setProfile(profileRes.data);
        }
      }

      const appsRes = await AgentQueries.listApplications(80, user.id);
      if (!appsRes.success) throw new Error(appsRes.error);
      const assignedOnly = (appsRes.data || []).filter((a) => {
        return a.assigned_to && String(a.assigned_to) === String(user.id);
      });
      setApplications(assignedOnly);

      const tenantIds = assignedOnly.map((a) => a.tenant_id).filter(Boolean);
      const tenantsRes = await AgentQueries.getUsersByIds(tenantIds);
      const map = new Map();
      (tenantsRes.success ? tenantsRes.data : []).forEach((t) => map.set(t.id, t));
      setTenantById(map);

      const propsRes = await AgentQueries.listActiveProperties(120);
      if (!propsRes.success) throw new Error(propsRes.error);
      setProperties(propsRes.data);
    } catch (e) {
      setError(e?.message || "Failed to load agent dashboard.");
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  // Write the verification status to sessionStorage whenever the authoritative
  // values change, so the next page load starts with the correct layout.
  useEffect(() => {
    if (!user?.id || !initialLoadDone) return;
    const verified = Boolean(
      profile?.is_verified === true ||
      userRow?.is_verified === true ||
      authIsVerified === true
    );
    writeCachedVerified(user.id, verified);
  }, [user?.id, profile?.is_verified, userRow?.is_verified, authIsVerified, initialLoadDone]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setInitialLoadDone(true);
      setError("You must be logged in to access the agent portal.");
      return;
    }
    refresh();

    // Subscribe to application updates (e.g. Admin assigns application to agent)
    const unsubscribe = subscribeToApplicationUpdates(() => {
      refresh();
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Keep the open Application Manager's summary in sync with refreshed data.
  useEffect(() => {
    if (!managedApp) return;
    const fresh = applications.find((a) => a.id === managedApp.id);
    if (fresh && fresh !== managedApp) setManagedApp(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      // ignore
    }
  };

  const handleUpdateStatus = async (id, status, extraData = {}) => {
    const res = await AgentQueries.updateApplicationStatus(id, status, extraData);
    // Surface a real failure so callers do not optimistically show success.
    if (!res || res.success === false) {
      return false;
    }
    const updatedRecord = { ...(res.data || {}), status, ...extraData };
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedRecord } : a)));

    // Synchronize localStorage tenant applications so it instantly appears in tenant portal
    try {
      const localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
      const idx = localApps.findIndex((a) => a.id === id);
      if (idx >= 0) {
        localApps[idx] = { ...localApps[idx], ...updatedRecord };
      } else {
        localApps.push({ id, ...updatedRecord });
      }
      localStorage.setItem('place4u_tenant_applications', JSON.stringify(localApps));
    } catch (e) {}

    // Broadcast status change across all dashboards (Tenant, Admin, Landlord)
    broadcastApplicationUpdate(id, status, updatedRecord);
    return true;
  };

  const handleRequestCompletion = async (id, note = null) => {
    const res = await AgentQueries.requestCompletionApproval(id, note);
    if (!res || res.success === false) {
      return false;
    }
    const updatedRecord = {
      ...(res.data || {}),
      completion_requested_at: new Date().toISOString(),
      completion_request_note: note
    };
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedRecord } : a)));
    return true;
  };

  // Agent accepts or rejects a job the admin assigned. The response is written
  // to the applications row and broadcast so the admin portal flags it.
  const handleRespondToAssignment = async (id, decision, reason = null) => {
    const res = await AgentQueries.respondToAssignment(id, user?.id, decision, reason);
    if (!res || res.success === false) {
      return res || { success: false, error: "Could not update the job assignment." };
    }

    const updated = res.data || {};
    const respondedAt = updated.assignment_responded_at || new Date().toISOString();
    const rejectionReason = decision === "rejected" ? (reason || null) : null;

    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updated,
              assignment_status: decision,
              assignment_responded_at: respondedAt,
              assignment_rejection_reason: rejectionReason
            }
          : a
      )
    );

    const current = applications.find((a) => a.id === id);
    broadcastApplicationUpdate(id, updated.status || current?.status || "under_review", {
      assignment_status: decision,
      assignment_responded_at: respondedAt,
      assignment_rejection_reason: rejectionReason
    });

    return { success: true, data: updated };
  };

  // The detail record and the match workspace are rendered from `activeView`
  // state rather than the router, so opening one pushes a same-URL history
  // entry (keeping React Router's own `idx`/`key` intact). The browser Back
  // button then returns to the applications list instead of leaving the portal.
  const markViewHistory = (view) => {
    try {
      window.history.pushState(
        { ...(window.history.state || {}), place4uAgentView: view },
        ""
      );
    } catch {
      /* history unavailable — Back falls through to the router as before */
    }
  };

  // Consume the entry we pushed so the next Back press leaves the portal
  // instead of silently doing nothing.
  const releaseViewHistory = () => {
    try {
      if (window.history.state?.place4uAgentView) window.history.back();
    } catch {
      /* no-op */
    }
  };

  useEffect(() => {
    const handleHistoryBack = () => {
      setActiveView((current) =>
        current === "application-detail" || current === "application-manager"
          ? "applications"
          : current
      );
      setDetailAppId(null);
      setManagedApp(null);
    };
    window.addEventListener("popstate", handleHistoryBack);
    return () => window.removeEventListener("popstate", handleHistoryBack);
  }, []);

  // Open the full-page application record (replaces the old detail modal).
  const handleViewApplication = (app) => {
    if (!app?.id) return;
    markViewHistory("application-detail");
    setDetailAppId(app.id);
    setActiveView("application-detail");
  };

  const closeApplicationDetail = () => {
    setDetailAppId(null);
    setActiveView("applications");
    releaseViewHistory();
  };

  // Open the Application Manager (draft-match workflow) for an assigned job.
  const handleManageApplication = (app) => {
    if (!app) return;
    markViewHistory("application-manager");
    setManagedApp(app);
    setActiveView("application-manager");
  };

  const closeApplicationManager = () => {
    setManagedApp(null);
    setActiveView("applications");
    releaseViewHistory();
  };

  const renderContent = () => {
    // Show loading while either auth is resolving OR the initial data fetch
    // hasn't completed. This prevents the "flash of locked dashboard" that
    // previously appeared because isAgentVerified was false before userRow and
    // profile had loaded from the DB.
    if (loading || authLoading || !initialLoadDone) {
      return <AgentDashboardSkeleton label="Loading agent portal…" />;
    }

    if (error) {
      return (
        <div className="ag-page">
          <div className="ag-panel ag-panel-body" style={{ maxWidth: 560, margin: "64px auto", textAlign: "center" }}>
            <h2 style={{ color: "#fff", fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Something went wrong</h2>
            <p className="ag-empty-sub" style={{ marginTop: 10 }}>{error}</p>
          </div>
        </div>
      );
    }

    const isAgentVerified = Boolean(
      profile?.is_verified === true ||
      userRow?.is_verified === true ||
      authIsVerified === true
    );

    if (!isAgentVerified && ["applications", "application-detail", "application-manager", "pipeline", "properties", "wallet"].includes(activeView)) {
      return (
        <div className="ag-page">
          <div className="ag-panel ag-panel-body" style={{ maxWidth: 560, margin: "56px auto", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "#f59e0b" }}>
              <Lock size={26} />
            </div>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Verification required
            </h2>
            <p style={{ color: "var(--ag-muted)", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              Verify your account to access {activeView === 'wallet' ? 'earnings' : activeView}.
            </p>
            <button type="button" className="agent-btn agent-btn-primary" onClick={() => setActiveView("dashboard")}>
              Go to dashboard
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <Dashboard 
            agentName={userRow?.full_name?.split(" ")?.[0] || profile?.agency_name || "Agent"} 
            applications={applications} 
            properties={properties} 
            tenantById={tenantById} 
            userRow={userRow}
            profile={profile ? { ...profile, is_verified: isAgentVerified } : { is_verified: isAgentVerified }}
            isAgentVerified={isAgentVerified}
            setActiveView={setActiveView}
            onRefresh={refresh}
            onUpdateStatus={handleUpdateStatus}
            onRequestCompletion={handleRequestCompletion}
            loading={loading}
          />
        );
      case "applications":
        return (
          <Applications
            applications={applications}
            properties={properties}
            tenantById={tenantById}
            currentUserId={user?.id}
            onRefresh={refresh}
            onViewApplication={handleViewApplication}
            loading={loading}
          />
        );
      case "application-detail": {
        const detailApp = applications.find((a) => a.id === detailAppId) || null;
        return (
          <ApplicationDetail
            application={detailApp}
            tenant={detailApp ? tenantById?.get(detailApp.tenant_id) : null}
            properties={properties}
            onBack={closeApplicationDetail}
            onUpdateStatus={handleUpdateStatus}
            onRequestCompletion={handleRequestCompletion}
            onRespondToAssignment={handleRespondToAssignment}
            onManageApplication={handleManageApplication}
          />
        );
      }
      case "application-manager":
        if (!managedApp) {
          return (
            <div className="apm-empty-page">
              <p>No application selected</p>
              <span>Open an assigned application and choose “Manage application”.</span>
              <button type="button" className="apm-btn ghost" onClick={closeApplicationManager}>
                Back to applications
              </button>
            </div>
          );
        }
        return (
          <ApplicationManager
            application={managedApp}
            tenant={tenantById?.get(managedApp.tenant_id)}
            properties={properties}
            currentUserId={user?.id}
            onBack={closeApplicationManager}
            onViewApplication={handleViewApplication}
            onRejectJob={(reason) => handleRespondToAssignment(managedApp.id, "rejected", reason)}
            onShipped={() => refresh()}
          />
        );
      case "pipeline":
        return <MatchPipelineView role="agent" currentUserId={user?.id} theme="light" />;
      case "properties":
        return <Properties properties={properties} onRefresh={refresh} loading={loading} />;
      case "wallet":
        return (
          <Wallet
            applications={applications}
            properties={properties}
            tenantById={tenantById}
            userRow={userRow}
            profile={profile}
            onRefresh={refresh}
            setActiveView={setActiveView}
          />
        );
      case "profile":
        return <Profile userRow={userRow} profile={profile} user={user} onRefresh={refresh} />;
      case "settings":
        return (
          <Settings
            userRow={userRow}
            profile={profile}
            user={user}
            onRefresh={refresh}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <div className="ag-page">
            <div className="ag-empty" style={{ paddingTop: 96 }}>
              <p className="ag-empty-title">This view is not available</p>
              <p className="ag-empty-sub">Use the navigation to open a section of the console.</p>
            </div>
          </div>
        );
    }
  };

  const layoutIsAgentVerified = Boolean(
    profile?.is_verified === true ||
    userRow?.is_verified === true ||
    authIsVerified === true ||
    // Before the initial data fetch has completed, use the cached value so the
    // sidebar and layout classes don't flash between unverified → verified.
    (!initialLoadDone && readCachedVerified(user?.id))
  );
  const layoutAgentProfile = profile
    ? { ...profile, is_verified: layoutIsAgentVerified }
    : { is_verified: layoutIsAgentVerified };
  const layoutUserRow = userRow
    ? { ...userRow, is_verified: layoutIsAgentVerified }
    : { is_verified: layoutIsAgentVerified };

  return (
    <>
      <style>{globalStyle}</style>
      <div className="agent-console agent-layout-wrapper">
        {!isMobile && <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} profile={layoutUserRow} agentProfile={layoutAgentProfile} user={user} />}

        {isMobile && isMobileMenuOpen && (
          <>
            <div onClick={() => setIsMobileMenuOpen(false)} className="agent-sidebar-overlay" />
            <div className="agent-sidebar-container">
              <Sidebar
                activeView={activeView}
                setActiveView={(view) => {
                  setActiveView(view);
                  setIsMobileMenuOpen(false);
                }}
                onLogout={handleLogout}
                profile={layoutUserRow}
                agentProfile={layoutAgentProfile}
                user={user}
              />
            </div>
          </>
        )}

        <main className={`agent-main-content ${isMobile ? 'is-mobile' : ''} ${activeView === 'dashboard' ? 'is-dashboard' : ''} ${activeView === 'dashboard' && layoutIsAgentVerified ? 'is-verified-dashboard' : ''} ${['applications', 'application-detail', 'application-manager', 'pipeline', 'properties', 'wallet', 'profile', 'settings'].includes(activeView) ? 'is-workspace' : ''} ${activeView === 'wallet' ? 'is-wallet' : ''} ${activeView === 'application-manager' ? 'is-manager' : ''}`}>
          {isMobile && (
            <div className="agent-mobile-header">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="agent-mobile-menu-btn"
              >
                <Menu size={20} color={T.textSecondary} />
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </>
  );
}

