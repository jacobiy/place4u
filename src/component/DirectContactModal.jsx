import React from "react";
import { X, Mail, Phone, ExternalLink, ShieldCheck, User } from "lucide-react";

export default function DirectContactModal({
  isOpen,
  onClose,
  contact = {},
  defaultSubject = "Inquiry regarding Place4U property",
  defaultMessage = "Hello, I am contacting you regarding your property listing on Place4U."
}) {
  if (!isOpen) return null;

  const name = contact.name || contact.full_name || "Representative";
  const role = contact.role || contact.user_type || "Agent";
  const email = contact.email || "support@place4u.co.za";
  const rawPhone = contact.phone || "+27 82 444 3322";
  const propertyTitle = contact.propertyTitle || contact.unit || "";

  // Clean phone number for WhatsApp: remove non-digits
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `${defaultMessage}${propertyTitle ? ` (${propertyTitle})` : ""}`
  )}`;

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
    `${defaultSubject}${propertyTitle ? ` - ${propertyTitle}` : ""}`
  )}&body=${encodeURIComponent(defaultMessage)}`;

  const telUrl = `tel:${rawPhone.replace(/\s+/g, "")}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(11, 19, 43, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f1629",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "1.25rem",
          width: "100%",
          maxWidth: "480px",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#f1f5f9"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={13} /> Direct Communication
            </span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginTop: "4px" }}>
              Contact {name}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
              Role: <span style={{ textTransform: "capitalize", color: "#60a5fa", fontWeight: 600 }}>{role}</span>
              {propertyTitle && ` • ${propertyTitle}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              color: "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Direct Channels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1rem" }}>
          {/* WhatsApp Channel */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "1rem",
              borderRadius: "1rem",
              background: "rgba(37, 211, 102, 0.12)",
              border: "1px solid rgba(37, 211, 102, 0.35)",
              color: "#fff",
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: "1.25rem",
                flexShrink: 0
              }}
            >
              💬
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#25D366" }}>Chat on WhatsApp</span>
                <ExternalLink size={14} color="#25D366" />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
                Instant message via WhatsApp • {rawPhone}
              </p>
            </div>
          </a>

          {/* Email Channel */}
          <a
            href={mailtoUrl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "1rem",
              borderRadius: "1rem",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              color: "#fff",
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0
              }}
            >
              <Mail size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#60a5fa" }}>Send Email</span>
                <ExternalLink size={14} color="#60a5fa" />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </p>
            </div>
          </a>

          {/* Phone Call Channel */}
          <a
            href={telUrl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "1rem",
              borderRadius: "1rem",
              background: "rgba(168, 85, 247, 0.12)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              color: "#fff",
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0
              }}
            >
              <Phone size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#c084fc" }}>Direct Phone Call</span>
                <ExternalLink size={14} color="#c084fc" />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
                Voice call • {rawPhone}
              </p>
            </div>
          </a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <p style={{ fontSize: "0.72rem", color: "#64748b" }}>
            Place4U Direct Connect • No in-app delays. Connect directly via WhatsApp, Email, or Phone.
          </p>
        </div>
      </div>
    </div>
  );
}
