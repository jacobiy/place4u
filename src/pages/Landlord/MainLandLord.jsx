import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { globalStyle, T } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import { Dashboard } from './Dashboard';
import { MyProperties } from './MyProperties';
import { Documents } from './Documents';
import { Profile } from './Profile';
import { Settings } from './Settings';
import { Tenants } from './Tenants';
import { AddPropertyModal } from './Component/AddPropertyModal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import Loading from '../../component/loading';

const placeholderImage =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60";

const formatZar = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "—";
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch {
    return `R${Number(amount)}`;
  }
};

const normalizeProperty = (row) => {
  const occupied = typeof row?.occupied === "boolean" ? row.occupied : false;

  const address = row?.address || "";
  const area = row?.area || "";
  const name =
    row?.name ||
    (row?.property_type ? `${row.property_type}${area ? ` · ${area}` : ""}` : area) ||
    (address ? address : "Property");

  const location = [area, row?.city].filter(Boolean).join(", ");
  
  const hasImageUrls = Array.isArray(row?.image_urls) && row.image_urls.length > 0;
  const image = hasImageUrls ? row.image_urls[0] : (row?.image_url || row?.image || placeholderImage);

  return {
    ...row,
    id: row?.id,
    name,
    location,
    rent: row?.rent || (row?.price ? `${formatZar(row.price)}/mo` : "—"),
    image,
    image_urls: row?.image_urls || (row?.image_url ? [row.image_url] : []),
    bedrooms: row?.bedrooms ?? row?.beds ?? 0,
    bathrooms: row?.bathrooms ?? row?.baths ?? 0,
    size: row?.size || "—",
    occupied,
    tenants: row?.tenants || []
  };
};

export default function MainLandlord() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard");
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const unreadCount = 0;
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const ensureProfile = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        setError("You must be logged in to access the landlord portal.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Load landlord profile (create if missing)
        const result = await LandlordQueries.getLandlordProfile(user.id);
        let landlordProfile = result.success ? result.data : null;

        if (!landlordProfile) {
          const { data: userRow } = await supabase
            .from("users")
            .select("full_name, email, phone")
            .eq("id", user.id)
            .maybeSingle();

          const createResult = await LandlordQueries.createLandlordProfile({
            userId: user.id,
            email: userRow?.email || user.email,
            fullName: userRow?.full_name || user.user_metadata?.full_name || null,
            phone: userRow?.phone || null
          });

          if (createResult.success) landlordProfile = createResult.data;
        }

        if (!cancelled) setProfile(landlordProfile);

        // Load properties
        if (user?.id) {
          const propsResult = await LandlordQueries.getLandlordProperties(user.id);
          const rows = propsResult.success ? propsResult.data : [];
          if (!cancelled) setProperties(rows.map(normalizeProperty));
        } else {
          if (!cancelled) setProperties([]);
        }

        // Fetch activity logs
        if (landlordProfile) {
          const logsResult = await LandlordQueries.getActivityLog(landlordProfile.id, 5);
          if (!cancelled && logsResult.success) {
            setActivities(logsResult.data || []);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load landlord data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    ensureProfile();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const handleAddProperty = () => setIsAddPropertyOpen(true);

  const handleCreateProperty = async (payload) => {
    if (!user?.id) return;

    setIsCreatingProperty(true);
    try {
      let imageUrls = [];
      if (payload.imageFiles && payload.imageFiles.length > 0) {
        const uploadPromises = payload.imageFiles.map(file => LandlordQueries.uploadPropertyImage(user.id, file));
        const results = await Promise.all(uploadPromises);
        imageUrls = results.filter(r => r.success).map(r => r.url);
      }

      const { imageFiles, ...rest } = payload;
      const propertyData = {
        ...rest,
        image_urls: imageUrls
      };
      
      const create = await LandlordQueries.createProperty(user.id, propertyData);

      if (!create.success) throw new Error(create.error || "Failed to create property.");
      setProperties([normalizeProperty(create.data), ...properties]);
      setIsAddPropertyOpen(false);

      if (profile?.id) {
        await LandlordQueries.logActivity(
          profile.id,
          "property_created",
          `Created property: ${payload.name || propertyData.property_type || "New Property"}`
        );
        const logsResult = await LandlordQueries.getActivityLog(profile.id, 5);
        if (logsResult.success) setActivities(logsResult.data || []);
      }
    } catch (e) {
      setError(e?.message || "Failed to create property.");
    } finally {
      setIsCreatingProperty(false);
    }
  };

  const handleEditProperty = async (updatedProperty) => {
    if (!updatedProperty?.id) return;
    
    // Filter out computed properties before saving
    const { id, name, location, rent, image, tenants, occupied, ...validDbFields } = updatedProperty;
    
    const result = await LandlordQueries.updateProperty(id, validDbFields);
    if (!result.success) {
      setError(result.error || "Failed to update property.");
      return;
    }

    setProperties(properties.map(p => (p.id === id ? normalizeProperty(result.data) : p)));

    if (profile?.id) {
      await LandlordQueries.logActivity(
        profile.id,
        "property_updated",
        `Updated property: ${updatedProperty.name || "Property details"}`
      );
      const logsResult = await LandlordQueries.getActivityLog(profile.id, 5);
      if (logsResult.success) setActivities(logsResult.data || []);
    }
  };

  const handleViewDetails = (property) => {
    console.log("View details:", property);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      // ignore
    }
  };

  const portfolioStats = useMemo(() => {
    const totalProperties = properties.length;
    const occupied = properties.filter(p => p.occupied).length;
    const vacant = totalProperties - occupied;
    const occupancyRate = totalProperties ? Math.round((occupied / totalProperties) * 100) : 0;

    return [
      { label: "Total Properties", value: `${totalProperties}`, change: "—", trend: "neutral", icon: "Building" },
      { label: "Occupied Properties", value: `${occupied}`, change: "—", trend: "neutral", icon: "Home" },
      { label: "Vacant Properties", value: `${vacant}`, change: "—", trend: "neutral", icon: "Key" },
      { label: "Occupancy Rate", value: `${occupancyRate}%`, change: "—", trend: "neutral", icon: "Percent" }
    ];
  }, [properties]);

  const propertyDistribution = useMemo(() => {
    if (properties.length === 0) return [];
    const counts = {};
    properties.forEach(p => {
      let type = p.property_type || "Other";
      type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      counts[type] = (counts[type] || 0) + 1;
    });

    const colors = [T.accent, T.emerald, T.amber, "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#10B981"];
    return Object.entries(counts).map(([name, count], index) => {
      const percentage = Math.round((count / properties.length) * 100);
      return {
        name,
        value: percentage,
        count,
        color: colors[index % colors.length]
      };
    });
  }, [properties]);

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <Loading message="Loading landlord portal…" />
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

    const isLandlordApproved = String(profile?.application_status || "").toLowerCase() === "approved" && profile?.account_status !== "suspended";
    const isRejected = String(profile?.application_status || "").toLowerCase() === "rejected" || profile?.account_status === "suspended";

    if (!isLandlordApproved && ["properties", "tenants"].includes(activeView)) {
      return (
        <div style={{
          textAlign: "center",
          padding: "5rem 1.5rem",
          maxWidth: "560px",
          margin: "0 auto",
          animation: "fadeIn 0.25s ease-in-out"
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isRejected ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
            border: `1px solid ${isRejected ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            color: isRejected ? "#ef4444" : "#f59e0b"
          }}>
            <Lock size={26} />
          </div>
          <h2 style={{ color: T.textPrimary, fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {isRejected ? "Accreditation Suspended — Revision Required" : "Landlord Accreditation Required"}
          </h2>
          <p style={{ color: T.textMuted, fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {isRejected
              ? `Your landlord application requires revision (${profile?.rejection_reason || "submitted documents could not be validated"}). Access to ${activeView === "properties" ? "property listings" : "tenant management"} is locked until your revised documents are approved.`
              : `Your landlord profile is currently unverified. Submit your proof of property ownership and identification dossier on the dashboard to unlock ${activeView === "properties" ? "property uploading and listing management" : "tenant applications and lease management"}.`}
          </p>
          <button
            onClick={() => setActiveView("dashboard")}
            style={{
              padding: "0.65rem 1.75rem",
              background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              borderRadius: "0.65rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(79, 126, 248, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{isRejected ? "Return to Dashboard to Resubmit" : "Return to Dashboard to Apply"}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      );
    }

    switch(activeView) {
      case "dashboard":
        return (
          <Dashboard 
            profile={profile}
            user={user}
            onRefresh={async (updatedProfile) => {
              if (updatedProfile) {
                setProfile(prev => ({ ...(prev || {}), ...updatedProfile }));
              }
              if (user?.id) {
                const res = await LandlordQueries.getLandlordProfile(user.id);
                if (res.success && res.data) setProfile(res.data);
              }
            }}
            stats={portfolioStats} 
            activities={activities} 
            propertyDistribution={propertyDistribution} 
            properties={properties}
            onAddProperty={handleAddProperty}
            onEditProperty={handleEditProperty}
            onViewDetails={handleViewDetails}
            onNavigate={setActiveView}
          />
        );
      case "profile":
        return <Profile />;
      case "settings":
        return <Settings />;
      case "tenants":
        return <Tenants profile={profile} properties={properties} user={user} onNavigate={setActiveView} />;
      case "documents":
        return (
          <Documents 
            profile={profile} 
            properties={properties} 
            user={user}
            onProfileUpdate={(updated) => setProfile(updated)} 
          />
        );
      case "properties":
        return (
          <MyProperties 
            properties={properties}
            stats={portfolioStats}
            activities={activities}
            onAddProperty={handleAddProperty}
            onEditProperty={handleEditProperty}
            onViewDetails={handleViewDetails}
            onNavigate={setActiveView}
          />
        );
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
    <>
      <style>{globalStyle}</style>

      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onCreate={handleCreateProperty}
        isCreating={isCreatingProperty}
      />
      
      <div style={{ display: "flex", minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
        {/* Sidebar - Fixed on desktop, modal on mobile */}
        {!isMobile && (
          <Sidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            unreadCount={unreadCount}
            onLogout={handleLogout}
            profile={profile}
            user={user}
          />
        )}

        {/* Mobile Sidebar Modal */}
        {isMobile && isMobileMenuOpen && (
          <>
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 98,
                animation: "fadeIn 0.2s ease-in-out"
              }}
            />
            <div style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 99,
              animation: "slideIn 0.3s ease-in-out"
            }}>
              <Sidebar 
                activeView={activeView}
                setActiveView={(view) => {
                  setActiveView(view);
                  setIsMobileMenuOpen(false);
                }}
                unreadCount={unreadCount}
                onLogout={handleLogout}
                profile={profile}
                user={user}
              />
            </div>
          </>
        )}

        {/* Main Content - With left margin on desktop to account for fixed sidebar */}
        <main style={{
          flex: 1,
          minWidth: 0,
          maxWidth: isMobile ? "100%" : `calc(100% - 260px)`,
          width: isMobile ? "100%" : `calc(100% - 260px)`,
          marginLeft: isMobile ? 0 : "260px",
          padding: isMobile ? "1rem 0.75rem" : "2rem 1.5rem",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden"
        }}>
          {/* Mobile Top Bar */}
          {isMobile && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              padding: "0 0 1rem",
              borderBottom: `1px solid ${T.border}`
            }}>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  padding: "8px",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Menu size={20} color={T.textSecondary} />
              </button>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#fff"
                }}>{(profile?.full_name || user?.email || "JD").slice(0, 2).toUpperCase()}</div>
              </div>
            </div>
          )}
          
          {renderContent()}
        </main>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
