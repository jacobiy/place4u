import React, { useState } from 'react';
import { Lock, Bell } from 'lucide-react';
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from '../Landlord/Component/Buttons';
import { Modal } from '../Landlord/Component/Modal';
import { TenantQueries } from './db/queries';
import { supabase } from '../../utils/Supabase';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", overflow: "hidden", marginBottom: "1.5rem" }}>
    <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(16,185,129,0.04)" }}>
      <Icon size={20} color={T.emerald} />
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: T.textPrimary }}>{title}</h2>
    </div>
    <div style={{ padding: "1.5rem" }}>{children}</div>
  </div>
);

export const Settings = ({ profile }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError("Passwords don't match"); return;
    }
    if (passwordData.new.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    
    setIsSaving(true); setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      
      setSuccessMessage('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    const updatedPreferences = { ...profile?.notification_preferences, [key]: value };
    try {
      const result = await TenantQueries.updateNotificationPreferences(profile.id, updatedPreferences);
      if (result.success) {
        setSuccessMessage('Notification preferences updated!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.3s ease-in-out" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, marginBottom: "2rem" }}>Settings</h1>
      
      {successMessage && <div style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${T.emerald}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.emerald }}>{successMessage}</div>}
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${T.red}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.red }}>{error}</div>}

      <SettingsSection title="Security" icon={Lock}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Change Password</p>
            <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Update your password regularly to keep your account secure</p>
          </div>
          <PrimaryBtn onClick={() => setShowPasswordModal(true)}>
            <Lock size={16} style={{ marginRight: "0.5rem" }} /> Change Password
          </PrimaryBtn>
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" icon={Bell}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.email || false} onChange={(e) => handleNotificationChange('email', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>Email Notifications</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.sms || false} onChange={(e) => handleNotificationChange('sms', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>SMS Notifications</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.rent_reminders || false} onChange={(e) => handleNotificationChange('rent_reminders', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>Rent Reminders</span>
          </label>
        </div>
      </SettingsSection>

      {/* Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>New Password</label>
            <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>Confirm New Password</label>
            <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Password'}</PrimaryBtn>
            <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
