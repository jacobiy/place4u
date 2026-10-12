import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Lock } from "lucide-react";
import { globalStyle, T } from "./Styles/designTokens";
import "./MainAgent.css";
import { Sidebar } from "./SideBar";
import { Dashboard } from "./Dashboard";
import { Applications } from "./Applications";
import { Properties } from "./Properties";
import { Wallet } from "./Wallet";
import { Profile } from "./Profile";
import { Settings } from "./Settings";
import { AgentQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../utils/Supabase";
import { subscribeToApplicationUpdates, broadcastApplicationUpdate } from "../../services/applicationSync";
import Loading from "../../component/loading";

export default function MainAgent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard");
  const [userRow, setUserRow] = useState(null);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenantById, setTenantById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
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

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      // ignore
    }
  };

  const stats = useMemo(() => {
    const pending = applications.filter((a) => (a.status || "submitted") === "submitted").length;
    return [
      { label: "New Applications", value: String(pending), change: "—", trend: "neutral", icon: "FileText" },
      { label: "Total Applications", value: String(applications.length), change: "—", trend: "neutral", icon: "Inbox" },
      { label: "Active Listings", value: String(properties.length), change: "—", trend: "neutral", icon: "Building" },
      { label: "Tenants Reached", value: String(tenantById.size), change: "—", trend: "neutral", icon: "Users" }
    ];
  }, [applications, properties.length, tenantById.size]);

  const handleUpdateStatus = async (id, status, extraData = {}) => {
    const res = await AgentQueries.updateApplicationStatus(id, status, extraData);
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

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <Loading message="Loading agent portal…" />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <h2 style={{ color: T.textPrimary }}>Something went wrong</h2>
          <p style={{ color: T.textMuted, marginTop: "0.75rem" }}>{error}</p>
        </div>
      );
    }

    const isAgentVerified = Boolean(profile?.is_verified === true);

    if (!isAgentVerified && ["applications", "properties", "wallet"].includes(activeView)) {
      return (
        <div style={{ textAlign: "center", padding: "5rem 1.5rem", maxWidth: "560px", margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "#f59e0b" }}>
            <Lock size={26} />
          </div>
          <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Verification Required
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Your agent account is currently inactive. Complete your FICA document submission and onboarding interview to access {activeView === 'wallet' ? 'earnings and withdrawals' : `${activeView} and tenant matching`}.
          </p>
          <button
            onClick={() => setActiveView("dashboard")}
            style={{
              padding: "0.65rem 1.5rem",
              background: "linear-gradient(135deg, #4f7ef8 0%, #7c5ef8 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              borderRadius: "0.65rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(79, 126, 248, 0.4)"
            }}
          >
            Go to Dashboard & Apply
          </button>
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <Dashboard 
            agentName={userRow?.full_name?.split(" ")?.[0] || profile?.agency_name || "Agent"} 
            stats={stats} 
            applications={applications} 
            properties={properties} 
            tenantById={tenantById} 
            userRow={userRow}
            profile={profile}
            setActiveView={setActiveView}
            onRefresh={refresh}
            onUpdateStatus={handleUpdateStatus}
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
            onUpdateStatus={handleUpdateStatus}
            loading={loading}
          />
        );
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
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: T.textPrimary }}>{activeView}</h2>
          </div>
        );
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div className="agent-layout-wrapper">
        {!isMobile && <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} profile={userRow} agentProfile={profile} user={user} />}

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
                profile={userRow}
                agentProfile={profile}
                user={user}
              />
            </div>
          </>
        )}

        <main className={`agent-main-content ${isMobile ? 'is-mobile' : ''} ${activeView === 'dashboard' ? 'is-dashboard' : ''} ${activeView === 'wallet' ? 'is-wallet' : ''}`}>
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

