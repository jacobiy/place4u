import { useEffect } from "react";
import { X } from "lucide-react";
import { T } from "../Styles/designTokens";

export const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = {
    sm: "28rem",
    md: "32rem",
    lg: "48rem",
    xl: "68rem",
    full: "min(96vw, 92rem)"
  }[size] || "32rem";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)"
        }}
      />
      <div style={{ position: "fixed", inset: 0, overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100%",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(0.5rem, 2vw, 1rem)"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: maxW,
              background: T.navyMid,
              borderRadius: "1rem",
              border: `1px solid ${T.border}`,
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              height: size === "full" ? "calc(100dvh - clamp(0.75rem, 2vw, 1.5rem))" : "auto",
              maxHeight: "calc(100dvh - clamp(1rem, 4vw, 2.5rem))",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "clamp(0.85rem, 3vw, 1.25rem) clamp(1rem, 3.5vw, 1.5rem)",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "1rem 1rem 0 0",
                background: "rgba(79,126,248,0.06)",
                flexShrink: 0
              }}
            >
              <h3 style={{ fontSize: "clamp(1rem, 3vw, 1.15rem)", fontWeight: 600, color: T.textPrimary }}>{title}</h3>
              <button
                onClick={onClose}
                style={{
                  padding: "0.375rem",
                  borderRadius: "0.5rem",
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.surface)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={16} color={T.textSecondary} />
              </button>
            </div>
            <div style={{ padding: "clamp(1rem, 3vw, 1.5rem)", overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

