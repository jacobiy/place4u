import { ArrowUpRight } from "lucide-react";
import { T } from "../Styles/designTokens";
import * as Icons from "lucide-react";

export const StatCard = ({ label, value, change, trend, icon: IconName }) => {
  const Icon = Icons[IconName] || Icons.Activity;

  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: "0.875rem",
        padding: "1.25rem 1.5rem",
        transition: "all 0.2s",
        cursor: "default"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.cardBgHover;
        e.currentTarget.style.borderColor = T.borderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.cardBg;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: T.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Icon size={16} color={T.accent} />
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: T.textMuted,
              fontWeight: 500
            }}
          >
            {label}
          </span>
        </div>
        {trend !== "neutral" && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: trend === "up" ? T.emerald : T.red,
              background: trend === "up" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              padding: "2px 8px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <ArrowUpRight size={10} style={{ transform: trend === "up" ? "none" : "rotate(90deg)" }} />
            {change}
          </span>
        )}
      </div>
      <p style={{ fontSize: "1.75rem", fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.04em", lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
};

