import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

export const PropertyDetailsModal = ({ isOpen, onClose, property }) => {
  if (!property) return null;

  const field = (label, value) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", padding: "0.875rem 1rem" }}>
      <span
        style={{
          fontSize: "0.68rem",
          color: T.textMuted,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }}
      >
        {label}
      </span>
      <p style={{ fontWeight: 500, color: T.textPrimary, marginTop: "4px", fontSize: "0.9rem" }}>{value}</p>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Property Details" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <img
          src={property.image}
          alt={property.name}
          style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "0.75rem" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {field("Property Name", property.name)}
          {field("Location", property.location)}
          {field("Monthly Rent", property.rent)}
          {field("Size", property.size)}
          {field("Bedrooms", property.bedrooms)}
          {field("Bathrooms", property.bathrooms)}
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", padding: "1rem" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textSecondary, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Current Tenants
          </p>
          {property.tenants?.length > 0 ? (
            property.tenants.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: "0.875rem", color: T.textPrimary }}>{t}</span>
                <span style={{ fontSize: "0.75rem", color: T.emerald, fontWeight: 500 }}>Active</span>
              </div>
            ))
          ) : (
            <p style={{ fontSize: "0.875rem", color: T.textMuted }}>No tenants currently</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <PrimaryBtn style={{ flex: 1 }}>Edit Property</PrimaryBtn>
          <SecondaryBtn style={{ flex: 1 }}>View Documents</SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};

