import { T } from '../styles/designTokens';

export const PrimaryBtn = ({ children, onClick, style={} }) => (
  <button
    onClick={onClick}
    style={{
      padding:"0.6rem 1.25rem", background:T.accent, border:"none",
      borderRadius:"0.625rem", fontSize:"0.85rem", fontWeight:500,
      color:"#fff", cursor:"pointer", fontFamily:"inherit",
      transition:"background 0.15s, transform 0.1s", ...style
    }}
    onMouseEnter={(e)=>{ e.currentTarget.style.background=T.accentHover; e.currentTarget.style.transform="scale(1.01)"; }}
    onMouseLeave={(e)=>{ e.currentTarget.style.background=T.accent; e.currentTarget.style.transform="scale(1)"; }}
  >{children}</button>
);

export const SecondaryBtn = ({ children, onClick, style={} }) => (
  <button
    onClick={onClick}
    style={{
      padding:"0.6rem 1.25rem", background:"transparent",
      border:`1px solid ${T.border}`, borderRadius:"0.625rem",
      fontSize:"0.85rem", fontWeight:500, color:T.textSecondary,
      cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", ...style
    }}
    onMouseEnter={(e)=>{ e.currentTarget.style.background=T.surface; e.currentTarget.style.borderColor=T.borderHover; }}
    onMouseLeave={(e)=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor=T.border; }}
  >{children}</button>
);