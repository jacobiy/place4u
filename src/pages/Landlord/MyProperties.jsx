import { useState } from "react";
import { Search, Download, Plus, Building, AlertCircle, MailOpen } from "lucide-react";
import { T } from './Styles/designTokens';
import { StatCard } from './Component/StatCard';
import { PropertyCard } from './Component/PropertyCard';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { PropertyDetailsModal } from './Component/PropertyDetailsModal';
import { EditPropertyModal } from './Component/EditPropertyModal';

export const MyProperties = ({ 
  properties, 
  stats, 
  onAddProperty,
  onEditProperty,
  onViewDetails 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const inputStyle = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: "0.625rem", padding: "0.6rem 0.875rem",
    fontSize: "0.85rem", color: T.textPrimary, outline: "none", fontFamily: "inherit"
  };

  const filteredProps = (properties || []).filter(p => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "occupied" && p.occupied) || (filterStatus === "vacant" && !p.occupied);
    return matchSearch && matchStatus;
  });

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  const handleSaveEdit = (updatedProperty) => {
    onEditProperty(updatedProperty);
    setShowEditModal(false);
  };

  return (
    <>
      <PropertyDetailsModal 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)} 
        property={selectedProperty} 
      />
      <EditPropertyModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        property={selectedProperty} 
        onSave={handleSaveEdit} 
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            My Properties
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Manage your rental portfolio and track performance</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <SecondaryBtn>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Download size={14} /> Export
            </span>
          </SecondaryBtn>
          <PrimaryBtn onClick={onAddProperty}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} /> Add Property
            </span>
          </PrimaryBtn>
        </div>
      </div>

      {/* Portfolio Performance */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Portfolio Performance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Recent Activity</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <div style={{
            background: T.amber, color: T.navy, padding: "10px 16px",
            borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500,
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <AlertCircle size={16} /> Garden Flat is vacant. Action needed.
          </div>
          <div style={{
            background: T.accent, color: "#fff", padding: "10px 16px",
            borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500,
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <MailOpen size={16} /> New message from Sarah Williams.
          </div>
        </div>
      </div>

      {/* Property Listings */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary }}>Your Properties</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text" placeholder="Search by name or location…"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: "100%", paddingLeft: "36px" }}
              />
            </div>
            <select
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputStyle, paddingRight: "1rem" }}
            >
              <option value="all">All Properties</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
          </div>
        </div>

        {filteredProps.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {filteredProps.map(p => (
              <PropertyCard 
                key={p.id} 
                property={p}
                onEdit={handleEdit}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <Building size={48} color={T.textMuted} style={{ margin: "0 auto 1rem" }} />
            {(!properties || properties.length === 0) && !searchQuery && filterStatus === "all" ? (
              <>
                <p style={{ fontSize: "1rem", fontWeight: 500, color: T.textSecondary }}>No properties yet</p>
                <p style={{ fontSize: "0.85rem", color: T.textMuted, marginTop: "4px" }}>Upload your first property to start receiving applications and messages.</p>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
                  <PrimaryBtn onClick={onAddProperty}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Plus size={14} /> Add Property
                    </span>
                  </PrimaryBtn>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "1rem", fontWeight: 500, color: T.textSecondary }}>No properties found</p>
                <p style={{ fontSize: "0.85rem", color: T.textMuted, marginTop: "4px" }}>Try adjusting your search or add a new property</p>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
