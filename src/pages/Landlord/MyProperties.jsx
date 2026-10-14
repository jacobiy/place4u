import { useState } from "react";
import { Search, Download, Plus, Building, Edit, Activity, FileText, ShieldCheck, Clock } from "lucide-react";
import { T, SERIF } from './Styles/designTokens';
import { StatCard } from './Component/StatCard';
import { PropertyCard } from './Component/PropertyCard';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { PropertyDetailsModal } from './Component/PropertyDetailsModal';
import { EditPropertyModal } from './Component/EditPropertyModal';
import { PropertyDocumentsModal } from './Component/PropertyDocumentsModal';

const APPROVAL_FILTERS = [
  { value: "all", label: "All listings" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const getActivityIcon = (type) => {
  switch (type) {
    case 'property_created': return Plus;
    case 'property_updated': return Edit;
    case 'property_submitted': return ShieldCheck;
    default: return Activity;
  }
};

const inputStyle = {
  background: "#fff",
  border: `1px solid ${T.border}`,
  borderRadius: 9999,
  padding: "0.6rem 0.9rem",
  fontSize: "0.85rem",
  color: T.textPrimary,
  outline: "none",
  fontFamily: "inherit",
};

export const MyProperties = ({
  properties, stats = [], activities = [], user,
  onAddProperty, onEditProperty, onViewDetails, onNavigate,
  onSubmitForApproval, onRefreshProperties, onPropertySubmitted
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const filteredProps = (properties || []).filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.location || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "occupied" && p.occupied) || (filterStatus === "vacant" && !p.occupied);
    const matchApproval = filterApproval === "all" || (p.approval_status || "approved") === filterApproval;
    return matchSearch && matchStatus && matchApproval;
  });

  const needsAttention = (properties || []).filter((p) => ["draft", "rejected"].includes(p.approval_status || "approved")).length;
  const pendingCount = (properties || []).filter((p) => (p.approval_status || "approved") === "pending_approval").length;

  const handleEdit = (property) => { setSelectedProperty(property); setShowEditModal(true); };
  const handleViewDetails = (property) => { setSelectedProperty(property); setShowDetailsModal(true); };
  const handleSaveEdit = (updatedProperty) => { onEditProperty(updatedProperty); setShowEditModal(false); };
  const handleOpenDocs = (property) => { setSelectedProperty(property); setShowDocsModal(true); };
  const handleDocsChanged = async () => { await onRefreshProperties?.(); };

  const handleExport = () => {
    const list = properties || [];
    if (list.length === 0) return;
    const headers = ["ID", "Name", "Location", "Rent", "Status", "Bedrooms", "Bathrooms", "Size", "Tenants"];
    const rows = list.map((p) => [
      p.id, `"${p.name || ''}"`, `"${p.location || ''}"`, `"${p.rent || ''}"`,
      p.occupied ? "Occupied" : "Vacant", p.bedrooms || 0, p.bathrooms || 0, `"${p.size || ''}"`, `"${(p.tenants || []).join('; ')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Place4U_Properties_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="ll-scope" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <PropertyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        property={selectedProperty}
        onEdit={handleEdit}
        onUploadDocuments={handleOpenDocs}
        onSubmitForApproval={onSubmitForApproval}
        onViewDocuments={() => { if (onNavigate) onNavigate("documents"); }}
      />
      <EditPropertyModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} property={selectedProperty} onSave={handleSaveEdit} />
      <PropertyDocumentsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
        property={selectedProperty}
        user={user}
        onChanged={handleDocsChanged}
        onSubmitted={onPropertySubmitted}
      />

      {/* Portfolio performance */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>Portfolio performance</h2>
          <SecondaryBtn onClick={handleExport}><Download size={14} /> Export CSV</SecondaryBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1.1rem" }}>
          {(stats || []).map((s, i) => <StatCard key={i} {...s} />)}
        </div>
      </section>

      {/* Recent activity */}
      {activities.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: T.textPrimary, letterSpacing: "-0.01em", marginBottom: "1rem" }}>Recent activity</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.activity_type);
              return (
                <div key={activity.id} style={{
                  background: "#fff", border: `1px solid ${T.border}`, padding: "10px 15px", borderRadius: 9999,
                  fontSize: "0.83rem", fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
                  color: T.textPrimary, boxShadow: T.shadowSm,
                }}>
                  <IconComponent size={15} color={T.accent} />
                  {activity.activity_description}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Listings */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>Your properties</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", minWidth: 230 }}>
              <Search size={14} color={T.textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text" placeholder="Search by name or location…"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: "100%", paddingLeft: "2.4rem" }}
              />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle }}>
              <option value="all">All properties</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
            <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)} style={{ ...inputStyle }}>
              {APPROVAL_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <PrimaryBtn onClick={onAddProperty}><Plus size={15} /> Add Property</PrimaryBtn>
          </div>
        </div>

        {(needsAttention > 0 || pendingCount > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.accentSofter, border: `1px solid ${T.accentBorder}`, borderRadius: "1rem", padding: "0.85rem 1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: "#fff", border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {needsAttention > 0 ? <FileText size={16} color={T.accent} /> : <Clock size={16} color={T.accent} />}
            </span>
            <p style={{ fontSize: "0.83rem", color: T.textSecondary, lineHeight: 1.45, flex: 1, minWidth: 220 }}>
              {needsAttention > 0 && (
                <><strong style={{ color: T.textPrimary }}>{needsAttention} listing{needsAttention === 1 ? "" : "s"}</strong> need documents or changes before they can go live. </>
              )}
              {pendingCount > 0 && (
                <><strong style={{ color: T.textPrimary }}>{pendingCount}</strong> awaiting review by our team.</>
              )}
            </p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 700, color: T.emerald, background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, padding: "5px 11px", borderRadius: 9999 }}>
              <ShieldCheck size={13} /> Manual review
            </span>
          </div>
        )}

        {filteredProps.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {filteredProps.map((p) => (
              <PropertyCard key={p.id} property={p} onEdit={handleEdit} onViewDetails={handleViewDetails} onUploadDocuments={handleOpenDocs} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: T.accentSofter, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <Building size={28} color={T.accent} />
            </div>
            {(!properties || properties.length === 0) && !searchQuery && filterStatus === "all" ? (
              <>
                <p style={{ fontSize: "1.05rem", fontWeight: 700, color: T.textPrimary, fontFamily: SERIF }}>No properties yet</p>
                <p style={{ fontSize: "0.85rem", color: T.textMuted, marginTop: 4 }}>Upload your first property to start receiving tenant applications.</p>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
                  <PrimaryBtn onClick={onAddProperty}><Plus size={15} /> Add Property</PrimaryBtn>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "1.05rem", fontWeight: 700, color: T.textPrimary, fontFamily: SERIF }}>No properties found</p>
                <p style={{ fontSize: "0.85rem", color: T.textMuted, marginTop: 4 }}>Try adjusting your search or add a new property.</p>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyProperties;
