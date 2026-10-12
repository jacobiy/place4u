import { LayoutDashboard, Search, User, Settings, LogOut, ChevronDown, FileText, Menu, X, Sparkles } from "lucide-react";
import { T } from './Styles/designTokens';
import { useState, useRef, useEffect } from "react";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "JD";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Sidebar = ({ activeView, setActiveView, unreadCount, applicationsCount, matchesCount = 1, onLogout, profile, user }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : "Resident");
  const tier = profile?.account_tier ? `${profile.account_tier[0].toUpperCase()}${profile.account_tier.slice(1)} Tenant` : "Tenant";

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "matches", icon: Sparkles, label: "Matched Properties", badge: matchesCount },
    { id: "browse", icon: Search, label: "Browse Properties" },
    { id: "applications", icon: FileText, label: "Applications", badge: applicationsCount },
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    setMobileMenuOpen(false);
  };

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
      padding: "0 1.5rem",
      zIndex: 50
    }}>
      {/* Left: Mobile Toggle & Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0
      }}>
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex md:!hidden items-center justify-center p-1.5 bg-transparent border-none text-slate-200 hover:text-white cursor-pointer transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <div
          onClick={() => handleNavClick("dashboard")}
          style={{
            height: "44px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <img
            src="/logo.png"
            alt="Place4U Logo"
            style={{
              height: "36px",
              objectFit: "contain"
            }}
          />
        </div>
      </div>

      {/* Center/Right: Desktop Navigation */}
      <nav
        className="hidden md:flex"
        style={{
          alignItems: "center",
          gap: "0.5rem",
          flex: 1,
          justifyContent: "center",
          padding: "0 1.5rem"
        }}
      >
        {navItems.map(item => {
          const active = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                background: active ? "rgba(79,126,248,0.16)" : "transparent",
                color: active ? T.accent : T.textSecondary,
                fontSize: "0.85rem",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
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
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ 
                  background: T.accent,
                  color: "#fff",
                  fontSize: "0.65rem", 
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "20px",
                  minWidth: "18px",
                  textAlign: "center"
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: User Profile Menu */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 12px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
        >
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f7ef8 0%, #10b981 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.8rem"
          }}>
            {initials(displayName)}
          </div>
          <div style={{ textAlign: "left", display: "none" }} className="sm:block">
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: T.textPrimary, lineHeight: 1.2, margin: 0 }}>
              {displayName}
            </p>
            <p style={{ fontSize: "0.68rem", color: T.textMuted, margin: 0 }}>
              {tier}
            </p>
          </div>
          <ChevronDown 
            size={14} 
            color={T.textMuted}
            style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
          />
        </button>
        
        {/* Profile Dropdown */}
        {isProfileOpen && (
          <div 
            ref={profileMenuRef}
            className="dropdown-menu-popover"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "220px",
              background: "rgba(17, 24, 39, 0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1px solid rgba(255, 255, 255, 0.12)`,
              borderRadius: "14px",
              padding: "0.5rem",
              boxShadow: "0 18px 36px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
              zIndex: 60
            }}
          >
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, marginBottom: "4px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textPrimary }}>{displayName}</div>
              <div style={{ fontSize: "0.72rem", color: T.emerald, marginTop: "2px" }}>● {tier}</div>
            </div>
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
                color: T.textSecondary, fontSize: "0.82rem",
                transition: "all 0.15s ease", fontFamily: "inherit"
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
              <User size={15} /> View Profile
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
                color: T.textSecondary, fontSize: "0.82rem",
                transition: "all 0.15s ease", fontFamily: "inherit"
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
              <Settings size={15} /> Account Settings
            </button>
            <div style={{ height: "1px", background: T.border, margin: "0.4rem 0" }} />
            <button
              onClick={onLogout}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 12px", width: "100%",
                background: "transparent", border: "none",
                borderRadius: "8px", cursor: "pointer",
                color: T.red, fontSize: "0.82rem",
                transition: "all 0.15s ease", fontFamily: "inherit"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            left: 0,
            right: 0,
            background: T.navyMid,
            borderBottom: `1px solid ${T.border}`,
            padding: "1rem 1.5rem",
            flexDirection: "column",
            gap: "0.5rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 49
          }}
          className="flex md:!hidden"
        >
          {navItems.map(item => {
            const active = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: active ? "rgba(79,126,248,0.16)" : "transparent",
                  color: active ? T.accent : T.textSecondary,
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span style={{ 
                    background: T.accent,
                    color: "#fff",
                    fontSize: "0.7rem", 
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px"
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
