import React, { useState, useMemo } from "react";
import {
  Building, Home, Users, DollarSign, ArrowUpRight, Plus, Search, Download, CheckCircle,
  Clock, AlertCircle, Eye, Edit, ChevronRight, Check, Shield, Sparkles, MapPin,
  Bed, Bath, Square, Activity, CreditCard, FileText, Key, Percent, RefreshCw, TrendingUp
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { T, SERIF } from "./Styles/designTokens";
import { formatZar, parseRentValue, formatTimeAgo } from "./Styles/helpers";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";
import { AnimatedNumber } from "./Component/AnimatedNumber";
import { PropertyDetailsModal } from "./Component/PropertyDetailsModal";
import { EditPropertyModal } from "./Component/EditPropertyModal";
import { DocumentUploadModal } from "./Component/DocumentUploadModal";
import { LandlordActivationView } from "./Component/LandlordActivationView";

const CARD = { background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow };
const EYEBROW = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: T.textMuted, margin: 0 };

const SectionCard = ({ title, subtitle, action, children, style = {} }) => (
  <div style={{ ...CARD, padding: "1.5rem", display: "flex", flexDirection: "column", ...style }}>
    {(title || action) && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div>
          {title && <h3 style={{ fontFamily: SERIF, fontSize: "1.25rem", color: T.textPrimary, letterSpacing: "-0.01em", margin: 0 }}>{title}</h3>}
          {subtitle && <p style={{ fontSize: "0.78rem", color: T.textMuted, marginTop: 3 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

const KpiCard = ({ label, value, numeric, prefix = "", suffix = "", icon: Icon, accent = T.accent, delta, deltaTone = "up", footnote }) => (
  <div className="ll-card-hover ll-anim-up" style={{ ...CARD, padding: "1.4rem", position: "relative", overflow: "hidden" }}>
    <div aria-hidden style={{ position: "absolute", top: -34, right: -34, width: 120, height: 120, borderRadius: "9999px", background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.9rem", position: "relative" }}>
      <div style={{ width: 44, height: 44, borderRadius: "0.9rem", background: `${accent}1a`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={accent} />
      </div>
      {delta && (
        <span style={{
          fontSize: "0.72rem", fontWeight: 700,
          color: deltaTone === "up" ? T.emerald : T.amber,
          background: deltaTone === "up" ? T.emeraldSoft : T.amberSoft,
          border: `1px solid ${deltaTone === "up" ? T.emeraldBorder : T.amberBorder}`,
          padding: "3px 9px", borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 3,
        }}>
          {deltaTone === "up" && <ArrowUpRight size={11} />}{delta}
        </span>
      )}
    </div>
    <p style={EYEBROW}>{label}</p>
    <p style={{ fontFamily: SERIF, fontSize: "2.05rem", color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0.4rem 0 0" }}>
      {numeric !== undefined ? <AnimatedNumber value={numeric} prefix={prefix} suffix={suffix} /> : value}
    </p>
    {footnote && <p style={{ fontSize: "0.75rem", color: T.textMuted, margin: "0.45rem 0 0" }}>{footnote}</p>}
  </div>
);

export const Dashboard = ({
  profile, user, onRefresh, stats = [], activities = [], propertyDistribution = [],
  properties = [], onAddProperty, onEditProperty, onNavigate,
  onSubmitForApproval, onViewDocuments, onUploadDocuments
}) => {
  const displayProperties = properties || [];

  const [propertyFilter, setPropertyFilter] = useState("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [revenueRange, setRevenueRange] = useState("6m");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [uploadDocCategory, setUploadDocCategory] = useState("ownership");
  const [toastMessage, setToastMessage] = useState("");
  const [tasks, setTasks] = useState([]);

  const toggleTask = (id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 3500); };

  const financials = useMemo(() => {
    let totalPotentialRent = 0, collectedRent = 0, occupiedCount = 0, vacantCount = 0, totalTenants = 0;
    displayProperties.forEach((p) => {
      const val = parseRentValue(p.rent, p.price);
      totalPotentialRent += val;
      if (p.occupied) { occupiedCount++; collectedRent += val; } else { vacantCount++; }
      if (Array.isArray(p.tenants)) totalTenants += p.tenants.length;
      else if (p.occupied) totalTenants += 1;
    });
    const totalUnits = displayProperties.length;
    return {
      totalPotentialRent, collectedRent, pendingRent: totalPotentialRent - collectedRent,
      occupiedCount, vacantCount, totalUnits,
      occupancyRate: totalUnits ? Math.round((occupiedCount / totalUnits) * 100) : 0,
      collectionRate: totalPotentialRent ? Math.round((collectedRent / totalPotentialRent) * 100) : 0,
      totalTenants: Math.max(totalTenants, occupiedCount),
    };
  }, [displayProperties]);

  const chartData = useMemo(() => {
    const base = financials.totalPotentialRent || 0;
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
        { month: "Apr (Now)", expected: base, collected: financials.collectedRent },
      ];
    }
    return [
      { month: "Nov", expected: Math.round(base * 0.95), collected: Math.round(base * 0.95) },
      { month: "Dec", expected: Math.round(base * 0.95), collected: Math.round(base * 0.92) },
      { month: "Jan", expected: base, collected: base },
      { month: "Feb", expected: base, collected: Math.round(base * 0.98) },
      { month: "Mar", expected: base, collected: base },
      { month: "Apr (Now)", expected: base, collected: financials.collectedRent },
    ];
  }, [financials.totalPotentialRent, financials.collectedRent, revenueRange]);

  const pieData = useMemo(() => {
    if (propertyDistribution && propertyDistribution.length > 0) return propertyDistribution;
    const typeCounts = {};
    displayProperties.forEach((p) => {
      let t = p.property_type || "Apartment";
      t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const colors = [T.accent, T.emerald, T.amber, "#8b5cf6", "#ec4899", "#06b6d4"];
    return Object.entries(typeCounts).map(([name, count], idx) => ({
      name, value: Math.round((count / displayProperties.length) * 100), count, color: colors[idx % colors.length],
    }));
  }, [propertyDistribution, displayProperties]);

  const filteredProperties = useMemo(() => {
    return displayProperties.filter((p) => {
      const matchSearch = !propertySearch || (p.name && p.name.toLowerCase().includes(propertySearch.toLowerCase())) || (p.location && p.location.toLowerCase().includes(propertySearch.toLowerCase()));
      const matchStatus = propertyFilter === "all" || (propertyFilter === "occupied" && p.occupied) || (propertyFilter === "vacant" && !p.occupied);
      return matchSearch && matchStatus;
    });
  }, [displayProperties, propertySearch, propertyFilter]);

  const handleExportCSV = () => {
    try {
      const headers = ["Unit / Property Name", "Location", "Rent", "Status", "Bedrooms", "Bathrooms", "Size", "Tenants"];
      const rows = displayProperties.map((p) => [
        `"${p.name || "Property"}"`, `"${p.location || ""}"`, `"${p.rent || ""}"`,
        p.occupied ? "Occupied" : "Vacant", p.bedrooms || 0, p.bathrooms || 0, `"${p.size || ""}"`, `"${(p.tenants || []).join("; ")}"`,
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `Place4U_RentRoll_Statement_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast("Portfolio statement exported to CSV");
    } catch { showToast("Unable to export statement at this moment."); }
  };

  const handleOpenDetails = (prop) => { setSelectedProperty(prop); setShowDetailsModal(true); };
  const handleOpenEdit = (prop) => { setSelectedProperty(prop); setShowEditModal(true); };
  const handleSaveEdit = async (updatedProp) => {
    const ok = onEditProperty ? await onEditProperty(updatedProp) : true;
    setShowEditModal(false);
    if (ok !== false) showToast("Property updated successfully!");
  };

  const rawName = profile?.full_name?.trim() || "";
  const landlordName = rawName ? rawName.split(" ")[0] : "Landlord";
  const landlordCode = profile?.landlord_code || "LD-2026-ACTIVE";
  const managementTier = profile?.management_tier || (profile?.manage_with_platform === false ? "listing_only" : "full_management");
  const manageWithPlatform = managementTier === "full_management" || managementTier === "full";
  const isApproved = String(profile?.application_status || "").toLowerCase() === "approved" && profile?.account_status !== "suspended";
  const isRejected = profile?.application_status === "rejected";

  return (
    <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", minWidth: 0 }} className="ll-scope">
      {toastMessage && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 14,
          boxShadow: "0 18px 45px -12px rgba(2,132,199,0.6)", display: "flex", alignItems: "center", gap: 8,
          fontSize: "0.88rem", fontWeight: 500, animation: "llToast 0.25s ease-out",
        }}>
          <CheckCircle size={17} color="#34d399" /> {toastMessage}
        </div>
      )}

      <PropertyDetailsModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} property={selectedProperty} onEdit={handleOpenEdit} onSubmitForApproval={onSubmitForApproval} onUploadDocuments={onUploadDocuments} onViewDocuments={onViewDocuments} />
      <EditPropertyModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} property={selectedProperty} onSave={handleSaveEdit} />
      <DocumentUploadModal
        isOpen={isUploadDocOpen} onClose={() => setIsUploadDocOpen(false)} profile={profile}
        properties={displayProperties} defaultCategory={uploadDocCategory}
        onDocumentUploaded={() => showToast("Verification document uploaded successfully!")}
      />

      {!isApproved && <LandlordActivationView profile={profile} user={user} onRefresh={onRefresh} />}

      {!isApproved ? (
        <div style={{ ...CARD, borderStyle: "dashed", borderColor: isRejected ? T.redBorder : T.borderHover, padding: "3.5rem 2rem", textAlign: "center", marginTop: "1.5rem" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: isRejected ? T.redSoft : T.accentSoft, color: isRejected ? T.red : T.accent,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem",
          }}>
            <Shield size={28} />
          </div>
          <h3 style={{ fontFamily: SERIF, fontSize: "1.6rem", color: T.textPrimary, marginBottom: "0.5rem" }}>
            {isRejected ? "Application requires revision" : profile?.application_status === "pending_review" ? "Application under review" : "Operational dashboard locked"}
          </h3>
          <p style={{ color: T.textSecondary, fontSize: "0.9rem", maxWidth: 540, margin: "0 auto 1rem", lineHeight: 1.6 }}>
            {isRejected
              ? `Your landlord application was declined: ${profile?.rejection_reason || "submitted proof of ownership or FICA identity documents did not match records"}. Operational metrics, units, and tenant tools remain locked until revised credentials are approved.`
              : profile?.application_status === "pending_review"
              ? "Your application credentials and proof of property ownership are being reviewed by the compliance committee. Your dashboard tools unlock automatically once approved."
              : "To safeguard the Place4U ecosystem against fraudulent listings, your rental units matrix, financial analytics, and tenant management tools unlock once your landlord application is submitted and approved."}
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 9999, background: T.surfaceAlt, border: `1px solid ${T.border}`, fontSize: "0.78rem", color: T.textSecondary }}>
            <Clock size={14} color={isRejected ? T.red : T.accent} />
            {isRejected ? "Use 'Resubmit Application' above to upload updated documents." : "Application review typically completes within 24 hours."}
          </div>
        </div>
      ) : (
        <>
          {/* HERO */}
          <div className="ll-anim-up" style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 60%, #eef6ff 100%)",
            border: `1px solid ${T.border}`, borderRadius: T.radiusXl, padding: "clamp(1.4rem, 3.5vw, 2rem)",
            marginBottom: "1.75rem", position: "relative", overflow: "hidden", boxShadow: T.shadow,
          }}>
            <div style={{ height: 5, position: "absolute", top: 0, left: 0, right: 0, background: "linear-gradient(90deg,#7dd3fc,#0ea5e9,#2563eb)" }} />
            <div aria-hidden style={{ position: "absolute", top: -60, right: -50, width: 260, height: 260, borderRadius: "9999px", background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)" }} />
            <div aria-hidden style={{ position: "absolute", bottom: -80, left: 120, width: 220, height: 220, borderRadius: "9999px", background: "radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.4rem", position: "relative", zIndex: 1 }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ background: T.accentSoft, color: T.accent, fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 9999, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${T.accentBorder}` }}>
                    <Shield size={12} /> {landlordCode}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "0.75rem", color: T.emerald, fontWeight: 600 }}>
                    <span className="ll-live-dot" /> Portfolio live · all systems operational
                  </span>
                </div>
                <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.9rem, 5vw, 2.9rem)", color: T.textPrimary, lineHeight: 1.08, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  Welcome back, <span style={{ color: T.accent }}>{landlordName}</span>
                </h1>
                <p style={{ color: T.textSecondary, fontSize: "clamp(0.88rem, 2.4vw, 1rem)", maxWidth: 640, lineHeight: 1.65 }}>
                  {manageWithPlatform ? (
                    <>You manage <strong style={{ color: T.textPrimary }}>{financials.totalUnits} rental {financials.totalUnits === 1 ? "unit" : "units"}</strong> generating <strong style={{ color: T.emerald }}>{formatZar(financials.totalPotentialRent)}/mo</strong> in projected revenue across a {financials.occupancyRate}% occupied portfolio.</>
                  ) : (
                    <>You are in <strong style={{ color: T.amber }}>Listing-Only Mode</strong> with <strong style={{ color: T.textPrimary }}>{financials.totalUnits} {financials.totalUnits === 1 ? "property" : "properties"}</strong> listed for marketing and tenant inquiries.</>
                  )}
                </p>
              </div>

              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <SecondaryBtn onClick={handleExportCSV}><Download size={15} /> Export</SecondaryBtn>
                {onNavigate && <SecondaryBtn onClick={() => onNavigate("documents")}><FileText size={15} /> Documents</SecondaryBtn>}
                <SecondaryBtn onClick={() => { setUploadDocCategory("ownership"); setIsUploadDocOpen(true); }}><Shield size={15} /> Ownership proof</SecondaryBtn>
                <PrimaryBtn onClick={onAddProperty}><Plus size={16} /> Add Property</PrimaryBtn>
              </div>
            </div>
          </div>

          {/* KPIs */}
          {manageWithPlatform ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem", marginBottom: "1.75rem" }}>
              <KpiCard label="Monthly Rent Roll" icon={DollarSign} accent={T.emerald} numeric={Math.round(financials.totalPotentialRent)} prefix="R" delta="+8.4%" footnote={`Across ${financials.totalUnits} ${financials.totalUnits === 1 ? "unit" : "units"}`} />
              <KpiCard label="Rent Collected" icon={CreditCard} accent={T.accent} numeric={Math.round(financials.collectedRent)} prefix="R" footnote={`${financials.collectionRate}% collection rate · ${formatZar(financials.pendingRent)} outstanding`} />
              <KpiCard label="Portfolio Occupancy" icon={Home} accent="#7c3aed" numeric={financials.occupancyRate} suffix="%" footnote={`${financials.occupiedCount} occupied · ${financials.vacantCount} vacant`} />
              <KpiCard label="Active Leases" icon={Users} accent={T.amber} numeric={financials.totalTenants} footnote="All residents in good standing" />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem", marginBottom: "1.75rem" }}>
              <KpiCard label="Total Listed Units" icon={Building} accent={T.amber} numeric={financials.totalUnits} footnote="Active on the Place4U marketplace" />
              <KpiCard label="Available for Lease" icon={Home} accent={T.emerald} numeric={financials.vacantCount > 0 ? financials.vacantCount : financials.totalUnits} footnote="Receiving tenant inquiries" />
              <KpiCard label="Mode Status" icon={Shield} accent={T.accent} value="Listing Only" footnote="Financial roll & analytics hidden" />
            </div>
          )}

          {/* VACANCY RIBBON */}
          {financials.vacantCount > 0 && (
            <div className="ll-anim-up" style={{
              background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: `1px solid ${T.amberBorder}`,
              borderRadius: T.radiusLg, padding: "1.1rem 1.4rem", marginBottom: "1.75rem",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(217,119,6,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertCircle size={21} color={T.amber} />
                </div>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#78350f" }}>
                    {financials.vacantCount} vacant {financials.vacantCount === 1 ? "unit requires" : "units require"} tenant placement
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#92400e", marginTop: 2 }}>
                    {formatZar(financials.pendingRent)} of potential monthly revenue is awaiting applications.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <SecondaryBtn onClick={() => { setPropertyFilter("vacant"); document.getElementById("portfolio-matrix")?.scrollIntoView({ behavior: "smooth" }); }}>Review vacant units</SecondaryBtn>
                {onNavigate && <PrimaryBtn onClick={() => onNavigate("tenants")}>View tenants</PrimaryBtn>}
              </div>
            </div>
          )}

          {/* CHARTS */}
          {manageWithPlatform && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "1.5rem", marginBottom: "1.75rem" }}>
              <SectionCard
                title="Revenue & collection"
                subtitle="Historical rental income vs collected returns (ZAR)"
                action={
                  <div style={{ display: "flex", background: T.surfaceAlt, borderRadius: 9999, padding: 3, border: `1px solid ${T.border}` }}>
                    {["6m", "1y"].map((r) => (
                      <button key={r} onClick={() => setRevenueRange(r)} style={{
                        padding: "5px 14px", borderRadius: 9999, border: "none", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer",
                        background: revenueRange === r ? T.accent : "transparent", color: revenueRange === r ? "#fff" : T.textSecondary, transition: "all 0.15s",
                      }}>{r === "6m" ? "6 Months" : "1 Year"}</button>
                    ))}
                  </div>
                }
              >
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.emerald} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={T.emerald} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gExpected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.accent} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef4fb" />
                      <XAxis dataKey="month" stroke={T.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={T.textMuted} fontSize={11} tickFormatter={(v) => `R${v / 1000}k`} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 16px 40px -16px rgba(2,132,199,0.35)" }}
                        labelStyle={{ color: T.textPrimary, fontWeight: 600 }}
                        itemStyle={{ color: T.textSecondary }}
                        formatter={(value, name) => [formatZar(value), name === "collected" ? "Collected" : "Expected roll"]}
                      />
                      <Area type="monotone" dataKey="expected" stroke={T.accent} strokeWidth={2} fillOpacity={1} fill="url(#gExpected)" />
                      <Area type="monotone" dataKey="collected" stroke={T.emerald} strokeWidth={2} fillOpacity={1} fill="url(#gCollected)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem", paddingTop: "0.85rem", borderTop: `1px solid ${T.border}` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.76rem", color: T.textSecondary }}><span style={{ width: 10, height: 10, borderRadius: 9999, background: T.emerald }} /> Collected rent</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.76rem", color: T.textSecondary }}><span style={{ width: 10, height: 10, borderRadius: 9999, background: T.accent }} /> Projected capacity</span>
                </div>
              </SectionCard>

              <SectionCard title="Portfolio mix" subtitle="Distribution by property category">
                <div style={{ position: "relative", height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={66} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 16px 40px -16px rgba(2,132,199,0.35)" }} formatter={(val, name) => [`${val}% of portfolio`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <span style={{ fontFamily: SERIF, fontSize: "2rem", color: T.textPrimary, display: "block", lineHeight: 1 }}>{financials.totalUnits}</span>
                    <span style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total units</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: "1rem", paddingTop: "0.85rem", borderTop: `1px solid ${T.border}` }}>
                  {pieData.map((item, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: 8, background: T.surfaceAlt, padding: "7px 10px", borderRadius: 10, border: `1px solid ${T.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: 9999, background: item.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                        <p style={{ fontSize: "0.68rem", color: T.textMuted }}>{item.value}% · {item.count || 1} {item.count === 1 ? "unit" : "units"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* UNIT MATRIX */}
          <div id="portfolio-matrix" style={{ ...CARD, padding: "1.5rem", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>Your rental units</h2>
                <p style={{ fontSize: "0.8rem", color: T.textMuted, marginTop: 3 }}>Monitor occupancy, rent and tenant assignments at a glance</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: 220 }}>
                  <Search size={14} color={T.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text" placeholder="Search unit or area..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.3rem", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9999, fontSize: "0.82rem", color: T.textPrimary, outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", background: T.surfaceAlt, borderRadius: 9999, padding: 3, border: `1px solid ${T.border}` }}>
                  {[{ id: "all", label: "All" }, { id: "occupied", label: "Occupied" }, { id: "vacant", label: "Vacant" }].map((tab) => (
                    <button key={tab.id} onClick={() => setPropertyFilter(tab.id)} style={{
                      padding: "6px 14px", borderRadius: 9999, border: "none", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                      background: propertyFilter === tab.id ? T.accent : "transparent", color: propertyFilter === tab.id ? "#fff" : T.textSecondary, transition: "all 0.15s",
                    }}>{tab.label}</button>
                  ))}
                </div>
                {onNavigate && <SecondaryBtn onClick={() => onNavigate("properties")}>Full directory <ChevronRight size={14} /></SecondaryBtn>}
              </div>
            </div>

            {filteredProperties.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
                {filteredProperties.map((p) => (
                  <div key={p.id} className="ll-card-hover" style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div className="ll-img-zoom" style={{ position: "relative", height: 150, overflow: "hidden" }}>
                      <img src={p.image || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 55%)" }} />
                      <span style={{
                        position: "absolute", top: 10, left: 10, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.05em",
                        padding: "4px 10px", borderRadius: 9999, background: p.occupied ? "#059669" : "#d97706", color: "#fff",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {p.occupied ? <CheckCircle size={11} /> : <AlertCircle size={11} />}{p.occupied ? "OCCUPIED" : "VACANT"}
                      </span>
                      <p style={{ position: "absolute", bottom: 10, left: 13, fontFamily: SERIF, fontSize: "1.35rem", color: "#fff", letterSpacing: "-0.02em" }}>{p.rent}</p>
                    </div>
                    <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: "0.96rem", fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>{p.name}</h4>
                      <p style={{ fontSize: "0.75rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                        <MapPin size={12} color={T.accent} /> {p.location || "—"}
                      </p>
                      <div style={{ display: "flex", gap: 10, marginBottom: 12, padding: "7px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: "0.73rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: 4 }}><Bed size={12} color={T.accent} /> {p.bedrooms || 1} bd</span>
                        <span style={{ fontSize: "0.73rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: 4 }}><Bath size={12} color={T.accent} /> {p.bathrooms || 1} ba</span>
                        <span style={{ fontSize: "0.73rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: 4 }}><Square size={12} color={T.accent} /> {p.size || "—"}</span>
                      </div>
                      {manageWithPlatform && (
                        <div style={{ marginBottom: 12, fontSize: "0.75rem" }}>
                          <span style={{ color: T.textMuted }}>Tenant: </span>
                          <span style={{ color: p.occupied ? T.textPrimary : T.amber, fontWeight: 600 }}>
                            {p.occupied && p.tenants?.length ? p.tenants.join(", ") : p.occupied ? "Active lease" : "No tenant assigned"}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                        <button onClick={() => handleOpenDetails(p)} style={{ flex: 1, padding: "8px 10px", background: "#fff", border: `1px solid ${T.borderHover}`, borderRadius: 9999, color: T.textSecondary, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.color = T.accent; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = T.textSecondary; }}>
                          <Eye size={13} /> Details
                        </button>
                        {onNavigate && (
                          <button onClick={() => onNavigate("tenants")} style={{
                            padding: "8px 12px", background: p.occupied ? T.emeraldSoft : T.accentSoft,
                            border: `1px solid ${p.occupied ? T.emeraldBorder : T.accentBorder}`,
                            borderRadius: 9999, color: p.occupied ? T.emerald : T.accent, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <Users size={13} /> {p.occupied ? "Tenant" : "Assign"}
                          </button>
                        )}
                        <button onClick={() => handleOpenEdit(p)} aria-label="Edit" style={{ padding: "8px 12px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9999, color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.borderHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border; }}>
                          <Edit size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <Building size={40} color={T.textMuted} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                <p style={{ color: T.textSecondary, fontSize: "0.95rem", fontWeight: 600 }}>No rental units matched your search</p>
                <p style={{ color: T.textMuted, fontSize: "0.8rem", marginTop: 4 }}>Try clearing search keywords or the status filter.</p>
              </div>
            )}
          </div>

          {/* ACTIVITY + TASKS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
            <SectionCard title="Activity & audit log" subtitle="Real-time record of portfolio actions" action={<Activity size={18} color={T.accent} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {(activities && activities.length > 0
                  ? activities.map((a) => ({ key: a.id, title: a.activity_description, time: formatTimeAgo(a.created_at), type: a.activity_type }))
                  : []
                ).map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem", background: T.surfaceAlt, borderRadius: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: item.type === "finance" ? T.emeraldSoft : item.type === "compliance" ? T.purpleSoft : T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.type === "finance" ? <DollarSign size={16} color={T.emerald} /> : item.type === "compliance" ? <Shield size={16} color={T.purple} /> : <Building size={16} color={T.accent} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.83rem", color: T.textPrimary, fontWeight: 600, lineHeight: 1.35 }}>{item.title}</p>
                      <p style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: 2 }}>{item.time}</p>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.95rem", background: T.surfaceAlt, borderRadius: 12, border: `1px dashed ${T.border}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Activity size={16} color={T.accent} />
                    </div>
                    <p style={{ fontSize: "0.83rem", color: T.textMuted }}>
                      No activity recorded yet. Actions you take — publishing listings, updating units or uploading documents — will appear here.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Operational task queue"
              subtitle="Key responsibilities & compliance deadlines"
              action={<span style={{ fontSize: "0.72rem", color: T.emerald, fontWeight: 700, background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, padding: "4px 11px", borderRadius: 9999 }}>{tasks.filter((t) => t.completed).length} of {tasks.length} done</span>}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tasks.length === 0 ? (
                  <p style={{ fontSize: "0.78rem", color: T.textMuted, padding: "0.5rem 0" }}>
                    No tasks yet. Operational reminders and compliance deadlines will appear here.
                  </p>
                ) : tasks.map((task) => (
                  <div key={task.id} onClick={() => toggleTask(task.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1rem",
                    background: task.completed ? "#f0fdf4" : T.surfaceAlt,
                    borderRadius: 12, border: `1px solid ${task.completed ? T.emeraldBorder : T.border}`,
                    cursor: "pointer", transition: "all 0.15s", opacity: task.completed ? 0.75 : 1,
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${task.completed ? T.emerald : T.textMuted}`, background: task.completed ? T.emerald : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {task.completed && <Check size={13} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.83rem", fontWeight: 600, color: T.textPrimary, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: "0.68rem" }}>
                        <span style={{ color: T.accent, fontWeight: 600 }}>{task.category}</span>
                        <span style={{ color: T.textMuted }}>· Due {task.due}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
};
