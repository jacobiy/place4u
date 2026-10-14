import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Wallet,
  User,
  Settings,
  LogOut,
  ChevronsUpDown,
  Lock,
  ShieldCheck,
  Sparkles,
  GitBranch
} from "lucide-react";
import "./SideBar.css";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "AG";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const PRIMARY = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "applications", icon: FileText, label: "Applications", locked: true },
  { id: "pipeline", icon: GitBranch, label: "Match Pipeline", locked: true },
  { id: "properties", icon: Building2, label: "Properties", locked: true },
  { id: "wallet", icon: Wallet, label: "Wallet & Earnings", locked: true }
];

const SECONDARY = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "settings", icon: Settings, label: "Settings" }
];

export const Sidebar = ({ activeView, setActiveView, onLogout, profile, agentProfile, user }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const displayName = profile?.full_name || agentProfile?.full_name || user?.user_metadata?.full_name || user?.email || "Agent";
  const isAgentVerified = Boolean(agentProfile?.is_verified === true);

  const groups = useMemo(
    () => [
      {
        label: "Workspace",
        items: PRIMARY.map((item) => ({ ...item, locked: Boolean(item.locked) && !isAgentVerified }))
      },
      {
        label: "Account",
        items: SECONDARY.map((item) => ({ ...item, locked: Boolean(item.locked) && !isAgentVerified }))
      }
    ],
    [isAgentVerified]
  );

  const NavItem = ({ id, icon: Icon, label, locked }) => {
    const active = activeView === id;
    return (
      <button
        type="button"
        onClick={() => setActiveView(id)}
        className={`sb-nav-item${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <span className="sb-nav-rail" aria-hidden="true" />
        <Icon size={17} strokeWidth={2} className="sb-nav-icon" />
        <span className="sb-nav-label">{label}</span>
        {locked && (
          <span className="sb-nav-lock" title="Complete verification to unlock">
            <Lock size={10} />
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="agent-sidebar">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-brand-mark">
          <img src="/logo-icon.png" alt="Place4U" />
        </div>
        <div className="sb-brand-text">
          <span className="sb-brand-name">Place4U</span>
          <span className="sb-brand-sub">Agent Console</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {groups.map((group) => (
          <div className="sb-group" key={group.label}>
            <p className="sb-group-label">{group.label}</p>
            {group.items.map((item) => (
              <NavItem key={item.id} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Verification prompt */}
      {!isAgentVerified && (
        <div className="sb-verify">
          <div className="sb-verify-icon">
            <Sparkles size={14} />
          </div>
          <div className="sb-verify-copy">
            <p className="sb-verify-title">Account inactive</p>
            <p className="sb-verify-text">
              Submit your FICA documents to unlock listings, matching and earnings.
            </p>
          </div>
          <button type="button" className="sb-verify-btn" onClick={() => setActiveView("dashboard")}>
            <ShieldCheck size={13} /> Get verified
          </button>
        </div>
      )}

      {/* Identity / account menu */}
      <div className="sb-footer">
        <div className="sb-identity-wrap">
          <button
            type="button"
            className={`sb-identity${isProfileOpen ? " is-open" : ""}`}
            onClick={() => setIsProfileOpen((v) => !v)}
            aria-expanded={isProfileOpen}
          >
            <span className="sb-identity-avatar">
              {agentProfile?.profile_image_url ? (
                <img src={agentProfile.profile_image_url} alt={displayName} />
              ) : (
                initials(displayName)
              )}
              <span className={`sb-presence${isAgentVerified ? " is-on" : " is-off"}`} />
            </span>
            <span className="sb-identity-text">
              <span className="sb-identity-name">{displayName}</span>
              <span className={`sb-identity-role${isAgentVerified ? " is-verified" : ""}`}>
                {isAgentVerified ? "Verified agent" : "Unverified"}
              </span>
            </span>
            <ChevronsUpDown size={14} className="sb-identity-chev" />
          </button>

          {isProfileOpen && (
            <>
              <div className="sb-menu-backdrop" onClick={() => setIsProfileOpen(false)} />
              <div className="sb-menu">
                <button
                  type="button"
                  className="sb-menu-item"
                  onClick={() => {
                    setActiveView("profile");
                    setIsProfileOpen(false);
                  }}
                >
                  <User size={15} /> View profile
                </button>
                <button
                  type="button"
                  className="sb-menu-item"
                  onClick={() => {
                    setActiveView("settings");
                    setIsProfileOpen(false);
                  }}
                >
                  <Settings size={15} /> Account settings
                </button>
                <div className="sb-menu-sep" />
                <button type="button" className="sb-menu-item is-danger" onClick={onLogout}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
