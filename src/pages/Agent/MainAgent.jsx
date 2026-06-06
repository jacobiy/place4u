import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { globalStyle, T } from "./Styles/designTokens";
import "./MainAgent.css";
import { Sidebar } from "./SideBar";
import { Dashboard } from "./Dashboard";
import { Applications } from "./Applications";
import { Properties } from "./Properties";
import { Messages } from "./Messages";
import { Profile } from "./Profile";
import { AgentQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../utils/Supabase";

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

      const appsRes = await AgentQueries.listApplications(80);
      if (!appsRes.success) throw new Error(appsRes.error);
      setApplications(appsRes.data);

      const tenantIds = appsRes.data.map((a) => a.tenant_id).filter(Boolean);
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

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: T.textSecondary }}>Loading agent portal…</p>
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

    switch (activeView) {
      case "dashboard":
        return <Dashboard 
          agentName={userRow?.full_name?.split(" ")?.[0]} 
          stats={stats} 
          applications={applications} 
          properties={properties} 
          tenantById={tenantById} 
          userRow={userRow} 
        />;
      case "applications":
        return (
          <Applications
            applications={applications}
            tenantById={tenantById}
            onRefresh={refresh}
            onUpdateStatus={async (id, status) => {
              const res = await AgentQueries.updateApplicationStatus(id, status);
              if (res.success) setApplications(applications.map((a) => (a.id === id ? res.data : a)));
            }}
            loading={loading}
          />
        );
      case "properties":
        return <Properties properties={properties} onRefresh={refresh} loading={loading} />;
      case "messages":
        return <Messages />;
      case "profile":
        return <Profile userRow={userRow} profile={profile} user={user} onRefresh={refresh} />;
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

        <main className={`agent-main-content ${isMobile ? 'is-mobile' : ''} ${activeView === 'messages' ? 'is-messages' : ''} ${activeView === 'dashboard' ? 'is-dashboard' : ''}`}>
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

