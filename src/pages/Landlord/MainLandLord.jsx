import { useMemo, useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { globalStyle, T } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import { Dashboard } from './Dashboard';
import { MyProperties } from './MyProperties';
import { Messages } from './Messages';
import { Profile } from './Profile';
import { AddPropertyModal } from './Component/AddPropertyModal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';

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
  const image = row?.image_url || row?.image || placeholderImage;

  return {
    ...row,
    id: row?.id,
    name,
    location,
    rent: row?.rent || (row?.price ? `${formatZar(row.price)}/mo` : "—"),
    image,
    bedrooms: row?.bedrooms ?? row?.beds ?? 0,
    bathrooms: row?.bathrooms ?? row?.baths ?? 0,
    size: row?.size || "—",
    occupied,
    tenants: row?.tenants || []
  };
};

export default function MainLandlord() {
  const [activeView, setActiveView] = useState("dashboard");
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
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
      let imageUrl = null;
      if (payload.imageFile) {
        const upload = await LandlordQueries.uploadPropertyImage(user.id, payload.imageFile);
        if (upload.success) imageUrl = upload.url;
      }

      const { imageFile, ...rest } = payload;
      const create = await LandlordQueries.createProperty(user.id, {
        ...rest,
        ...(imageUrl ? { image_url: imageUrl } : {})
      });

      if (!create.success) throw new Error(create.error || "Failed to create property.");
      setProperties([normalizeProperty(create.data), ...properties]);
      setIsAddPropertyOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to create property.");
    } finally {
      setIsCreatingProperty(false);
    }
  };

  const handleEditProperty = async (updatedProperty) => {
    if (!updatedProperty?.id) return;
    const result = await LandlordQueries.updateProperty(updatedProperty.id, updatedProperty);
    if (!result.success) return;

    setProperties(properties.map(p => (p.id === updatedProperty.id ? normalizeProperty(result.data) : p)));
  };

  const handleViewDetails = (property) => {
    console.log("View details:", property);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  };

  const portfolioStats = useMemo(() => {
    const totalProperties = properties.length;
    const occupied = properties.filter(p => p.occupied).length;
    const occupancyRate = totalProperties ? Math.round((occupied / totalProperties) * 100) : 0;

    // Best-effort: sum numeric prices for occupied properties
    const monthlyIncome = properties.reduce((sum, p) => {
      const price = p?.price;
      if (!p.occupied) return sum;
      if (price === null || price === undefined || Number.isNaN(Number(price))) return sum;
      return sum + Number(price);
    }, 0);

    return [
      { label: "Monthly Income", value: formatZar(monthlyIncome), change: "—", trend: "neutral", icon: "DollarSign" },
      { label: "Occupancy Rate", value: `${occupancyRate}%`, change: "—", trend: "neutral", icon: "Home" },
      { label: "Total Properties", value: `${totalProperties}`, change: "—", trend: "neutral", icon: "Building" },
      { label: "Active Tenants", value: `${profile?.total_tenants || 0}`, change: "—", trend: "neutral", icon: "Users" }
    ];
  }, [properties, profile?.total_tenants]);

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: T.textSecondary }}>Loading landlord portal…</p>
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
      case "dashboard":
        return <Dashboard profile={profile} stats={portfolioStats} />;
      case "profile":
        return <Profile />;
      case "properties":
        return (
          <MyProperties 
            properties={properties}
            stats={portfolioStats}
            onAddProperty={handleAddProperty}
            onEditProperty={handleEditProperty}
            onViewDetails={handleViewDetails}
          />
        );
      case "messages":
        return <Messages landlordProfile={profile} />;
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
      
      <div style={{ display: "flex", minHeight: "100vh" }}>
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
          marginLeft: isMobile ? 0 : "260px",
          padding: "2rem 1.5rem",
          width: isMobile ? "100%" : `calc(100% - 260px)`,
          minHeight: "100vh"
        }}>
          {/* Mobile Top Bar */}
          {isMobile && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              paddingBottom: "1rem",
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
