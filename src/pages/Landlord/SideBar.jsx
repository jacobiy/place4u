import { Building, MessageSquare, Home, Users, Settings, LogOut, ChevronDown, DollarSign, FileText, Calendar, BarChart3, User } from "lucide-react";
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

export const Sidebar = ({ activeView, setActiveView, unreadCount, onLogout, profile, user }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "John Doe";
  const tier = profile?.account_tier ? `${profile.account_tier[0].toUpperCase()}${profile.account_tier.slice(1)} Landlord` : "Landlord";

  const NavItem = ({ id, icon: Icon, label, badge }) => {
    const active = activeView === id;
    return (
      <button
        onClick={() => setActiveView(id)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 16px", borderRadius: "10px",
          width: "100%",
          border: "none",
          background: active ? "rgba(79,126,248,0.15)" : "transparent",
          color: active ? T.accent : T.textSecondary,
          fontSize: "0.85rem", fontWeight: active ? 600 : 400,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          marginBottom: "4px"
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
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
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
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "properties", icon: Building, label: "Properties" },
    { id: "tenants", icon: Users, label: "Tenants" },
    { id: "messages", icon: MessageSquare, label: "Messages", badge: unreadCount },
    { id: "payments", icon: DollarSign, label: "Payments" },
    { id: "maintenance", icon: FileText, label: "Maintenance" },
    { id: "profile", icon: User, label: "Profile" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside style={{
      width: "260px",
      background: T.navyMid,
      borderRight: `1px solid ${T.border}`,
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 50
    }}>
      {/* Logo Section */}
      <div style={{
        padding: "1.5rem",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        flexShrink: 0
      }}>
        <div style={{
          width: "42px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          overflow: "hidden",
          background: "transparent"
        }}>
          <img
            src="/logo.png"
            alt="Place4U Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              transition: "transform 0.3s ease-in-out"
            }}
            className="hover:scale-105"
          />
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <div style={{
        flex: 1,
        padding: "1.5rem 1rem",
        overflowY: "auto",
        overflowX: "hidden"
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: T.textMuted,
            marginBottom: "1rem",
            paddingLeft: "12px"
          }}>Main Menu</p>
          {navItems.map(item => (
            <NavItem key={item.id} {...item} />
          ))}
        </div>
      </div>

      {/* User Profile Section - Sticky at bottom */}
      <div style={{
        padding: "1rem",
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
        background: T.navyMid
      }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px",
              width: "100%",
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
              width: "40px", height: "40px", borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", fontWeight: 700, color: "#fff"
            }}>{initials(displayName)}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textPrimary, lineHeight: 1.2 }}>{displayName}</p>
              <p style={{ fontSize: "0.7rem", color: T.textMuted }}>{tier}</p>
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
              bottom: "calc(100% + 8px)",
              left: 0,
              right: 0,
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
    </aside>
  );
};
