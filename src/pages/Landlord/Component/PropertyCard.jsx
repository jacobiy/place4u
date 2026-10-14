import { MapPin, Bed, Bath, Square, BadgeCheck, AlertCircle, Edit, Eye, EyeOff, FileText } from "lucide-react";
import { T, SERIF } from "../Styles/designTokens";
import { getApprovalMeta, countDocs } from "../Styles/approval";

export const PropertyCard = ({ property, onEdit, onViewDetails, onUploadDocuments }) => {
  const status = (() => {
    if (typeof property?.occupied === "boolean") {
      return {
        label: property.occupied ? "OCCUPIED" : "VACANT",
        color: property.occupied ? "#059669" : "#d97706",
        icon: property.occupied ? BadgeCheck : AlertCircle,
      };
    }
    if (typeof property?.is_active === "boolean") {
      return { label: property.is_active ? "ACTIVE" : "INACTIVE", color: property.is_active ? "#059669" : "#dc2626", icon: property.is_active ? Eye : EyeOff };
    }
    return { label: "ACTIVE", color: "#059669", icon: Eye };
  })();
  const StatusIcon = status.icon;
  const approval = getApprovalMeta(property?.approval_status);
  const docCount = countDocs(property?.documents);

  return (
    <div
      onClick={() => onViewDetails(property)}
      className="ll-card-hover ll-img-zoom"
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: T.shadow,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: "190px", position: "relative", overflow: "hidden" }}>
        <img src={property.image} alt={property.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.72) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <span style={{
            fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.05em",
            padding: "4px 11px", borderRadius: 9999, background: approval.color, color: "#fff",
          }}>
            {approval.short}
          </span>
          <span style={{
            fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em",
            padding: "3px 9px", borderRadius: 9999, background: status.color, color: "#fff",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <StatusIcon size={11} />{status.label}
          </span>
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(property); }}
            aria-label="Edit property"
            title="Edit property"
            style={{
              background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.6)", borderRadius: 9999, padding: 7,
              cursor: "pointer", display: "flex",
            }}
          >
            <Edit size={13} color={T.textPrimary} />
          </button>
          {onUploadDocuments && (
            <button
              onClick={(e) => { e.stopPropagation(); onUploadDocuments(property); }}
              aria-label="Property documents"
              title="Upload / manage property documents"
              style={{
                background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.6)", borderRadius: 9999, padding: 7,
                cursor: "pointer", display: "flex",
              }}
            >
              <FileText size={13} color={docCount > 0 ? T.accent : T.textPrimary} />
            </button>
          )}
        </div>
        <p style={{ position: "absolute", bottom: 12, left: 14, fontFamily: SERIF, fontSize: "1.2rem", color: "#fff" }}>{property.name}</p>
      </div>

      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: "0.75rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} color={T.accent} /> {property.location || "—"}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: "1.15rem", color: T.accent, letterSpacing: "-0.02em" }}>{property.rent}</span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          {[
            { icon: <Bed size={12} color={T.accent} />, val: `${property.bedrooms} bd` },
            { icon: <Bath size={12} color={T.accent} />, val: `${property.bathrooms} ba` },
            { icon: <Square size={12} color={T.accent} />, val: property.size },
            { icon: <FileText size={12} color={docCount > 0 ? T.accent : T.textMuted} />, val: `${docCount} doc${docCount === 1 ? "" : "s"}` },
          ].map(({ icon, val }, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: T.textSecondary, background: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "3px 9px", borderRadius: 9999 }}>
              {icon} {val}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
