import { useEffect } from "react";
import { X } from "lucide-react";
import { T, SERIF } from "../Styles/designTokens";

export const Modal = ({ isOpen, onClose, title, subtitle, children, footer, size = "md", accent = T.accent }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = {
    sm: "28rem",
    md: "34rem",
    lg: "48rem",
    xl: "68rem",
    full: "min(96vw, 92rem)",
  }[size] || "34rem";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120 }} className="ll-scope">
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.38)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: "llFadeIn 0.25s ease both",
        }}
      />
      <div style={{ position: "fixed", inset: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", minHeight: "100%", alignItems: "center", justifyContent: "center", padding: "clamp(0.5rem, 2vw, 1.25rem)" }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: maxW,
              background: "#ffffff",
              borderRadius: "1.5rem",
              border: `1px solid ${T.border}`,
              boxShadow: "0 40px 100px -30px rgba(2,132,199,0.45)",
              display: "flex",
              flexDirection: "column",
              height: size === "full" ? "calc(100dvh - clamp(0.75rem, 2vw, 1.5rem))" : "auto",
              maxHeight: "calc(100dvh - clamp(1rem, 4vw, 2.5rem))",
              overflow: "hidden",
              animation: "llPop 0.32s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <div style={{ height: 5, background: `linear-gradient(90deg, #7dd3fc 0%, ${accent} 60%, #2563eb 100%)`, flexShrink: 0 }} />
            <div
              style={{
                padding: "clamp(0.9rem, 3vw, 1.35rem) clamp(1rem, 3.5vw, 1.6rem)",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                background: "#ffffff",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: "clamp(1.15rem, 3vw, 1.5rem)", color: T.textPrimary, letterSpacing: "-0.01em", margin: 0 }}>
                  {title}
                </h3>
                {subtitle && <p style={{ fontSize: "0.78rem", color: T.textMuted, margin: "0.25rem 0 0" }}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 38, height: 38, flexShrink: 0,
                  borderRadius: "9999px",
                  background: "#ffffff",
                  border: `1px solid ${T.borderHover}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.borderColor = "#7dd3fc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = T.borderHover; }}
              >
                <X size={17} color={T.textSecondary} />
              </button>
            </div>
            <div style={{ padding: "clamp(1rem, 3vw, 1.6rem)", overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
              {children}
            </div>
            {footer && (
              <div
                style={{
                  padding: "clamp(0.85rem, 3vw, 1.15rem) clamp(1rem, 3.5vw, 1.6rem)",
                  borderTop: `1px solid ${T.border}`,
                  background: "#f8fbff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
