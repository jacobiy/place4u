import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import * as Icons from "lucide-react";
import { T, SERIF } from "../Styles/designTokens";

/* Unified premium stat card (replaces the old shared + local duplicates). */
export const StatCard = ({ label, value, change, trend = "neutral", icon: IconName = "Activity", accent = T.accent, hint, style = {} }) => {
  const Icon = Icons[IconName] || Icons.Activity;
  const up = trend === "up";

  return (
    <div
      className="ll-card-hover"
      style={{
        background: "#ffffff",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        padding: "1.35rem 1.45rem",
        boxShadow: T.shadow,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 110,
          height: 110,
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${accent}1f 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.9rem", position: "relative" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "0.85rem",
            background: `${accent}1a`,
            border: `1px solid ${accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={19} color={accent} />
        </div>
        {trend !== "neutral" && change && (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: up ? T.emerald : T.red,
              background: up ? T.emeraldSoft : T.redSoft,
              border: `1px solid ${up ? T.emeraldBorder : T.redBorder}`,
              padding: "3px 9px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {change}
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: T.textMuted, fontWeight: 700, margin: "0 0 0.4rem" }}>
        {label}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: "2rem", color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.05, margin: 0 }}>{value}</p>
      {hint && <p style={{ fontSize: "0.75rem", color: T.textMuted, margin: "0.45rem 0 0" }}>{hint}</p>}
    </div>
  );
};

export default StatCard;
