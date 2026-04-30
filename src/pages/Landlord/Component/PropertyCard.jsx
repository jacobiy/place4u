import { useState } from "react";
import { MapPin, Bed, Bath, Square, BadgeCheck, AlertCircle, Edit } from "lucide-react";
import { T } from '../styles/designTokens';

export const PropertyCard = ({ property, onEdit, onViewDetails }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onViewDetails(property)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.cardBgHover : T.cardBg,
        border:`1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius:"1rem", overflow:"hidden", cursor:"pointer",
        transition:"all 0.25s", transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.4)" : "none",
        display:"flex", flexDirection:"column"
      }}
    >
      <div style={{ height:"180px", position:"relative", overflow:"hidden" }}>
        <img
          src={property.image} alt={property.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.4s", transform: hovered ? "scale(1.06)" : "scale(1)" }}
        />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(15,22,41,0.85) 0%, transparent 55%)" }} />
        <span style={{
          position:"absolute", top:"12px", left:"12px",
          fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.06em",
          padding:"4px 12px", borderRadius:"20px",
          background: property.occupied ? T.emerald : T.amber,
          color:"#fff", display:"flex", alignItems:"center", gap:"4px"
        }}>
          {property.occupied ? <BadgeCheck size={12} /> : <AlertCircle size={12} />}
          {property.occupied ? "OCCUPIED" : "VACANT"}
        </span>
        <div style={{ position:"absolute", bottom:"12px", right:"12px", display:"flex", gap:"6px" }}>
          <button
            onClick={(e)=>{ e.stopPropagation(); onEdit(property); }}
            style={{
              background:"rgba(255,255,255,0.12)", backdropFilter:"blur(4px)",
              border:"1px solid rgba(255,255,255,0.2)", borderRadius:"6px",
              padding:"6px", cursor:"pointer", display:"flex"
            }}
          >
            <Edit size={12} color="#fff" />
          </button>
        </div>
        <p style={{
          position:"absolute", bottom:"12px", left:"12px",
          fontSize:"0.95rem", fontWeight:600, color:"#fff"
        }}>{property.name}</p>
      </div>

      <div style={{ padding:"16px", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
          <span style={{ fontSize:"0.75rem", color:T.textMuted, display:"flex", alignItems:"center", gap:"3px" }}>
            <MapPin size={11} color={T.accent} /> {property.location}
          </span>
          <span style={{ fontSize:"1.1rem", fontWeight:700, color:T.accent, letterSpacing:"-0.03em" }}>
            {property.rent}
          </span>
        </div>

        <div style={{
          display:"flex", gap:"8px", marginTop:"auto", paddingTop:"12px", borderTop:`1px solid ${T.border}`
        }}>
          {[
            { icon: <Bed size={11} color={T.accent} />, val: `${property.bedrooms} bd` },
            { icon: <Bath size={11} color={T.accent} />, val: `${property.bathrooms} ba` },
            { icon: <Square size={11} color={T.accent} />, val: property.size }
          ].map(({ icon, val }, i) => (
            <span key={i} style={{
              display:"flex", alignItems:"center", gap:"3px",
              fontSize:"0.7rem", color:T.textSecondary,
              background:T.surface, padding:"3px 8px", borderRadius:"6px"
            }}>
              {icon} {val}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};