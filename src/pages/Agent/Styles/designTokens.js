export const T = {
  navy: "#0f1629",
  navyMid: "#1a2540",
  navyLight: "#243052",
  accent: "#4f7ef8",
  accentHover: "#3d6be0",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.13)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBgHover: "rgba(255,255,255,0.07)",
  surface: "rgba(255,255,255,0.06)"
};

export const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1629; font-family: 'DM Sans', sans-serif; color: #f1f5f9; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
  input, select, textarea { color: #f1f5f9 !important; background: transparent; }
  input::placeholder, textarea::placeholder { color: #64748b; }
  option { background: #1a2540; color: #f1f5f9; }
`;

