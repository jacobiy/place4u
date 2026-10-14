import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { globalStyle, T } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import DashboardView from './Components/DashboardView';
import PropertyDetailView from './Components/PropertyDetailView';
import CustomApplication from './Components/CustomApplication';
import { Profile } from './Profile';
import { Settings } from './Settings';
import ApplicationsView from './Components/ApplicationsView';
import MatchedPropertiesView from './Components/MatchedPropertiesView';
import MatchPipelineView from '../../component/MatchPipelineView';
import { TenantQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import Loading from '../../component/loading';
import { mergeLocalAndDbApplications, subscribeToApplicationUpdates } from '../../services/applicationSync';
import { listTenantMatches } from '../../services/applicationMatchService';
import { listPipelineMatches, subscribeToMatchPipeline } from '../../services/matchWorkflowService';
import { isActiveApplication } from '../../services/applicationStatus';

export default function MainTenant() {
  const [activeView, setActiveView] = useState("dashboard");
  const [activeProperty, setActiveProperty] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [applicationProperty, setApplicationProperty] = useState(null);
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [tenantMatches, setTenantMatches] = useState([]);
  // Full acceptance pipeline (shipped → ... → move_in_confirmed). Feeds the
  // dashboard's "Live progress" tracker so the tenant sees their real stage.
  const [pipelineMatches, setPipelineMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const matchesCount = useMemo(() => tenantMatches.length, [tenantMatches]);

  // Saved / Favorite properties state (persisted in localStorage)
  const [savedPropertyIds, setSavedPropertyIds] = useState(() => {
    try {
      const saved = localStorage.getItem('place4u_saved_properties');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const toggleSaveProperty = (propId) => {
    setSavedPropertyIds((prev) => {
      const updated = prev.includes(propId)
        ? prev.filter((id) => id !== propId)
        : [...prev, propId];
      try {
        localStorage.setItem('place4u_saved_properties', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Not authenticated: show empty state (no demo data).
      setProfile(null);
      setProperties([]);
      setApplications([]);
      setApplicationsCount(0);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadTenantData = async () => {
      try {
        const [profileRes, propertiesRes, applicationsRes, paymentsRes, shippedRes, pipelineRes] = await Promise.all([
          TenantQueries.getTenantProfile(user.id),
          TenantQueries.getProperties(),
          TenantQueries.getTenantApplications(user.id),
          TenantQueries.getTenantPayments(user.id),
          listTenantMatches(),
          listPipelineMatches()
        ]);

        if (!isMounted) return;

        if (shippedRes?.success && Array.isArray(shippedRes.data)) {
          setTenantMatches(shippedRes.data);
        }

        if (pipelineRes?.success && Array.isArray(pipelineRes.data)) {
          setPipelineMatches(pipelineRes.data);
        }

        if (paymentsRes?.success && Array.isArray(paymentsRes.data)) {
          setPayments(paymentsRes.data);
        }

        // Profile handling
        if (profileRes?.success && profileRes?.data) {
          setProfile(profileRes.data);
        } else {
          // If no profile found in DB, build a bare default and persist a row so
          // we have a real tenant_profiles.id to write future edits against.
          // Nothing is invented here: the tenant fills in the rest from Profile.
          const defaultProf = {
            id: null,
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Resident Tenant",
            email: user.email,
            account_tier: "basic",
            phone: user.user_metadata?.phone || "",
            employment_status: "",
            monthly_income: null
          };

          try {
            const created = await TenantQueries.createTenantProfile({
              userId: user.id,
              email: user.email,
              fullName: defaultProf.full_name,
              phone: defaultProf.phone,
              joinDate: new Date().toISOString()
            });
            if (isMounted) {
              setProfile(
                created?.success && created.data
                  ? { ...defaultProf, ...created.data }
                  : defaultProf
              );
            }
          } catch {
            if (isMounted) setProfile(defaultProf);
          }
        }

        // Properties handling
        if (propertiesRes?.success && Array.isArray(propertiesRes?.data)) {
          setProperties(propertiesRes.data);
        } else {
          setProperties([]);
        }

        // Applications handling with authoritative bidirectional merge
        let localApps = [];
        try {
          localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
        } catch {}

        const sourceApps = (applicationsRes?.success && Array.isArray(applicationsRes?.data))
          ? applicationsRes.data
          : [];

        const mergedApps = mergeLocalAndDbApplications(localApps, sourceApps, user.id);
        setApplications(mergedApps);
        const activeApps = mergedApps.filter(isActiveApplication);
        setApplicationsCount(activeApps.length);

      } catch (err) {
        if (isMounted) {
          // No demo fallback: surface only locally-cached applications (if any).
          setProperties([]);
          let fallbackLocal = [];
          try {
            fallbackLocal = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
          } catch {}
          const mergedFallback = mergeLocalAndDbApplications(fallbackLocal, [], user?.id);
          setApplications(mergedFallback);
          setApplicationsCount(mergedFallback.filter(isActiveApplication).length);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTenantData();

    // Listen for live application updates (fee payments, approvals, agent assignments)
    const unsubscribe = subscribeToApplicationUpdates(async () => {
      if (!isMounted || !user) return;
      try {
        const [applicationsRes, paymentsRes, shippedRes, pipelineRes] = await Promise.all([
          TenantQueries.getTenantApplications(user.id),
          TenantQueries.getTenantPayments(user.id),
          listTenantMatches(),
          listPipelineMatches()
        ]);

        if (shippedRes?.success && Array.isArray(shippedRes.data)) {
          setTenantMatches(shippedRes.data);
        }

        if (pipelineRes?.success && Array.isArray(pipelineRes.data)) {
          setPipelineMatches(pipelineRes.data);
        }

        if (paymentsRes?.success && Array.isArray(paymentsRes.data)) {
          setPayments(paymentsRes.data);
        }

        let localApps = [];
        try {
          localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
        } catch {}

        const sourceApps = (applicationsRes?.success && Array.isArray(applicationsRes?.data))
          ? applicationsRes.data
          : [];

        const mergedApps = mergeLocalAndDbApplications(localApps, sourceApps, user.id);
        setApplications(mergedApps);
        const activeApps = mergedApps.filter(isActiveApplication);
        setApplicationsCount(activeApps.length);
      } catch {}
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, authLoading, navigate]);

  // Live-refresh the acceptance pipeline so the dashboard tracker advances the
  // moment any party (tenant / agent / landlord / admin) moves the match.
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const refreshPipeline = async () => {
      const res = await listPipelineMatches();
      if (isMounted && res?.success && Array.isArray(res.data)) {
        setPipelineMatches(res.data);
      }
    };
    const unsubscribePipeline = subscribeToMatchPipeline(refreshPipeline);
    return () => {
      isMounted = false;
      unsubscribePipeline();
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  const onPropertyClick = (property) => {
    setActiveProperty(property);
  };

  const onApplyClick = (property) => {
    setApplicationProperty(property ?? null);
    setShowApplication(true);
  };

  const handleApplicationSuccess = (newApp) => {
    if (newApp) {
      setApplications((prev) => [newApp, ...prev.filter(a => a.id !== newApp.id)]);
      setApplicationsCount((prev) => prev + 1);
      if (user?.id) {
        TenantQueries.getTenantPayments(user.id).then(res => {
          if (res?.success && Array.isArray(res.data)) setPayments(res.data);
        }).catch(() => {});
      }
    }
    setShowApplication(false);
    setApplicationProperty(null);
  };

  // If viewing a single property, take over screen
  if (activeProperty) {
    return (
      <div className="w-full min-h-screen bg-[#faf8ff]">
        <PropertyDetailView
          property={activeProperty}
          onBack={() => setActiveProperty(null)}
          onApplyClick={onApplyClick}
          onSelectProperty={setActiveProperty}
        />
        {showApplication && (
          <CustomApplication
            property={applicationProperty ?? activeProperty}
            user={user}
            profile={profile}
            onSuccess={handleApplicationSuccess}
            onCancel={() => {
              setShowApplication(false);
              setApplicationProperty(null);
            }}
          />
        )}
      </div>
    );
  }

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
          <Loading message="Preparing tenant portal…" />
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <DashboardView
            profile={profile}
            user={user}
            properties={properties}
            applications={applications}
            payments={payments}
            savedPropertyIds={savedPropertyIds}
            pipelineMatches={pipelineMatches}
            onToggleSaveProperty={toggleSaveProperty}
            onPropertyClick={onPropertyClick}
            onApplyClick={onApplyClick}
            onOpenCustomApplication={() => {
              setApplicationProperty(null);
              setShowApplication(true);
            }}
            onNavigateTab={(tab) => setActiveView(tab === 'browse' ? 'dashboard' : tab)}
          />
        );
      case "matches":
        return (
          <MatchedPropertiesView
            user={user}
            profile={profile}
            properties={properties}
            applications={applications}
            matches={tenantMatches}
            onPropertyClick={onPropertyClick}
            onApplyClick={onApplyClick}
            onNavigateTab={(tab) => setActiveView(tab)}
          />
        );
      case "pipeline":
        return <MatchPipelineView role="tenant" currentUserId={user?.id} />;
      case "applications":
        return (
          <ApplicationsView 
            user={user || { id: 'guest-tenant' }} 
            setApplicationsCount={setApplicationsCount} 
            properties={properties}
            onViewProperty={onPropertyClick}
            onOpenCustomApplication={() => {
              setApplicationProperty(null);
              setShowApplication(true);
            }}
          />
        );
      case "profile":
        return <Profile profile={profile} user={user} />;
      case "settings":
        return <Settings profile={profile} />;
      default:
        return (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: T.textPrimary }}>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2>
            <p style={{ color: T.textMuted, marginTop: "1rem" }}>Under construction</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#faf8ff" }}>
      <style dangerouslySetInnerHTML={{ __html: globalStyle }} />
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        applicationsCount={applicationsCount}
        matchesCount={matchesCount}
        onLogout={handleLogout}
        profile={profile}
        user={user}
      />
      <main style={{
        flex: 1,
        marginTop: "70px",
        padding: "1.75rem clamp(1rem, 3.5vw, 2.5rem)",
        minHeight: "calc(100vh - 70px)",
        background: "linear-gradient(180deg, rgba(204,229,255,0.3) 0%, #faf8ff 220px, #faf8ff 100%)"
      }}>
        {renderContent()}

        {showApplication && (
          <CustomApplication
            property={applicationProperty}
            profile={profile}
            user={user}
            onSuccess={handleApplicationSuccess}
            onCancel={() => {
              setShowApplication(false);
              setApplicationProperty(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
