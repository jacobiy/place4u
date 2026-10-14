import {
  Home, Building, Users, Settings, LogOut, ChevronDown, FileText, User, Lock, LifeBuoy, Sparkles, UserCheck
} from "lucide-react";
import { CHROME, T } from './Styles/designTokens';
import { initials } from './Styles/helpers';
import { useState, useRef, useEffect } from "react";

export const Sidebar = ({ activeView, setActiveView, onLogout, profile, user }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const isApproved = String(profile?.application_status || "").toLowerCase() === "approved" && profile?.account_status !== "suspended";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    if (isProfileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Landlord";
  const tier = profile?.account_tier
    ? `${profile.account_tier[0].toUpperCase()}${profile.account_tier.slice(1)} Landlord`
    : "Landlord";

  const NavItem = ({ id, icon: Icon, label, locked = false }) => {
    const active = activeView === id;
    return (
      <button
        onClick={() => !locked && setActiveView(id)}
        disabled={locked}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 14px", borderRadius: "12px",
          width: "100%", border: "none",
          background: active ? CHROME.accentSoft : "transparent",
          color: active ? "#fff" : locked ? CHROME.textDim : CHROME.textMuted,
          fontSize: "0.86rem",
          fontWeight: active ? 600 : 500,
          cursor: locked ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "all 0.16s ease",
          marginBottom: "4px",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!active && !locked) {
            e.currentTarget.style.background = CHROME.surface;
            e.currentTarget.style.color = CHROME.text;
          }
        }}
        onMouseLeave={(e) => {
          if (!active && !locked) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = locked ? CHROME.textDim : CHROME.textMuted;
          }
        }}
      >
        {active && (
          <span style={{ position: "absolute", left: 0, top: "22%", bottom: "22%", width: 3, borderRadius: 9999, background: "linear-gradient(180deg,#7c9ffc,#4f7ef8)" }} />
        )}
        <Icon size={18} color={active ? CHROME.accent : undefined} />
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        {locked && <Lock size={13} color={CHROME.textDim} />}
      </button>
    );
  };

  const navItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "properties", icon: Building, label: "Properties", locked: !isApproved },
    { id: "tenants", icon: Users, label: "Tenants", locked: !isApproved },
    { id: "pipeline", icon: UserCheck, label: "Applicant Pipeline", locked: !isApproved },
    { id: "documents", icon: FileText, label: "Documents" },
    { id: "profile", icon: User, label: "Profile" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside style={{
      width: "260px",
      background: `linear-gradient(180deg, ${CHROME.bgMid} 0%, ${CHROME.bg} 100%)`,
      borderRight: `1px solid ${CHROME.border}`,
      height: "100vh",
      position: "fixed",
      left: 0, top: 0,
      display: "flex", flexDirection: "column",
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: "1.4rem 1.25rem",
        borderBottom: `1px solid ${CHROME.border}`,
        display: "flex", alignItems: "center", gap: "11px", flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, rgba(79,126,248,0.25), rgba(124,92,246,0.25))",
          border: `1px solid ${CHROME.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <img
            src="/logo.png"
            alt="Place4U"
            style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            Place<span style={{ color: CHROME.accent }}>4U</span>
          </p>
          <p style={{ fontSize: "0.68rem", color: CHROME.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>
            Landlord Suite
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: "1.25rem 0.85rem", overflowY: "auto", overflowX: "hidden" }}>
        <p style={{
          fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.14em",
          color: CHROME.textDim, marginBottom: "0.8rem", paddingLeft: "14px", fontWeight: 700,
        }}>
          Portfolio
        </p>
        {navItems.map((item) => <NavItem key={item.id} {...item} />)}

        {!isApproved && (
          <div style={{
            marginTop: "1.25rem", padding: "0.9rem",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.05))",
            border: "1px solid rgba(245,158,11,0.28)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <Sparkles size={14} color="#fbbf24" />
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#fcd34d" }}>Unlock full access</span>
            </div>
            <p style={{ fontSize: "0.7rem", color: CHROME.textMuted, lineHeight: 1.5, margin: 0 }}>
              Complete accreditation to list properties and manage tenants.
            </p>
          </div>
        )}
      </div>

      {/* Help shortcut */}
      <div style={{ padding: "0 0.85rem 0.5rem", flexShrink: 0 }}>
        <button
          onClick={() => setActiveView("settings")}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 12, border: `1px solid ${CHROME.border}`,
            background: CHROME.surface, color: CHROME.textMuted, cursor: "pointer",
            fontSize: "0.8rem", fontFamily: "inherit", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = CHROME.surfaceHover; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = CHROME.surface; e.currentTarget.style.color = CHROME.textMuted; }}
        >
          <LifeBuoy size={16} />
          Help & Support
        </button>
      </div>

      {/* Profile */}
      <div style={{ padding: "0.85rem", borderTop: `1px solid ${CHROME.border}`, flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: "flex", alignItems: "center", gap: "11px",
              padding: "9px", width: "100%",
              background: CHROME.surface,
              border: `1px solid ${CHROME.border}`,
              borderRadius: "14px", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = CHROME.borderHover}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = CHROME.border}
          >
            <div style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #4f7ef8 0%, #8b5cf6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 700, color: "#fff", overflow: "hidden",
            }}>
              {profile?.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : initials(displayName)}
            </div>
            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <p style={{ fontSize: "0.84rem", fontWeight: 600, color: CHROME.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </p>
              <p style={{ fontSize: "0.7rem", color: CHROME.textDim }}>{tier}</p>
            </div>
            <ChevronDown
              size={14}
              color={CHROME.textDim}
              style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
            />
          </button>

          {isProfileOpen && (
            <div
              ref={profileMenuRef}
              className="dropdown-menu-popover"
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0, right: 0,
                background: "rgba(17,24,39,0.97)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "14px",
                padding: "0.45rem",
                boxShadow: "0 18px 40px -8px rgba(0,0,0,0.65)",
                zIndex: 60,
              }}
            >
              {[
                { label: "View Profile", icon: User, action: () => setActiveView("profile") },
                { label: "Settings", icon: Settings, action: () => setActiveView("settings") },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setIsProfileOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 12px", width: "100%",
                    background: "transparent", border: "none", borderRadius: "9px",
                    cursor: "pointer", color: CHROME.textMuted, fontSize: "0.8rem",
                    transition: "all 0.15s", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = CHROME.surface; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = CHROME.textMuted; }}
                >
                  <item.icon size={14} /> {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: CHROME.border, margin: "0.4rem 0" }} />
              <button
                onClick={onLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 12px", width: "100%",
                  background: "transparent", border: "none", borderRadius: "9px",
                  cursor: "pointer", color: "#f87171", fontSize: "0.8rem",
                  transition: "all 0.15s", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
