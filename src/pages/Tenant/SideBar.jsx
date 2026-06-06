import { Home, Search, MessageSquare, User, Settings, LogOut, ChevronDown, FileText } from "lucide-react";
import { T } from './Styles/designTokens';
import { useState } from "react";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "JD";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Sidebar = ({ activeView, setActiveView, unreadCount, applicationsCount, onLogout, profile, user }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "John Doe";
  const tier = profile?.account_tier ? `${profile.account_tier[0].toUpperCase()}${profile.account_tier.slice(1)} Tenant` : "Tenant";

  const NavItem = ({ id, icon: Icon, label, badge }) => {
    const active = activeView === id;
    return (
      <button
        onClick={() => setActiveView(id)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 16px", borderRadius: "10px",
          border: "none",
          background: active ? "rgba(79,126,248,0.15)" : "transparent",
          color: active ? T.accent : T.textSecondary,
          fontSize: "0.85rem", fontWeight: active ? 600 : 400,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          whiteSpace: "nowrap"
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = T.surface;
            e.currentTarget.style.color = T.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = T.textSecondary;
          }
        }}
      >
        <Icon size={18} />
        <span>{label}</span>
        {badge > 0 && (
          <span style={{ 
            background: T.red, color: "#fff", fontSize: "0.6rem", 
            fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
            minWidth: "20px", textAlign: "center"
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const navItems = [
    { id: "browse", icon: Search, label: "Browse Properties" },
    { id: "applications", icon: FileText, label: "Applications", badge: applicationsCount },
    { id: "messages", icon: MessageSquare, label: "Messages", badge: unreadCount },
  ];

  return (
    <header style={{
      width: "100%",
      background: T.navyMid,
      borderBottom: `1px solid ${T.border}`,
      height: "70px",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      zIndex: 50
    }}>
      {/* Logo Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0
      }}>
        <div style={{
          width: "120px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          overflow: "hidden",
         
        }}>
          <img
            src="/logo.png"
            alt="Place4U Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transition: "transform 0.3s ease-in-out"
            }}
            className="hover:scale-105"
          />
        </div>
      </div>

      {/* Navigation - Horizontal */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        overflowX: "auto",
        flex: 1,
        justifyContent: "flex-end",
        padding: "0 2rem"
      }}>
        {navItems.map(item => (
          <NavItem key={item.id} {...item} />
        ))}
      </nav>

      {/* User Profile Section - Right aligned */}
      <div style={{
        position: "relative",
        flexShrink: 0
      }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "6px 12px",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: T.navyMid,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textSecondary
            }}><User size={18} /></div>
            <div style={{ textAlign: "left", display: "none" }} className="sm:block">
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textPrimary, lineHeight: 1.2 }}>{displayName}</p>
              <p style={{ fontSize: "0.65rem", color: T.textMuted }}>{tier}</p>
            </div>
            <ChevronDown 
              size={14} 
              color={T.textMuted}
              style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>
          
          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "200px",
              background: T.navy,
              border: `1px solid ${T.border}`,
              borderRadius: "12px",
              padding: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
            }}>
              <button
                onClick={() => {
                  setActiveView("profile");
                  setIsProfileOpen(false);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 12px", width: "100%",
                  background: "transparent", border: "none",
                  borderRadius: "8px", cursor: "pointer",
                  color: T.textSecondary, fontSize: "0.8rem",
                  transition: "all 0.15s", fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surface;
                  e.currentTarget.style.color = T.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.textSecondary;
                }}
              >
                <User size={14} /> View Profile
              </button>
              <button
                onClick={() => {
                  setActiveView("settings");
                  setIsProfileOpen(false);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 12px", width: "100%",
                  background: "transparent", border: "none",
                  borderRadius: "8px", cursor: "pointer",
                  color: T.textSecondary, fontSize: "0.8rem",
                  transition: "all 0.15s", fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surface;
                  e.currentTarget.style.color = T.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.textSecondary;
                }}
              >
                <Settings size={14} /> Settings
              </button>
              <div style={{ height: "1px", background: T.border, margin: "0.5rem 0" }} />
              <button
                onClick={onLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 12px", width: "100%",
                  background: "transparent", border: "none",
                  borderRadius: "8px", cursor: "pointer",
                  color: T.red, fontSize: "0.8rem",
                  transition: "all 0.15s", fontFamily: "inherit"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
