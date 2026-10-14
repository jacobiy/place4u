/* ------------------------------------------------------------------ *
 *  Place4U · Landlord design tokens — "Sky Editorial" (light)
 *  Editorial white surfaces, light-blue washes, one confident blue,
 *  DM Serif Display for display type, Plus Jakarta Sans for UI.
 * ------------------------------------------------------------------ */

export const T = {
  /* Brand / accent — sky */
  accent: "#0284c7",          // sky-600
  accentHover: "#0369a1",     // sky-700
  accentDeep: "#0c4a6e",      // sky-900
  accentSoft: "rgba(2,132,199,0.10)",
  accentSofter: "rgba(2,132,199,0.06)",
  accentBorder: "rgba(2,132,199,0.24)",
  blue: "#2563eb",

  /* Semantic */
  emerald: "#059669",
  emeraldSoft: "rgba(5,150,105,0.10)",
  emeraldBorder: "rgba(5,150,105,0.24)",
  amber: "#d97706",
  amberSoft: "rgba(217,119,6,0.10)",
  amberBorder: "rgba(217,119,6,0.26)",
  red: "#dc2626",
  redSoft: "rgba(220,38,38,0.10)",
  redBorder: "rgba(220,38,38,0.24)",
  purple: "#7c3aed",
  purpleSoft: "rgba(124,58,237,0.10)",
  purpleBorder: "rgba(124,58,237,0.24)",

  /* Surfaces (light) */
  navy: "#faf8ff",            // page wash (kept for compatibility)
  navyMid: "#ffffff",         // card / panel surface (kept for compatibility)
  navyLight: "#f1f5f9",
  page: "#faf8ff",
  cardBg: "#ffffff",
  cardBgHover: "#f8fbff",
  surface: "#f1f5f9",
  surfaceAlt: "#f8fafc",
  surfaceTint: "#f0f9ff",

  /* Text (ink on light) */
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",

  /* Borders */
  border: "#e6eefb",
  borderHover: "#bae6fd",
  borderStrong: "#cbd5e1",

  /* Elevation */
  shadowSm: "0 1px 2px rgba(15,23,42,0.05)",
  shadow: "0 12px 40px -18px rgba(2,132,199,0.22)",
  shadowLg: "0 24px 60px -20px rgba(2,132,199,0.30)",

  /* Radii */
  radiusSm: "0.75rem",
  radius: "1rem",
  radiusLg: "1.5rem",
  radiusXl: "2rem",
};

/* Dark chrome — sidebar & dark header surfaces (unchanged identity) */
export const CHROME = {
  bg: "#0f1629",
  bgMid: "#131c31",
  bgLight: "#1a2540",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.16)",
  surface: "rgba(255,255,255,0.06)",
  surfaceHover: "rgba(255,255,255,0.10)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#4f7ef8",
  accentSoft: "rgba(79,126,248,0.15)",
};

/* Reusable style objects (spread into inline styles) */
export const CARD = {
  background: "#ffffff",
  border: `1px solid ${T.border}`,
  borderRadius: T.radiusLg,
  boxShadow: T.shadow,
};

export const CARD_RAISED = {
  ...CARD,
  boxShadow: T.shadowLg,
};

export const INPUT = {
  width: "100%",
  padding: "0.625rem 0.85rem",
  background: "#ffffff",
  border: `1px solid ${T.borderStrong}`,
  borderRadius: "0.75rem",
  color: T.textPrimary,
  fontSize: "0.875rem",
  fontFamily: "inherit",
  outline: "none",
};

export const SERIF = "'DM Serif Display', Georgia, serif";

/* Convenience gradient used across the module */
export const GRADIENT_BAR = "linear-gradient(90deg, #7dd3fc 0%, #0ea5e9 50%, #2563eb 100%)";
export const GRADIENT_BTN = "linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #0369a1 100%)";

/* ------------------------------------------------------------------ *
 *  Global styles injected by the landlord shell. Kept light + safe.
 * ------------------------------------------------------------------ */
export const globalStyle = `
  .ll-serif { font-family: ${SERIF}; }
  .ll-scope { color: ${T.textPrimary}; }

  .ll-scope ::-webkit-scrollbar { width: 8px; height: 8px; }
  .ll-scope ::-webkit-scrollbar-track { background: transparent; }
  .ll-scope ::-webkit-scrollbar-thumb { background: rgba(2,132,199,0.22); border-radius: 9999px; }
  .ll-scope ::-webkit-scrollbar-thumb:hover { background: rgba(2,132,199,0.38); }

  .ll-scope input, .ll-scope select, .ll-scope textarea {
    color: ${T.textPrimary};
    font-family: inherit;
  }
  .ll-scope input::placeholder, .ll-scope textarea::placeholder { color: #9aa8bd; }
  .ll-scope input:focus, .ll-scope select:focus, .ll-scope textarea:focus {
    outline: none;
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(2,132,199,0.14);
  }
  .ll-scope select option { background: #ffffff; color: ${T.textPrimary}; }

  @keyframes llFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes llFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes llPop {
    0%   { opacity: 0; transform: scale(0.94) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes llFloat {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes llSlideIn {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes llToast {
    from { opacity: 0; transform: translateY(16px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes llPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(0.85); }
  }

  .ll-anim-up { animation: llFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .ll-anim-in { animation: llFadeIn 0.4s ease both; }
  .ll-anim-pop { animation: llPop 0.32s cubic-bezier(0.16,1,0.3,1) both; }
  .ll-live-dot {
    width: 7px; height: 7px; border-radius: 9999px; background: #10b981;
    box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
    animation: llPulse 2s infinite ease-in-out;
  }
  .ll-card-hover { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.25s; }
  .ll-card-hover:hover { transform: translateY(-4px); box-shadow: 0 26px 60px -22px rgba(2,132,199,0.38); border-color: #bae6fd; }
  .ll-img-zoom img { transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
  .ll-img-zoom:hover img { transform: scale(1.06); }
`;
