// Design tokens for the Agent console.
//
// Direction: a dark "control room" for placement agents — navy-ink surfaces,
// a single azure accent, semantic status colours only, hairline rules and
// tabular figures. Legacy keys are preserved so existing inline styles across
// the portal keep rendering.

export const T = {
  // Legacy palette (kept for compatibility)
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
  surface: "rgba(255,255,255,0.06)",

  // Refined system
  ink: "#070b14",
  ink2: "#0b1120",
  ink3: "#101827",
  panel: "rgba(255,255,255,0.035)",
  panelHover: "rgba(255,255,255,0.055)",
  line: "rgba(148,163,184,0.14)",
  lineStrong: "rgba(148,163,184,0.24)",
  gold: "#f5b64a",
  info: "#38bdf8",
  text: "#eaf0f9",
  muted: "#94a3b8",
  dim: "#64748b",
  accentLight: "#7da2ff",
  accentSoft: "rgba(79,126,248,0.12)",
  accentLine: "rgba(79,126,248,0.38)",
  fontDisplay: "'Sora', 'Plus Jakarta Sans', sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
};

export const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  /* These resets MUST live in @layer base. Tailwind v4 emits its utilities
     inside @layer utilities, and an *unlayered* rule beats a layered one no
     matter how specific the utility is. Left unlayered, the margin/padding
     reset below silently wiped every p-*/m-* utility in the light
     PropertyDetailView (and the forced input colour hid form text). Scoping
     them to @layer base restores the normal Tailwind cascade while keeping
     the dark console chrome exactly as it was. */
  @layer base {
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #070b14;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #eaf0f9;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.22); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.36); }

    input, select, textarea { color: #eaf0f9; background: transparent; }
    input::placeholder, textarea::placeholder { color: #64748b; }
    option { background: #0f1729; color: #eaf0f9; }

    ::selection { background: rgba(79,126,248,0.35); color: #ffffff; }
  }

  /* Scoped to the agent console so the public/tenant surfaces are untouched. */
  .agent-console {
    --ag-ink: #070b14;
    --ag-ink-2: #0b1120;
    --ag-ink-3: #101827;
    --ag-panel: rgba(255,255,255,0.035);
    --ag-panel-2: rgba(255,255,255,0.055);
    --ag-line: rgba(148,163,184,0.14);
    --ag-line-2: rgba(148,163,184,0.24);
    --ag-accent: #4f7ef8;
    --ag-accent-2: #7da2ff;
    --ag-accent-soft: rgba(79,126,248,0.12);
    --ag-accent-line: rgba(79,126,248,0.38);
    --ag-ok: #10b981;
    --ag-warn: #f59e0b;
    --ag-danger: #ef4444;
    --ag-info: #38bdf8;
    --ag-text: #eaf0f9;
    --ag-muted: #94a3b8;
    --ag-dim: #64748b;
    --ag-radius: 18px;
    --ag-radius-sm: 12px;
    --ag-radius-xs: 10px;
    --ag-shadow: 0 24px 48px -34px rgba(2,6,23,0.95);
    --ag-font-display: 'Sora', 'Plus Jakarta Sans', sans-serif;
    --ag-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  }

  /* Display face for titles / figures */
  .agent-console .ag-display,
  .agent-console h1, .agent-console h2, .agent-console h3 {
    font-family: var(--ag-font-display);
  }

  .ag-num { font-family: var(--ag-font-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

  .agent-console :focus-visible {
    outline: 2px solid var(--ag-accent);
    outline-offset: 2px;
    border-radius: 8px;
  }

  @media (prefers-reduced-motion: reduce) {
    .agent-console *, .agent-console *::before, .agent-console *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;
