import React, { useState, useMemo } from "react";
import {
  Building,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  ChevronRight,
  Check,
  Shield,
  Sparkles,
  MapPin,
  Bed,
  Bath,
  Square,
  Activity,
  CreditCard,
  FileText,
  Key,
  Percent,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { T } from "./Styles/designTokens";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";
import { PropertyDetailsModal } from "./Component/PropertyDetailsModal";
import { EditPropertyModal } from "./Component/EditPropertyModal";
import { DocumentUploadModal } from "./Component/DocumentUploadModal";
import { LandlordActivationView } from "./Component/LandlordActivationView";
import { properties as mockProperties } from "./data/mockData";

const formatZar = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "R0";
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch {
    return `R${Number(amount).toLocaleString()}`;
  }
};

const parseRentValue = (rentStr, priceNum) => {
  if (typeof priceNum === "number" && !isNaN(priceNum) && priceNum > 0) return priceNum;
  if (!rentStr) return 0;
  const num = String(rentStr).replace(/[^0-9]/g, "");
  return num ? parseInt(num, 10) : 0;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "recently";
  try {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  } catch {
    return "recently";
  }
};

export const Dashboard = ({
  profile,
  user,
  onRefresh,
  stats = [],
  activities = [],
  propertyDistribution = [],
  properties = [],
  onAddProperty,
  onEditProperty,
  onViewDetails,
  onNavigate
}) => {
  // Use user properties if available, fallback to mockProperties so dashboard is full of life
  const displayProperties = useMemo(() => {
    return properties && properties.length > 0 ? properties : mockProperties;
  }, [properties]);

  const [propertyFilter, setPropertyFilter] = useState("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [revenueRange, setRevenueRange] = useState("6m");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [uploadDocCategory, setUploadDocCategory] = useState("ownership");
  const [toastMessage, setToastMessage] = useState("");

  // Operational To-Do checklist with toggles
  const [tasks, setTasks] = useState([
    { id: 1, title: "Reconcile April rent deposits", category: "Finance", due: "Today", completed: false },
    { id: 2, title: "Review lease renewal for Sunset Apts 3A", category: "Leasing", due: "In 2 days", completed: true },
    { id: 3, title: "Arrange kitchen tap inspection for Rosebank", category: "Maintenance", due: "Friday", completed: false },
    { id: 4, title: "Upload updated electrical certificate", category: "Compliance", due: "Next week", completed: false }
  ]);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Portfolio financial calculations
  const financials = useMemo(() => {
    let totalPotentialRent = 0;
    let collectedRent = 0;
    let occupiedCount = 0;
    let vacantCount = 0;
    let totalTenants = 0;

    displayProperties.forEach(p => {
      const val = parseRentValue(p.rent, p.price);
      totalPotentialRent += val;
      if (p.occupied) {
        occupiedCount++;
        collectedRent += val;
      } else {
        vacantCount++;
      }
      if (Array.isArray(p.tenants)) {
        totalTenants += p.tenants.length;
      } else if (p.occupied) {
        totalTenants += 1;
      }
    });

    const totalUnits = displayProperties.length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;
    const collectionRate = totalPotentialRent > 0 ? Math.round((collectedRent / totalPotentialRent) * 100) : 0;

    return {
      totalPotentialRent,
      collectedRent,
      pendingRent: totalPotentialRent - collectedRent,
      occupiedCount,
      vacantCount,
      totalUnits,
      occupancyRate,
      collectionRate,
      totalTenants: Math.max(totalTenants, occupiedCount)
    };
  }, [displayProperties]);

  // Revenue chart history (generated based on current portfolio volume)
  const chartData = useMemo(() => {
    const base = financials.totalPotentialRent || 26700;
    if (revenueRange === "1y") {
      return [
        { month: "May", expected: Math.round(base * 0.9), collected: Math.round(base * 0.9) },
        { month: "Jun", expected: Math.round(base * 0.9), collected: Math.round(base * 0.88) },
        { month: "Jul", expected: Math.round(base * 0.92), collected: Math.round(base * 0.92) },
        { month: "Aug", expected: Math.round(base * 0.92), collected: Math.round(base * 0.91) },
        { month: "Sep", expected: Math.round(base * 0.95), collected: Math.round(base * 0.95) },
        { month: "Oct", expected: Math.round(base * 0.95), collected: Math.round(base * 0.93) },
        { month: "Nov", expected: Math.round(base * 0.98), collected: Math.round(base * 0.98) },
        { month: "Dec", expected: Math.round(base * 0.98), collected: Math.round(base * 0.96) },
        { month: "Jan", expected: base, collected: base },
        { month: "Feb", expected: base, collected: Math.round(base * 0.97) },
        { month: "Mar", expected: base, collected: base },
        { month: "Apr (Now)", expected: base, collected: financials.collectedRent }
      ];
    }
    return [
      { month: "Nov", expected: Math.round(base * 0.95), collected: Math.round(base * 0.95) },
      { month: "Dec", expected: Math.round(base * 0.95), collected: Math.round(base * 0.92) },
      { month: "Jan", expected: base, collected: base },
      { month: "Feb", expected: base, collected: Math.round(base * 0.98) },
      { month: "Mar", expected: base, collected: base },
      { month: "Apr (Now)", expected: base, collected: financials.collectedRent }
    ];
  }, [financials.totalPotentialRent, financials.collectedRent, revenueRange]);

  // Dynamic property distribution for Donut Chart
  const pieData = useMemo(() => {
    if (propertyDistribution && propertyDistribution.length > 0) {
      return propertyDistribution;
    }
    const typeCounts = {};
    displayProperties.forEach(p => {
      let t = p.property_type || "Apartment";
      t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const colors = [T.accent, T.emerald, T.amber, "#8b5cf6", "#ec4899", "#06b6d4"];
    return Object.entries(typeCounts).map(([name, count], idx) => ({
      name,
      value: Math.round((count / displayProperties.length) * 100),
      count,
      color: colors[idx % colors.length]
    }));
  }, [propertyDistribution, displayProperties]);

  // Filtered properties for the Quick Matrix
  const filteredProperties = useMemo(() => {
    return displayProperties.filter(p => {
      const matchSearch =
        !propertySearch ||
        (p.name && p.name.toLowerCase().includes(propertySearch.toLowerCase())) ||
        (p.location && p.location.toLowerCase().includes(propertySearch.toLowerCase()));
      const matchStatus =
        propertyFilter === "all" ||
        (propertyFilter === "occupied" && p.occupied) ||
        (propertyFilter === "vacant" && !p.occupied);
      return matchSearch && matchStatus;
    });
  }, [displayProperties, propertySearch, propertyFilter]);

  // Export CSV handler
  const handleExportCSV = () => {
    try {
      const headers = ["Unit / Property Name", "Location", "Rent", "Status", "Bedrooms", "Bathrooms", "Size", "Tenants"];
      const rows = displayProperties.map(p => [
        `"${p.name || "Property"}"`,
        `"${p.location || ""}"`,
        `"${p.rent || ""}"`,
        p.occupied ? "Occupied" : "Vacant",
        p.bedrooms || 0,
        p.bathrooms || 0,
        `"${p.size || ""}"`,
        `"${(p.tenants || []).join("; ")}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Place4U_RentRoll_Statement_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Portfolio Statement successfully exported to CSV");
    } catch {
      showToast("Unable to export statement at this moment.");
    }
  };

  const handleOpenDetails = (prop) => {
    setSelectedProperty(prop);
    setShowDetailsModal(true);
  };

  const handleOpenEdit = (prop) => {
    setSelectedProperty(prop);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedProp) => {
    if (onEditProperty) {
      onEditProperty(updatedProp);
    }
    setShowEditModal(false);
    showToast("Property updated successfully!");
  };

  const rawName = profile?.full_name?.trim() || "";
  const landlordName = rawName ? rawName.split(" ")[0] : "Landlord";
  const landlordCode = profile?.landlord_code || "LD-2026-ACTIVE";
  // Use management_tier column: if 'full_management' (or 'full') use full portfolio mode, else listing-only
  const managementTier = profile?.management_tier || (profile?.manage_with_platform === false ? "listing_only" : "full_management");
  const isFullManagement = managementTier === "full_management" || managementTier === "full";
  const manageWithPlatform = isFullManagement;
  // Strictly require application_status to be 'approved' and not suspended
  const isApproved = String(profile?.application_status || "").toLowerCase() === "approved" && profile?.account_status !== "suspended";

  return (
    <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", animation: "fadeIn 0.3s ease-in-out", minWidth: 0 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          background: "#10b981",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.9rem",
          fontWeight: 500,
          animation: "slideIn 0.25s ease-out"
        }}>
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* Property Details & Edit Modals */}
      <PropertyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        property={selectedProperty}
        onEdit={handleOpenEdit}
      />
      <EditPropertyModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        property={selectedProperty}
        onSave={handleSaveEdit}
      />
      <DocumentUploadModal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        profile={profile}
        properties={displayProperties}
        defaultCategory={uploadDocCategory}
        onDocumentUploaded={() => showToast("Verification document uploaded successfully!")}
      />

      {/* LANDLORD ONBOARDING & APPLICATION GATEWAY (SHOWN ONLY WHEN UNAPPROVED) */}
      {!isApproved && (
        <LandlordActivationView
          profile={profile}
          user={user}
          onRefresh={onRefresh}
        />
      )}

      {/* IF APPLICATION NOT APPROVED: RESTRICT DASHBOARD & SHOW ONLY APPLICATION CARD */}
      {!isApproved ? (
        <div style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: `1px dashed ${profile?.application_status === "rejected" ? "rgba(239, 68, 68, 0.3)" : T.border}`,
          borderRadius: "1.25rem",
          padding: "3.5rem 2rem",
          textAlign: "center",
          marginTop: "1.5rem"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: profile?.application_status === "rejected" ? "rgba(239, 68, 68, 0.15)" : "rgba(79, 126, 248, 0.12)",
            color: profile?.application_status === "rejected" ? "#ef4444" : T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem"
          }}>
            <Shield size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: T.textPrimary, marginBottom: "0.5rem" }}>
            {profile?.application_status === "rejected"
              ? "Application Requires Revision — Dashboard Locked"
              : profile?.application_status === "pending_review"
              ? "Application Under Review — Dashboard Locked"
              : "Operational Dashboard Locked"}
          </h3>
          <p style={{ color: T.textMuted, fontSize: "0.88rem", maxWidth: "520px", margin: "0 auto 1rem", lineHeight: 1.5 }}>
            {profile?.application_status === "rejected"
              ? `Your landlord application was declined: ${profile?.rejection_reason || "Submitted proof of ownership or FICA identity documents did not match records"}. Operational metrics, units, and tenant tools remain locked until revised credentials are submitted and approved.`
              : profile?.application_status === "pending_review"
              ? "Your application credentials and proof of property ownership are being reviewed by the compliance committee. Your dashboard tools will unlock automatically once approved."
              : "To safeguard the Place4U ecosystem against fraudulent listings, your rental units matrix, financial analytics, and tenant management tools will unlock once your landlord application is submitted and approved."}
          </p>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.05)",
            fontSize: "0.78rem",
            color: T.textSecondary
          }}>
            <Clock size={14} color={profile?.application_status === "rejected" ? "#ef4444" : T.accent} />
            <span>
              {profile?.application_status === "rejected"
                ? "Click 'Resubmit Application' in the accreditation card above to upload updated documents."
                : "Application review typically completes within 24 hours of submission."}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* 1. HERO HEADER WITH QUICK ACTION STRIP */}
          <div style={{
        background: `linear-gradient(135deg, rgba(26,37,64,0.6) 0%, rgba(15,22,41,0.9) 100%)`,
        border: `1px solid ${T.border}`,
        borderRadius: "1.25rem",
        padding: "clamp(1.1rem, 3.5vw, 1.75rem)",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Ambient glow accent */}
        <div style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "240px",
          height: "240px",
          background: "radial-gradient(circle, rgba(79,126,248,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
          width: "100%",
          position: "relative",
          zIndex: 1
        }}>
          <div style={{ flex: "1 1 280px", minWidth: 0, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{
                background: "rgba(79,126,248,0.15)",
                color: T.accent,
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "20px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <Shield size={12} /> {landlordCode}
              </span>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.75rem",
                color: T.emerald,
                fontWeight: 500,
                wordBreak: "break-word"
              }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.emerald, flexShrink: 0 }} />
                Portfolio Live · All Systems Operational
              </span>
            </div>

            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(1.5rem, 5vw, 2.4rem)",
              color: T.textPrimary,
              lineHeight: 1.15,
              marginBottom: "6px",
              wordBreak: "break-word"
            }}>
              Welcome back, {landlordName}
            </h1>
            <p style={{ color: T.textSecondary, fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)", maxWidth: "620px", wordBreak: "break-word" }}>
              {manageWithPlatform ? (
                <>
                  Here is your portfolio performance summary. You currently manage{" "}
                  <strong style={{ color: T.textPrimary }}>{financials.totalUnits} rental units</strong> generating{" "}
                  <strong style={{ color: T.emerald }}>{formatZar(financials.totalPotentialRent)}/mo</strong> in projected revenue.
                </>
              ) : (
                <>
                  You are in <strong style={{ color: "#f59e0b" }}>Listing-Only Mode</strong>. You have{" "}
                  <strong style={{ color: T.textPrimary }}>{financials.totalUnits} properties listed</strong> for marketing and tenant inquiries.
                </>
              )}
            </p>
          </div>

          {/* Quick Actions Button Bar */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", alignItems: "center" }}>
            <SecondaryBtn onClick={handleExportCSV}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Download size={15} /> Export Statement
              </span>
            </SecondaryBtn>

            {onNavigate && (
              <SecondaryBtn onClick={() => onNavigate("documents")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={15} /> Documents
                </span>
              </SecondaryBtn>
            )}

            <SecondaryBtn onClick={() => {
              setUploadDocCategory("ownership");
              setIsUploadDocOpen(true);
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={15} /> Upload Ownership Proof
              </span>
            </SecondaryBtn>

            <PrimaryBtn onClick={onAddProperty}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Plus size={16} /> Add Property
              </span>
            </PrimaryBtn>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE FINANCIAL & OPERATIONAL KPIS */}
      {manageWithPlatform ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem"
        }}>
          {/* KPI 1: Projected Monthly Income */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "default"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                Monthly Rent Roll
              </span>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(16,185,129,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <DollarSign size={18} color={T.emerald} />
              </div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {formatZar(financials.totalPotentialRent)}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "0.75rem" }}>
              <span style={{ color: T.emerald, fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                <ArrowUpRight size={14} /> +8.4%
              </span>
              <span style={{ color: T.textMuted }}>vs last quarter</span>
            </div>
          </div>

          {/* KPI 2: Rent Collected vs Pending */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "default"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                Rent Collection
              </span>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(79,126,248,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <CreditCard size={18} color={T.accent} />
              </div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {formatZar(financials.collectedRent)}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "0.75rem" }}>
              <span style={{ color: T.emerald, fontWeight: 500 }}>{financials.collectionRate}% collected</span>
              <span style={{ color: T.amber, fontWeight: 500 }}>{formatZar(financials.pendingRent)} vacant</span>
            </div>
          </div>

          {/* KPI 3: Occupancy Rate */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "default"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                Portfolio Occupancy
              </span>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(79,126,248,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Home size={18} color={T.accent} />
              </div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {financials.occupancyRate}%
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "0.75rem" }}>
              <span style={{ color: T.emerald, fontWeight: 600 }}>{financials.occupiedCount} occupied</span>
              <span style={{ color: T.textMuted }}>•</span>
              <span style={{ color: financials.vacantCount > 0 ? T.amber : T.textMuted, fontWeight: 500 }}>
                {financials.vacantCount} vacant {financials.vacantCount === 1 ? "unit" : "units"}
              </span>
            </div>
          </div>

          {/* KPI 4: Active Tenants */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            transition: "transform 0.2s, border-color 0.2s",
            cursor: "default"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                Active Leases
              </span>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(139,92,246,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Users size={18} color="#8b5cf6" />
              </div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {financials.totalTenants}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "0.75rem" }}>
              <span style={{ color: T.emerald, fontWeight: 600 }}>100% active</span>
              <span style={{ color: T.textMuted }}>• 0 overdue notices</span>
            </div>
          </div>
        </div>
      ) : (
        /* Listing-Only Mode: Marketing & Listing Metrics */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem"
        }}>
          {/* Card 1: Total Listed Units */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Total Listed Units
              </span>
              <Building size={18} color="#f59e0b" />
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary }}>
              {financials.totalUnits}
            </p>
            <span style={{ fontSize: "0.75rem", color: T.textMuted }}>Active on Place4U marketplace</span>
          </div>

          {/* Card 2: Marketing Inquiries */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Available For Lease
              </span>
              <Home size={18} color={T.emerald} />
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: T.textPrimary }}>
              {financials.vacantCount > 0 ? financials.vacantCount : financials.totalUnits}
            </p>
            <span style={{ fontSize: "0.75rem", color: T.emerald }}>Receiving tenant inquiries</span>
          </div>

          {/* Card 3: Listing Status */}
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Mode Status
              </span>
              <Shield size={18} color={T.accent} />
            </div>
            <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b" }}>
              Listing Only
            </p>
            <span style={{ fontSize: "0.75rem", color: T.textMuted }}>Financials & Rent rolls hidden</span>
          </div>
        </div>
      )}

      {/* 3. URGENT OPERATIONAL ATTENTION RIBBON */}
      {financials.vacantCount > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: "1rem",
          padding: "1rem 1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(245,158,11,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <AlertCircle size={20} color={T.amber} />
            </div>
            <div>
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
                {financials.vacantCount} vacant {financials.vacantCount === 1 ? "unit requires" : "units require"} tenant placement
              </p>
              <p style={{ fontSize: "0.8rem", color: T.textMuted, marginTop: "2px" }}>
                Potential monthly revenue of {formatZar(financials.pendingRent)} is awaiting incoming tenant applications.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <SecondaryBtn onClick={() => {
              setPropertyFilter("vacant");
              const el = document.getElementById("portfolio-matrix");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}>
              Review Vacant Units
            </SecondaryBtn>
            {onNavigate && (
              <PrimaryBtn onClick={() => onNavigate("tenants")}>
                View Tenants & Contacts
              </PrimaryBtn>
            )}
          </div>
        </div>
      )}

      {/* 4. CHARTS & FINANCIAL ANALYTICS ROW (Available only in Full Portfolio Management Mode) */}
      {manageWithPlatform && (
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Revenue & Collections Trajectory */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "8px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: T.textPrimary }}>
                Revenue & Rent Collection Trajectory
              </h3>
              <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
                Historical rental income vs collected returns (ZAR)
              </p>
            </div>
            <div style={{
              display: "flex",
              background: T.surface,
              borderRadius: "8px",
              padding: "2px",
              border: `1px solid ${T.border}`
            }}>
              <button
                onClick={() => setRevenueRange("6m")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: revenueRange === "6m" ? T.accent : "transparent",
                  color: revenueRange === "6m" ? "#fff" : T.textSecondary,
                  transition: "all 0.15s"
                }}
              >
                6 Months
              </button>
              <button
                onClick={() => setRevenueRange("1y")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: revenueRange === "1y" ? T.accent : "transparent",
                  color: revenueRange === "1y" ? "#fff" : T.textSecondary,
                  transition: "all 0.15s"
                }}
              >
                1 Year
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: "260px" }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={T.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke={T.textMuted} fontSize={12} tickLine={false} />
                <YAxis stroke={T.textMuted} fontSize={11} tickFormatter={(val) => `R${val / 1000}k`} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    background: T.navyMid,
                    border: `1px solid ${T.border}`,
                    borderRadius: "8px",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.4)"
                  }}
                  itemStyle={{ color: T.textPrimary }}
                  formatter={(value, name) => [
                    formatZar(value),
                    name === "collected" ? "Collected Rent" : "Expected Roll"
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stroke={T.accent}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpected)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke={T.emerald}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.5rem",
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: `1px solid ${T.border}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: T.textSecondary }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.emerald }} />
              Collected Rent
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: T.textSecondary }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }} />
              Projected Portfolio Capacity
            </div>
          </div>
        </div>

        {/* Portfolio Asset Allocation & Occupancy Donut */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: T.textPrimary }}>
              Portfolio Asset Breakdown
            </h3>
            <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
              Distribution by property category & occupancy
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ position: "relative", width: "100%", height: "210px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: T.navyMid,
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px"
                    }}
                    itemStyle={{ color: T.textPrimary }}
                    formatter={(val, name) => [`${val}% of portfolio`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center donut label */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none"
              }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: T.textPrimary, display: "block", lineHeight: 1 }}>
                  {financials.totalUnits}
                </span>
                <span style={{ fontSize: "0.7rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Units
                </span>
              </div>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: `1px solid ${T.border}`
          }}>
            {pieData.map((item, index) => (
              <div key={index} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: T.surface,
                padding: "6px 10px",
                borderRadius: "8px"
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 500, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: "0.68rem", color: T.textMuted }}>
                    {item.value}% ({item.count || 1} {item.count === 1 ? "unit" : "units"})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* 5. PORTFOLIO FAST MANAGEMENT (INTERACTIVE UNIT MATRIX) */}
      <div id="portfolio-matrix" style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: "1rem",
        padding: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Header and Filter Controls */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: T.textPrimary }}>
              Your Rental Units Matrix
            </h2>
            <p style={{ fontSize: "0.8rem", color: T.textMuted, marginTop: "2px" }}>
              Monitor unit status, occupancy, and tenant assignments at a glance
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={14} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search unit name or area..."
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                  fontSize: "0.82rem",
                  color: T.textPrimary,
                  outline: "none",
                  width: "100%"
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: "flex",
              background: T.surface,
              borderRadius: "8px",
              padding: "2px",
              border: `1px solid ${T.border}`
            }}>
              {[
                { id: "all", label: "All Units" },
                { id: "occupied", label: "Occupied" },
                { id: "vacant", label: "Vacant" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPropertyFilter(tab.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "0.78rem",
                    fontWeight: propertyFilter === tab.id ? 600 : 400,
                    cursor: "pointer",
                    background: propertyFilter === tab.id ? T.accent : "transparent",
                    color: propertyFilter === tab.id ? "#fff" : T.textSecondary,
                    transition: "all 0.15s"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {onNavigate && (
              <SecondaryBtn onClick={() => onNavigate("properties")}>
                Full Directory <ChevronRight size={14} />
              </SecondaryBtn>
            )}
          </div>
        </div>

        {/* Matrix Grid */}
        {filteredProperties.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem"
          }}>
            {filteredProperties.map(p => (
              <div
                key={p.id}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "0.875rem",
                  overflow: "hidden",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.borderHover;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Thumbnail Header with Status Badge */}
                <div style={{ position: "relative", height: "140px", overflow: "hidden" }}>
                  <img
                    src={p.image || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(15,22,41,0.85) 0%, transparent 60%)"
                  }} />
                  <span style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: p.occupied ? T.emerald : T.amber,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {p.occupied ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                    {p.occupied ? "OCCUPIED" : "VACANT"}
                  </span>
                  <p style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "12px",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em"
                  }}>
                    {p.rent}
                  </p>
                </div>

                {/* Card Body */}
                <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary, marginBottom: "4px" }}>
                    {p.name}
                  </h4>
                  <p style={{ fontSize: "0.75rem", color: T.textMuted, display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
                    <MapPin size={12} color={T.accent} /> {p.location}
                  </p>

                  <div style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "12px",
                    padding: "6px 0",
                    borderTop: `1px solid ${T.border}`,
                    borderBottom: `1px solid ${T.border}`
                  }}>
                    <span style={{ fontSize: "0.72rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: "3px" }}>
                      <Bed size={12} color={T.accent} /> {p.bedrooms || 1} bd
                    </span>
                    <span style={{ color: T.border }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: "3px" }}>
                      <Bath size={12} color={T.accent} /> {p.bathrooms || 1} ba
                    </span>
                    <span style={{ color: T.border }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: "3px" }}>
                      <Square size={12} color={T.accent} /> {p.size || "—"}
                    </span>
                  </div>

                  {/* Tenant Assignment Note (Hidden in Listing-Only mode) */}
                  {manageWithPlatform && (
                    <div style={{ marginBottom: "12px", fontSize: "0.75rem" }}>
                      <span style={{ color: T.textMuted }}>Tenant: </span>
                      <span style={{ color: p.occupied ? T.textPrimary : T.amber, fontWeight: 500 }}>
                        {p.occupied && p.tenants?.length ? p.tenants.join(", ") : p.occupied ? "Active Lease" : "No tenant assigned"}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                    <button
                      onClick={() => handleOpenDetails(p)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${T.border}`,
                        borderRadius: "8px",
                        color: T.textPrimary,
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    >
                      <Eye size={13} /> Details
                    </button>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate("tenants")}
                        style={{
                          padding: "7px 10px",
                          background: p.occupied ? "rgba(16,185,129,0.12)" : "rgba(79,126,248,0.12)",
                          border: `1px solid ${p.occupied ? "rgba(16,185,129,0.3)" : "rgba(79,126,248,0.3)"}`,
                          borderRadius: "8px",
                          color: p.occupied ? T.emerald : T.accent,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s"
                        }}
                        title={p.occupied ? "Review Tenant & Docs" : "Assign Tenant & Review Docs"}
                      >
                        <Users size={13} /> {p.occupied ? "Tenant" : "Assign"}
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(p)}
                      style={{
                        padding: "7px 12px",
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        borderRadius: "8px",
                        color: T.textSecondary,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = T.textPrimary;
                        e.currentTarget.style.borderColor = T.borderHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = T.textSecondary;
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Building size={40} color={T.textMuted} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
            <p style={{ color: T.textSecondary, fontSize: "0.95rem", fontWeight: 500 }}>No rental units matched your search criteria</p>
            <p style={{ color: T.textMuted, fontSize: "0.8rem", marginTop: "4px" }}>Try clearing search keywords or filter status.</p>
          </div>
        )}
      </div>

      {/* 6. DUAL OPERATIONS STREAM: ACTIVITY AUDIT & TENANT COMMUNICATIONS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Stream 1: Recent Activity & Audit Trail */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: T.textPrimary }}>
                Activity & Audit Log
              </h3>
              <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
                Real-time record of portfolio actions and changes
              </p>
            </div>
            <Activity size={18} color={T.accent} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
            {activities && activities.length > 0 ? (
              activities.map(act => (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "0.85rem",
                    background: T.surface,
                    borderRadius: "0.75rem",
                    border: `1px solid ${T.border}`
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(79,126,248,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Activity size={16} color={T.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.82rem", color: T.textPrimary, fontWeight: 500, lineHeight: 1.3 }}>
                      {act.activity_description}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: "2px" }}>
                      {formatTimeAgo(act.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              // Default representative activity items
              [
                { title: "Rent collection roll initialized for April 2026", time: "2h ago", type: "finance" },
                { title: "Updated occupancy profile for Sunset Unit 3A", time: "Yesterday", type: "property" },
                { title: "Landlord verification certificate renewed", time: "3 days ago", type: "compliance" },
                { title: "Added Harbour View Apartment Unit 10 to portfolio", time: "1 week ago", type: "property" }
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "0.85rem",
                    background: T.surface,
                    borderRadius: "0.75rem",
                    border: `1px solid ${T.border}`
                  }}
                >
                  <div style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(79,126,248,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {item.type === "finance" ? (
                      <DollarSign size={16} color={T.emerald} />
                    ) : item.type === "compliance" ? (
                      <Shield size={16} color="#8b5cf6" />
                    ) : (
                      <Building size={16} color={T.accent} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.82rem", color: T.textPrimary, fontWeight: 500, lineHeight: 1.3 }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: "2px" }}>
                      {item.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stream 2: Operational Task Queue */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: T.textPrimary }}>
                Operational Task Queue
              </h3>
              <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
                Key landlord responsibilities & compliance deadlines
              </p>
            </div>
            <span style={{
              fontSize: "0.72rem",
              color: T.emerald,
              fontWeight: 600,
              background: "rgba(16,185,129,0.12)",
              padding: "4px 10px",
              borderRadius: "20px"
            }}>
              {tasks.filter(t => t.completed).length} of {tasks.length} Completed
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0.85rem 1rem",
                  background: T.surface,
                  borderRadius: "0.75rem",
                  border: `1px solid ${task.completed ? "rgba(16,185,129,0.3)" : T.border}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  opacity: task.completed ? 0.65 : 1
                }}
              >
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "6px",
                  border: `2px solid ${task.completed ? T.emerald : T.textMuted}`,
                  background: task.completed ? T.emerald : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {task.completed && <Check size={13} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    color: T.textPrimary,
                    textDecoration: task.completed ? "line-through" : "none"
                  }}>
                    {task.title}
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "2px", fontSize: "0.68rem" }}>
                    <span style={{ color: T.accent }}>{task.category}</span>
                    <span style={{ color: T.textMuted }}>• Due {task.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
