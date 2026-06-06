import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { globalStyle, T } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import BrowseView from './Components/BrowseView';
import MessagesView from './Components/MessagesView';
import PropertyDetailView from './Components/PropertyDetailView';
import CustomApplication from './Components/CustomApplication';
import { Profile } from './Profile';
import { Settings } from './Settings';
import ApplicationsView from './Components/ApplicationsView';
import { TenantQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';

export default function MainTenant() {
  const [activeView, setActiveView] = useState("browse");
  const [activeProperty, setActiveProperty] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [applicationProperty, setApplicationProperty] = useState(null);
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenantProperties, setTenantProperties] = useState([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Inject global body styles
    Object.assign(document.body.style, globalStyle.body);
    return () => {
      document.body.style = "";
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    let isMounted = true;
    
    const loadTenantData = async () => {
      try {
        const [profileRes, propertiesRes, applicationsRes] = await Promise.all([
          TenantQueries.getTenantProfile(user.id),
          TenantQueries.getProperties(),
          TenantQueries.getTenantApplications(user.id)
        ]);

        if (!isMounted) return;

        if (profileRes.success) {
          let currentProfile = profileRes.data;

          // If no profile exists, automatically create one
          if (!currentProfile) {
            const createRes = await TenantQueries.createTenantProfile({
              userId: user.id,
              email: user.email,
              fullName: user.user_metadata?.full_name || "New Tenant",
              joinDate: new Date().toISOString()
            });
            if (createRes.success) {
              currentProfile = createRes.data;
            }
          }

          setProfile(currentProfile);
          
          if (currentProfile?.id) {
            const tProps = await TenantQueries.getTenantProperties(currentProfile.id);
            if (tProps.success) setTenantProperties(tProps.data || []);
          }
        }

        if (propertiesRes.success) {
          setProperties(propertiesRes.data || []);
        }

        if (applicationsRes.success) {
          const activeApps = applicationsRes.data.filter(app => app.status !== 'expired' && app.status !== 'cancelled');
          setApplicationsCount(activeApps.length);
        }

      } catch (err) {
        if (isMounted) setError("Failed to load portal data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTenantData();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch {
      // ignore
    }
  };

  const onPropertyClick = (property) => {
    setActiveProperty(property);
  };

  const onApplyClick = (property) => {
    setApplicationProperty(property ?? null);
    setShowApplication(true);
  };

  // If viewing a single property, take over screen
  if (activeProperty) {
    return (
      <div style={{ background: T.navy, minHeight: "100vh", color: T.textPrimary }}>
        <PropertyDetailView
          property={activeProperty}
          onBack={() => setActiveProperty(null)}
          onApplyClick={onApplyClick}
        />
        {showApplication && (
          <CustomApplication
            property={applicationProperty ?? activeProperty}
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
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: T.textSecondary }}>Loading tenant portal…</p>
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

    switch(activeView) {
      case "browse":
        return (
          <BrowseView 
            properties={properties}
            onPropertyClick={onPropertyClick} 
            onApplyClick={onApplyClick} 
          />
        );
      case "applications":
        return (
          <ApplicationsView 
            user={user} 
            setApplicationsCount={setApplicationsCount} 
            onOpenCustomApplication={() => {
              setApplicationProperty(null);
              setShowApplication(true);
            }}
          />
        );
      case "messages":
        return <MessagesView profile={profile} />;
      case "profile":
        return <Profile profile={profile} user={user} />;
      case "settings":
        return <Settings profile={profile} />;
      default:
        return (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: T.textPrimary }}>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2>
            <p style={{ color: T.textMuted, marginTop: "1rem" }}>Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        unreadCount={0} 
        applicationsCount={applicationsCount}
        onLogout={handleLogout}
        profile={profile}
        user={user}
      />
      <main style={{
        flex: 1,
        marginTop: "70px",
        padding: activeView === "browse" ? "0" : "2rem 3rem",
        height: "100vh",
        overflowY: "auto",
        background: `radial-gradient(circle at top right, rgba(16,185,129,0.05) 0%, transparent 40%),
                     radial-gradient(circle at bottom left, rgba(79,126,248,0.05) 0%, transparent 40%)`
      }}>
        {renderContent()}

        {showApplication && (
          <CustomApplication
            property={applicationProperty}
            profile={profile}
            user={user}
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
