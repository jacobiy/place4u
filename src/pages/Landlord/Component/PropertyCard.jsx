import { MapPin, Bed, Bath, Square, BadgeCheck, AlertCircle, Edit, Eye, EyeOff, FileText } from "lucide-react";
import { T } from "../Styles/designTokens";
import { getApprovalMeta, countDocs } from "../Styles/approval";

export const PropertyCard = ({ property, onEdit, onViewDetails, onUploadDocuments }) => {
  const status = (() => {
    if (typeof property?.occupied === "boolean") {
      return {
        label: property.occupied ? "Occupied" : "Vacant",
        color: property.occupied ? "#047857" : "#b45309",
        icon: property.occupied ? BadgeCheck : AlertCircle,
      };
    }
    if (typeof property?.is_active === "boolean") {
      return { label: property.is_active ? "Active" : "Inactive", color: property.is_active ? "#047857" : "#b91c1c", icon: property.is_active ? Eye : EyeOff };
    }
    return { label: "Active", color: "#047857", icon: Eye };
  })();
  const StatusIcon = status.icon;
  const approval = getApprovalMeta(property?.approval_status);
  const docCount = countDocs(property?.documents);

  return (
    <article
      onClick={() => onViewDetails(property)}
      style={{
        display: "grid",
        gridTemplateColumns: "84px minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem 0",
        borderTop: `1px solid ${T.border}`,
        cursor: "pointer",
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onViewDetails(property);
        }
      }}
    >
      <img
        src={property.image || "/property-placeholder.svg"}
        alt={property.name || "Property"}
        style={{ width: 84, height: 72, objectFit: "cover", background: T.surfaceAlt }}
      />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 650, color: T.textPrimary }}>{property.name || "Untitled property"}</h3>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: approval.color }}>{approval.short}</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: status.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <StatusIcon size={12} />{status.label}
          </span>
        </div>
        <p style={{ margin: "4px 0 8px", fontSize: "0.8rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={12} />{property.location || "Location not provided"}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: "0.74rem", color: T.textSecondary }}>
          <strong style={{ fontSize: "0.9rem", color: T.textPrimary }}>{property.rent || "Rent not set"}</strong>
          {property.bedrooms != null && <span><Bed size={12} style={{ verticalAlign: "-2px" }} /> {property.bedrooms} bd</span>}
          {property.bathrooms != null && <span><Bath size={12} style={{ verticalAlign: "-2px" }} /> {property.bathrooms} ba</span>}
          {property.size && <span><Square size={12} style={{ verticalAlign: "-2px" }} /> {property.size}</span>}
          <span><FileText size={12} style={{ verticalAlign: "-2px" }} /> {docCount} document{docCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(property); }} aria-label="Edit property" title="Edit property" style={{ background: "transparent", border: `1px solid ${T.border}`, padding: 8, cursor: "pointer", color: T.textSecondary }}>
          <Edit size={15} />
        </button>
        {onUploadDocuments && (
          <button onClick={(e) => { e.stopPropagation(); onUploadDocuments(property); }} aria-label="Property documents" title="Upload or manage property documents" style={{ background: "transparent", border: `1px solid ${T.border}`, padding: 8, cursor: "pointer", color: docCount > 0 ? T.accent : T.textSecondary }}>
            <FileText size={15} />
          </button>
        )}
      </div>
    </article>
  );
};

export default PropertyCard;
