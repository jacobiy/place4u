import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Modal } from './Component/Modal';
import { PrimaryBtn, SecondaryBtn } from './component/Buttons';
import { T } from './styles/designTokens';

export const ProfileModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState("profile");
  
  const inputStyle = { 
    width: "100%", padding: "0.6rem 0.875rem", background: T.surface, 
    border: `1px solid ${T.border}`, borderRadius: "0.625rem", 
    fontSize: "0.875rem", color: T.textPrimary, outline: "none", 
    fontFamily: "inherit", marginBottom: "10px" 
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Landlord Profile" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${T.border}`, paddingBottom: "2px" }}>
          {["profile", "settings", "security"].map(t => (
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              style={{
                padding: "6px 16px", fontSize: "0.8rem", fontWeight: 500,
                background: "transparent", border: "none", cursor: "pointer",
                color: tab === t ? T.accent : T.textMuted,
                borderBottom: tab === t ? `2px solid ${T.accent}` : "2px solid transparent",
                fontFamily: "inherit", textTransform: "capitalize", transition: "color 0.15s"
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", fontWeight: 700, color: "#fff"
              }}>JD</div>
              <div>
                <p style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary }}>John Doe</p>
                <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Landlord since 2024</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <BadgeCheck size={14} color={T.accent} />
                  <span style={{ fontSize: "0.75rem", color: T.accent, fontWeight: 500 }}>Verified Landlord</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["Email", "john.doe@example.com"],
                ["Phone", "+27 123 456 789"],
                ["Properties", "3 Properties"],
                ["Tenants", "5 Tenants"]
              ].map(([l, v]) => (
                <div key={l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", padding: "0.875rem 1rem" }}>
                  <span style={{ fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</span>
                  <p style={{ fontWeight: 500, color: T.textPrimary, marginTop: "4px", fontSize: "0.875rem" }}>{v}</p>
                </div>
              ))}
            </div>
            <SecondaryBtn>Edit Profile</SecondaryBtn>
          </div>
        )}
        
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.75rem", padding: "1rem" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textSecondary, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notifications</p>
              {[
                "Email notifications for new messages",
                "Push notifications for maintenance",
                "Weekly property summary"
              ].map((item, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked={i < 2} style={{ accentColor: T.accent }} />
                  <span style={{ fontSize: "0.85rem", color: T.textSecondary }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {tab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.75rem", padding: "1rem" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textSecondary, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Change Password</p>
              <input type="password" placeholder="Current password" style={inputStyle} />
              <input type="password" placeholder="New password" style={inputStyle} />
              <input type="password" placeholder="Confirm new password" style={{ ...inputStyle, marginBottom: 0 }} />
              <PrimaryBtn style={{ width: "100%", marginTop: "10px" }}>Update Password</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};