import { T } from "../Styles/designTokens";

const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  padding: "0.62rem 1.15rem",
  borderRadius: "9999px",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
};

export const PrimaryBtn = ({ children, onClick, style = {}, disabled, type = "button" }) => (
  <button
    type={type}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      ...base,
      background: disabled ? "rgba(2,132,199,0.35)" : "linear-gradient(135deg,#0ea5e9 0%,#0284c7 70%)",
      border: "none",
      color: "#fff",
      boxShadow: disabled ? "none" : "0 10px 24px -10px rgba(2,132,199,0.7)",
      cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = "0 14px 30px -10px rgba(2,132,199,0.8)";
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 10px 24px -10px rgba(2,132,199,0.7)";
    }}
  >
    {children}
  </button>
);

export const SecondaryBtn = ({ children, onClick, style = {}, disabled, type = "button" }) => (
  <button
    type={type}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      ...base,
      background: "#ffffff",
      border: `1px solid ${T.borderHover}`,
      color: T.textSecondary,
      boxShadow: T.shadowSm,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = "#f0f9ff";
      e.currentTarget.style.borderColor = "#7dd3fc";
      e.currentTarget.style.color = T.textPrimary;
      e.currentTarget.style.transform = "translateY(-1px)";
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = "#ffffff";
      e.currentTarget.style.borderColor = T.borderHover;
      e.currentTarget.style.color = T.textSecondary;
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    {children}
  </button>
);

export const GhostBtn = ({ children, onClick, style = {}, disabled }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      ...base,
      background: "transparent",
      border: "none",
      color: T.accent,
      padding: "0.5rem 0.85rem",
      ...style,
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = T.accentSofter; }}
    onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = "transparent"; }}
  >
    {children}
  </button>
);

export const IconBtn = ({ children, onClick, title, style = {}, disabled }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    title={title}
    disabled={disabled}
    aria-label={title}
    style={{
      width: 36,
      height: 36,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      background: "#ffffff",
      border: `1px solid ${T.borderHover}`,
      color: T.textSecondary,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s",
      ...style,
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.color = T.accent; } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = T.textSecondary; } }}
  >
    {children}
  </button>
);
