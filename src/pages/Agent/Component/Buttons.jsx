import { T } from "../Styles/designTokens";

export const PrimaryBtn = ({ children, onClick, style = {}, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      padding: "0.6rem 1.25rem",
      background: disabled ? "rgba(79,126,248,0.35)" : T.accent,
      border: "none",
      borderRadius: "0.625rem",
      fontSize: "0.85rem",
      fontWeight: 500,
      color: "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      transition: "background 0.15s, transform 0.1s",
      ...style
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = T.accentHover;
      e.currentTarget.style.transform = "scale(1.01)";
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = T.accent;
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    {children}
  </button>
);

export const SecondaryBtn = ({ children, onClick, style = {}, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      padding: "0.6rem 1.25rem",
      background: "transparent",
      border: `1px solid ${T.border}`,
      borderRadius: "0.625rem",
      fontSize: "0.85rem",
      fontWeight: 500,
      color: T.textSecondary,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      transition: "all 0.15s",
      opacity: disabled ? 0.7 : 1,
      ...style
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = T.surface;
      e.currentTarget.style.borderColor = T.borderHover;
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = T.border;
    }}
  >
    {children}
  </button>
);

