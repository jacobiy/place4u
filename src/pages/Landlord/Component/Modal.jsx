import { useEffect } from "react";
import { X } from "lucide-react";
import { T } from '../styles/designTokens';

export const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = { sm:"28rem", md:"32rem", lg:"48rem", xl:"64rem", full:"80rem" }[size];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50 }}>
      <div
        onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}
      />
      <div style={{ position:"fixed", inset:0, overflowY:"auto" }}>
        <div style={{ display:"flex", minHeight:"100%", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position:"relative", width:"100%", maxWidth:maxW,
              background:T.navyMid, borderRadius:"1rem",
              border:`1px solid ${T.border}`,
              boxShadow:"0 25px 60px rgba(0,0,0,0.6)"
            }}
          >
            <div style={{
              padding:"1.25rem 1.5rem",
              borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              borderRadius:"1rem 1rem 0 0",
              background:"rgba(79,126,248,0.06)"
            }}>
              <h3 style={{ fontSize:"1.1rem", fontWeight:600, color:T.textPrimary }}>{title}</h3>
              <button
                onClick={onClose}
                style={{
                  padding:"0.375rem", borderRadius:"0.5rem", background:"transparent",
                  border:`1px solid ${T.border}`, cursor:"pointer", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  transition:"background 0.15s"
                }}
                onMouseEnter={(e)=>e.currentTarget.style.background=T.surface}
                onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
              >
                <X size={16} color={T.textSecondary} />
              </button>
            </div>
            <div style={{ padding:"1.5rem", maxHeight:"72vh", overflowY:"auto" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};