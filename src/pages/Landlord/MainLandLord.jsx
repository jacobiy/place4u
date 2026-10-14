import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Lock, ArrowRight, Plus } from "lucide-react";
import { globalStyle, T, SERIF } from './Styles/designTokens';
import { Sidebar } from './SideBar';
import { Dashboard } from './Dashboard';
import { MyProperties } from './MyProperties';
import { Documents } from './Documents';
import { Profile } from './Profile';
import { Settings } from './Settings';
import { Tenants } from './Tenants';
import { AddPropertyModal } from './Component/AddPropertyModal';
import MatchPipelineView from '../../component/MatchPipelineView';
import { PrimaryBtn } from './Component/Buttons';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import Loading from '../../component/loading';

const placeholderImage =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60";

const formatZar = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "—";
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `R${Number(amount)}`;
  }
};

const normalizeProperty = (row) => {
  const occupied = typeof row?.occupied === "boolean" ? row.occupied : false;
  const address = row?.address || "";
  const area = row?.area || "";
  const name = row?.name || (row?.property_type ? `${row.property_type}${area ? ` · ${area}` : ""}` : area) || (address ? address : "Property");
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
    tenants: row?.tenants || [],
    // Listing approval lifecycle (draft -> pending_approval -> approved/rejected).
    // Rows created before the migration have no column, so they default to approved.
    approval_status: row?.approval_status || "approved",
    approval_notes: row?.approval_notes || null,
    submitted_at: row?.submitted_at || null,
    reviewed_at: row?.reviewed_at || null,
    documents: Array.isArray(row?.documents) ? row.documents : []
  };
};

const VIEW_META = {
  dashboard: { title: "Dashboard", subtitle: "Portfolio performance & today's operations" },
  properties: { title: "My Properties", subtitle: "Your listings, units and occupancy" },
  tenants: { title: "Tenants & Applications", subtitle: "Residents, leases and screening" },
  pipeline: { title: "Applicant Pipeline", subtitle: "Accepted matches awaiting your review" },
  documents: { title: "Documents", subtitle: "Verification vault & proof of ownership" },
  profile: { title: "Profile", subtitle: "Your landlord identity and credentials" },
  settings: { title: "Settings", subtitle: "Security and notification preferences" },
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
        const result = await LandlordQueries.getLandlordProfile(user.id);
        let landlordProfile = result.success ? result.data : null;
        // A synthesized profile means no landlord_profiles row exists yet, so we
        // must create the real row before any write (application, documents) can land.
        if (landlordProfile?.is_synthetic) landlordProfile = null;

        if (!landlordProfile) {
          const { data: userRow } = await supabase.from("users").select("full_name, email, phone").eq("id", user.id).maybeSingle();
          const createResult = await LandlordQueries.createLandlordProfile({
            userId: user.id,
            email: userRow?.email || user.email,
            fullName: userRow?.full_name || user.user_metadata?.full_name || null,
            phone: userRow?.phone || null
          });
          if (createResult.success) landlordProfile = createResult.data;
        }

        if (!cancelled) setProfile(landlordProfile);

        if (user?.id) {
          const propsResult = await LandlordQueries.getLandlordProperties(user.id);
          const rows = propsResult.success ? propsResult.data : [];
          if (!cancelled) setProperties(rows.map(normalizeProperty));
        } else if (!cancelled) {
          setProperties([]);
        }

        if (landlordProfile) {
          const logsResult = await LandlordQueries.getActivityLog(landlordProfile.id, 5);
          if (!cancelled && logsResult.success) setActivities(logsResult.data || []);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load landlord data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    ensureProfile();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const handleAddProperty = () => setIsAddPropertyOpen(true);

  const refreshActivities = async () => {
    if (!profile?.id) return;
    const logsResult = await LandlordQueries.getActivityLog(profile.id, 5);
    if (logsResult.success) setActivities(logsResult.data || []);
  };

  const handleCreateProperty = async (payload) => {
    if (!user?.id) return;
    setIsCreatingProperty(true);
    try {
      let imageUrls = [];
      if (payload.imageFiles && payload.imageFiles.length > 0) {
        const results = await Promise.all(payload.imageFiles.map((file) => LandlordQueries.uploadPropertyImage(user.id, file)));
        imageUrls = results.filter((r) => r.success).map((r) => r.url);
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          console.warn(`Uploaded ${imageUrls.length} of ${results.length} property photos.`, failed.map((f) => f.error));
        }
      }

      const { imageFiles, documentFiles, submitForApproval, ...rest } = payload;

      // Listings are gated: they are never live until an admin approves them.
      const create = await LandlordQueries.createProperty(user.id, {
        ...rest,
        image_urls: imageUrls,
        approval_status: submitForApproval ? "pending_approval" : "draft",
        submitted_at: submitForApproval ? new Date().toISOString() : null,
        is_active: false
      });
      if (!create.success) throw new Error(create.error || "Failed to create property.");

      const newId = create.data?.id;

      // Attach the required proof-of-ownership documents to the new listing.
      let created = create.data;
      if (newId && documentFiles && documentFiles.length > 0) {
        let attached = 0;
        for (const entry of documentFiles) {
          const file = entry?.file || entry;
          const documentType = entry?.documentType || "ownership";
          const upload = await LandlordQueries.uploadPropertyDocument(newId, file);
          if (!upload.success) {
            console.warn("Property document upload failed:", upload.error);
            continue;
          }
          const attachedRes = await LandlordQueries.addPropertyDocument(newId, {
            title: entry?.title || file?.name || "Property document",
            documentType,
            fileName: upload.fileName,
            fileUrl: upload.url,
            storagePath: upload.storagePath,
            bucket: upload.bucket,
            fileSize: upload.fileSize,
            fileType: upload.fileType
          });
          if (attachedRes.success) {
            attached += 1;
            created = attachedRes.data;
          }
        }
        if (attached < documentFiles.length) {
          console.warn(`Attached ${attached} of ${documentFiles.length} property documents.`);
        }
      }

      setProperties((prev) => [normalizeProperty(created), ...prev]);
      setIsAddPropertyOpen(false);

      if (profile?.id) {
        await LandlordQueries.logActivity(
          profile.id,
          submitForApproval ? "property_submitted" : "property_created",
          submitForApproval
            ? `Submitted for approval: ${payload.name || rest.property_type || "New Property"}`
            : `Saved draft property: ${payload.name || rest.property_type || "New Property"}`
        );
        await refreshActivities();
      }
    } catch (e) {
      setError(e?.message || "Failed to create property.");
    } finally {
      setIsCreatingProperty(false);
    }
  };

  const logPropertySubmitted = async (property) => {
    if (!profile?.id) return;
    await LandlordQueries.logActivity(
      profile.id,
      "property_submitted",
      `Submitted for approval: ${property?.name || property?.address || "Property"}`
    );
    await refreshActivities();
  };

  const handleSubmitForApproval = async (property) => {
    if (!property?.id) return;
    const res = await LandlordQueries.submitPropertyForApproval(property.id);
    if (!res.success) {
      setError(res.error || "Failed to submit property for approval.");
      return;
    }
    setProperties((prev) => prev.map((p) => (p.id === property.id ? normalizeProperty(res.data) : p)));
    await logPropertySubmitted(property);
  };

  // Used when the submit already ran inside the documents modal: just refresh + log.
  const handlePropertySubmitted = async (property) => {
    await handlePropertyDocumentsChanged();
    await logPropertySubmitted(property);
  };

  // Called after documents are added/removed on a listing so the card badges update.
  const handlePropertyDocumentsChanged = async () => {
    if (!user?.id) return;
    const propsResult = await LandlordQueries.getLandlordProperties(user.id);
    if (propsResult.success) setProperties((propsResult.data || []).map(normalizeProperty));
  };

  const handleEditProperty = async (updatedProperty) => {
    if (!updatedProperty?.id) return false;
    // Keep persisted columns (including `occupied`); drop only derived display fields.
    const { id, name, location, rent, image, ...validDbFields } = updatedProperty;

    const result = await LandlordQueries.updateProperty(id, validDbFields);
    if (!result.success) { setError(result.error || "Failed to update property."); return false; }

    setProperties((prev) => prev.map((p) => (p.id === id ? normalizeProperty(result.data) : p)));

    if (profile?.id) {
      await LandlordQueries.logActivity(profile.id, "property_updated", `Updated property: ${updatedProperty.name || "Property details"}`);
      await refreshActivities();
    }
    return true;
  };

  const handleLogout = async () => {
    try { await signOut(); navigate("/"); } catch { /* ignore */ }
  };

  const portfolioStats = useMemo(() => {
    const totalProperties = properties.length;
    const occupied = properties.filter((p) => p.occupied).length;
    const vacant = totalProperties - occupied;
    const occupancyRate = totalProperties ? Math.round((occupied / totalProperties) * 100) : 0;
    return [
      { label: "Total Properties", value: `${totalProperties}`, icon: "Building" },
      { label: "Occupied Properties", value: `${occupied}`, icon: "Home" },
      { label: "Vacant Properties", value: `${vacant}`, icon: "Key" },
      { label: "Occupancy Rate", value: `${occupancyRate}%`, icon: "Percent" }
    ];
  }, [properties]);

  const propertyDistribution = useMemo(() => {
    if (properties.length === 0) return [];
    const counts = {};
    properties.forEach((p) => {
      let type = p.property_type || "Other";
      type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      counts[type] = (counts[type] || 0) + 1;
    });
    const colors = [T.accent, T.emerald, T.amber, "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6"];
    return Object.entries(counts).map(([name, count], index) => ({
      name,
      value: Math.round((count / properties.length) * 100),
      count,
      color: colors[index % colors.length]
    }));
  }, [properties]);

  const isLandlordApproved = String(profile?.application_status || "").toLowerCase() === "approved" && profile?.account_status !== "suspended";
  const isRejected = String(profile?.application_status || "").toLowerCase() === "rejected" || profile?.account_status === "suspended";

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
          <h2 style={{ color: T.textPrimary, fontFamily: SERIF }}>Something went wrong</h2>
          <p style={{ color: T.textMuted, marginTop: "0.75rem" }}>{error}</p>
        </div>
      );
    }

    if (!isLandlordApproved && ["properties", "tenants", "pipeline"].includes(activeView)) {
      return (
        <div style={{ textAlign: "center", padding: "5rem 1.5rem", maxWidth: "560px", margin: "0 auto" }} className="ll-anim-up">
          <div
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: isRejected ? T.redSoft : T.amberSoft,
              border: `1px solid ${isRejected ? T.redBorder : T.amberBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem", color: isRejected ? T.red : T.amber
            }}
          >
            <Lock size={28} />
          </div>
          <h2 style={{ color: T.textPrimary, fontFamily: SERIF, fontSize: "1.9rem", marginBottom: "0.5rem" }}>
            {isRejected ? "Accreditation suspended" : "Accreditation required"}
          </h2>
          <p style={{ color: T.textSecondary, fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            {isRejected
              ? `Your landlord application requires revision (${profile?.rejection_reason || "submitted documents could not be validated"}). Access to ${activeView === "properties" ? "property listings" : "tenant management"} is locked until your revised documents are approved.`
              : `Your landlord profile is currently unverified. Submit your proof of property ownership and identification dossier to unlock ${activeView === "properties" ? "property uploading and listing management" : "tenant applications and lease management"}.`}
          </p>
          <PrimaryBtn onClick={() => setActiveView("dashboard")}>
            {isRejected ? "Return to dashboard to resubmit" : "Return to dashboard to apply"}
            <ArrowRight size={15} />
          </PrimaryBtn>
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <Dashboard
            profile={profile}
            user={user}
            onRefresh={async (updatedProfile) => {
              if (updatedProfile) setProfile((prev) => ({ ...(prev || {}), ...updatedProfile }));
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
            onNavigate={setActiveView}
            onSubmitForApproval={handleSubmitForApproval}
            onViewDocuments={() => setActiveView("documents")}
            onUploadDocuments={() => setActiveView("properties")}
          />
        );
      case "properties":
        return (
          <MyProperties
            properties={properties}
            stats={portfolioStats}
            activities={activities}
            user={user}
            onAddProperty={handleAddProperty}
            onEditProperty={handleEditProperty}
            onSubmitForApproval={handleSubmitForApproval}
            onRefreshProperties={handlePropertyDocumentsChanged}
            onPropertySubmitted={handlePropertySubmitted}
            onNavigate={setActiveView}
          />
        );
      case "tenants":
        return <Tenants profile={profile} properties={properties} user={user} onNavigate={setActiveView} />;
      case "pipeline":
        return <MatchPipelineView role="landlord" currentUserId={user?.id} />;
      case "documents":
        return <Documents profile={profile} properties={properties} user={user} onProfileUpdate={(updated) => setProfile(updated)} onRefreshProperties={handlePropertyDocumentsChanged} onPropertySubmitted={handlePropertySubmitted} />;
      case "profile":
        return <Profile />;
      case "settings":
        return <Settings />;
      default:
        return (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: T.textPrimary, fontFamily: SERIF }}>Coming soon</h2>
          </div>
        );
    }
  };

  const meta = VIEW_META[activeView] || VIEW_META.dashboard;

  return (
    <>
      <style>{globalStyle}</style>

      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onCreate={handleCreateProperty}
        isCreating={isCreatingProperty}
      />

      <div className="ll-scope" style={{ display: "flex", minHeight: "100vh", width: "100%", maxWidth: "100vw", background: T.page, position: "relative" }}>
        {/* Ambient glows */}
        <div aria-hidden style={{ position: "fixed", top: -140, right: -120, width: 460, height: 460, borderRadius: "9999px", background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden style={{ position: "fixed", bottom: -160, left: 200, width: 420, height: 420, borderRadius: "9999px", background: "radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        {!isMobile && (
          <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} profile={profile} user={user} />
        )}

        {isMobile && isMobileMenuOpen && (
          <>
            <div onClick={() => setIsMobileMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", zIndex: 98 }} className="ll-anim-in" />
            <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 99, animation: "llSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <Sidebar
                activeView={activeView}
                setActiveView={(view) => { setActiveView(view); setIsMobileMenuOpen(false); }}
                onLogout={handleLogout}
                profile={profile}
                user={user}
              />
            </div>
          </>
        )}

        <main style={{
          flex: 1, minWidth: 0,
          maxWidth: isMobile ? "100%" : "calc(100% - 260px)",
          width: isMobile ? "100%" : "calc(100% - 260px)",
          marginLeft: isMobile ? 0 : "260px",
          minHeight: "100vh",
          display: "flex", flexDirection: "column",
          position: "relative",
        }}>
          {/* Sticky topbar */}
          <header style={{
            position: "sticky", top: 0, zIndex: 40,
            padding: isMobile ? "0.85rem 1rem" : "1.1rem 2rem",
            background: "rgba(250,248,255,0.82)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: "1rem",
          }}>
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
                style={{ width: 42, height: 42, borderRadius: 12, background: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <Menu size={20} color={T.textPrimary} />
              </button>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: SERIF, fontSize: isMobile ? "1.35rem" : "1.6rem", color: T.textPrimary, lineHeight: 1.1, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {meta.title}
              </h1>
              {!isMobile && <p style={{ fontSize: "0.78rem", color: T.textMuted, marginTop: 2 }}>{meta.subtitle}</p>}
            </div>

            {!isMobile && isLandlordApproved && (
              <PrimaryBtn onClick={handleAddProperty}>
                <Plus size={16} /> Add Property
              </PrimaryBtn>
            )}
          </header>

          <div style={{ padding: isMobile ? "1.25rem 1rem 2.5rem" : "1.75rem 2rem 3rem", flex: 1, minWidth: 0 }}>
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
}
