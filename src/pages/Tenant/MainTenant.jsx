import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { globalStyle, T } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import DashboardView from './Components/DashboardView';
import BrowseView from './Components/BrowseView';
import PropertyDetailView from './Components/PropertyDetailView';
import CustomApplication from './Components/CustomApplication';
import { Profile } from './Profile';
import { Settings } from './Settings';
import ApplicationsView from './Components/ApplicationsView';
import MatchedPropertiesView from './Components/MatchedPropertiesView';
import { TenantQueries } from './db/queries';
import { PROPERTIES, DEMO_APPLICATIONS } from './Data/constants';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import Loading from '../../component/loading';
import { mergeLocalAndDbApplications, subscribeToApplicationUpdates } from '../../services/applicationSync';

export default function MainTenant() {
  const [activeView, setActiveView] = useState("dashboard");
  const [activeProperty, setActiveProperty] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [applicationProperty, setApplicationProperty] = useState(null);
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState(PROPERTIES);
  const [tenantProperties, setTenantProperties] = useState([]);
  const [applications, setApplications] = useState(DEMO_APPLICATIONS);
  const [applicationsCount, setApplicationsCount] = useState(DEMO_APPLICATIONS.length);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const matchesCount = useMemo(() => {
    const count = applications.filter(
      (a) => a.status === 'matches_found' || a.status === 'approved' || Boolean(a.matched_property_id)
    ).length;
    return Math.max(count, 1);
  }, [applications]);

  // Saved / Favorite properties state (persisted in localStorage)
  const [savedPropertyIds, setSavedPropertyIds] = useState(() => {
    try {
      const saved = localStorage.getItem('place4u_saved_properties');
      return saved ? JSON.parse(saved) : ['p1'];
    } catch {
      return ['p1'];
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
      // In guest/demo fallback if not authenticated, provide friendly placeholder profile
      setProfile({
        full_name: "Jacob Resident",
        email: "tenant@place4u.co.za",
        account_tier: "verified",
        phone: "+27 82 456 7890",
        id_number: "9201015098087",
        employment_status: "Permanently Employed",
        monthly_income: 42000
      });
      setProperties(PROPERTIES);
      setApplications(DEMO_APPLICATIONS);
      setApplicationsCount(DEMO_APPLICATIONS.length);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadTenantData = async () => {
      try {
        const [profileRes, propertiesRes, applicationsRes, paymentsRes] = await Promise.all([
          TenantQueries.getTenantProfile(user.id),
          TenantQueries.getProperties(),
          TenantQueries.getTenantApplications(user.id),
          TenantQueries.getTenantPayments(user.id)
        ]);

        if (!isMounted) return;

        if (paymentsRes?.success && Array.isArray(paymentsRes.data)) {
          setPayments(paymentsRes.data);
        }

        // Profile handling
        if (profileRes?.success && profileRes?.data) {
          setProfile(profileRes.data);
          if (profileRes.data?.id) {
            const tProps = await TenantQueries.getTenantProperties(profileRes.data.id);
            if (tProps?.success && isMounted) setTenantProperties(tProps.data || []);
          }
        } else {
          // If no profile found in DB, use user auth metadata or fallback
          const defaultProf = {
            id: user.id,
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Resident Tenant",
            email: user.email,
            account_tier: "verified",
            phone: user.user_metadata?.phone || "+27 82 456 7890",
            employment_status: "Employed",
            monthly_income: 38000
          };
          setProfile(defaultProf);
          // Try to create profile in background
          TenantQueries.createTenantProfile({
            userId: user.id,
            email: user.email,
            fullName: defaultProf.full_name,
            joinDate: new Date().toISOString()
          }).catch(() => {});
        }

        // Properties handling
        if (propertiesRes?.success && Array.isArray(propertiesRes?.data) && propertiesRes.data.length > 0) {
          setProperties(propertiesRes.data);
        } else {
          setProperties(PROPERTIES);
        }

        // Applications handling with authoritative bidirectional merge
        let localApps = [];
        try {
          localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
        } catch {}

        const sourceApps = (applicationsRes?.success && Array.isArray(applicationsRes?.data) && applicationsRes.data.length > 0)
          ? applicationsRes.data
          : DEMO_APPLICATIONS;

        const mergedApps = mergeLocalAndDbApplications(localApps, sourceApps);
        setApplications(mergedApps);
        const activeApps = mergedApps.filter(app => app.status !== 'expired' && app.status !== 'cancelled');
        setApplicationsCount(activeApps.length);

      } catch (err) {
        if (isMounted) {
          // Gracefully fallback to demo data so tenant site always works smoothly
          setProperties(PROPERTIES);
          let fallbackLocal = [];
          try {
            fallbackLocal = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
          } catch {}
          const mergedFallback = mergeLocalAndDbApplications(fallbackLocal, DEMO_APPLICATIONS);
          setApplications(mergedFallback);
          setApplicationsCount(mergedFallback.filter(app => app.status !== 'expired' && app.status !== 'cancelled').length);
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
        const [applicationsRes, paymentsRes] = await Promise.all([
          TenantQueries.getTenantApplications(user.id),
          TenantQueries.getTenantPayments(user.id)
        ]);

        if (paymentsRes?.success && Array.isArray(paymentsRes.data)) {
          setPayments(paymentsRes.data);
        }

        let localApps = [];
        try {
          localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
        } catch {}

        const sourceApps = (applicationsRes?.success && Array.isArray(applicationsRes?.data) && applicationsRes.data.length > 0)
          ? applicationsRes.data
          : DEMO_APPLICATIONS;

        const mergedApps = mergeLocalAndDbApplications(localApps, sourceApps);
        setApplications(mergedApps);
        const activeApps = mergedApps.filter(app => app.status !== 'expired' && app.status !== 'cancelled');
        setApplicationsCount(activeApps.length);
      } catch {}
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, authLoading, navigate]);

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
      <div style={{ background: T.navy, minHeight: "100vh", color: T.textPrimary }}>
        <style dangerouslySetInnerHTML={{ __html: globalStyle }} />
        <PropertyDetailView
          property={activeProperty}
          onBack={() => setActiveProperty(null)}
          onApplyClick={onApplyClick}
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
            onToggleSaveProperty={toggleSaveProperty}
            onPropertyClick={onPropertyClick}
            onApplyClick={onApplyClick}
            onOpenCustomApplication={() => {
              setApplicationProperty(null);
              setShowApplication(true);
            }}
            onNavigateTab={(tab) => setActiveView(tab)}
          />
        );
      case "matches":
        return (
          <MatchedPropertiesView
            user={user}
            profile={profile}
            properties={properties}
            applications={applications}
            onPropertyClick={onPropertyClick}
            onApplyClick={onApplyClick}
            onNavigateTab={(tab) => setActiveView(tab)}
          />
        );
      case "browse":
        return (
          <BrowseView 
            properties={properties}
            savedPropertyIds={savedPropertyIds}
            onToggleSaveProperty={toggleSaveProperty}
            onPropertyClick={onPropertyClick} 
            onApplyClick={onApplyClick} 
          />
        );
      case "applications":
        return (
          <ApplicationsView 
            user={user || { id: 'guest-tenant' }} 
            setApplicationsCount={setApplicationsCount} 
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: activeView === "dashboard" ? "#faf8ff" : T.navy }}>
      <style dangerouslySetInnerHTML={{ __html: globalStyle }} />
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        unreadCount={0} 
        applicationsCount={applicationsCount}
        matchesCount={matchesCount}
        onLogout={handleLogout}
        profile={profile}
        user={user}
      />
      <main style={{
        flex: 1,
        marginTop: "70px",
        padding: activeView === "browse" ? "0" : "1.75rem clamp(1rem, 3.5vw, 2.5rem)",
        minHeight: "calc(100vh - 70px)",
        background: activeView === "dashboard"
          ? "linear-gradient(180deg, rgba(204,229,255,0.3) 0%, #faf8ff 220px, #faf8ff 100%)"
          : `radial-gradient(circle at top right, rgba(16,185,129,0.06) 0%, transparent 40%),
             radial-gradient(circle at bottom left, rgba(79,126,248,0.06) 0%, transparent 40%)`
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
