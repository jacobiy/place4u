import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock, Bell, ShieldCheck, KeyRound, CheckCircle, AlertCircle,
  Mail, MessageSquare, Smartphone, Wrench, CreditCard, Shield
} from 'lucide-react';
import { T, SERIF } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { Modal } from './Component/Modal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import Loading from '../../component/loading';

const EYEBROW = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textMuted, margin: 0 };

const SettingsSection = ({ title, subtitle, icon: Icon, accent = T.accent, children }) => (
  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "1.1rem", marginBottom: "1.5rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.9rem" }}>
      <Icon size={18} color={accent} style={{ flexShrink: 0 }} />
      <div>
        <h2 style={{ fontFamily: SERIF, fontSize: "1.15rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: 1 }}>{subtitle}</p>}
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${T.border}` }}>
      {children}
    </div>
  </div>
);

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={disabled ? undefined : onChange}
    style={{
      width: 46, height: 26, borderRadius: 9999, border: "none", padding: 3,
      background: checked ? T.accent : "#cbd5e1",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center",
      justifyContent: checked ? "flex-end" : "flex-start",
      transition: "background 0.2s, justify-content 0.2s", flexShrink: 0,
      boxShadow: checked ? "0 6px 14px -6px rgba(2,132,199,0.7)" : "none"
    }}
  >
    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(15,23,42,0.3)" }} />
  </button>
);

const ToggleRow = ({ icon: Icon, title, description, checked, onChange }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
    borderBottom: `1px solid ${T.border}`, padding: "0.85rem 0", flexWrap: "wrap"
  }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
      <Icon size={16} color={T.accent} style={{ marginTop: 3, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.88rem", fontWeight: 650, color: T.textPrimary }}>{title}</p>
        <p style={{ fontSize: "0.74rem", color: T.textMuted, marginTop: 2 }}>{description}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

export const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const { user } = useAuth();

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      let result = await LandlordQueries.getLandlordProfile(user.id);

      if (result.success && result.data) {
        setProfile(result.data);
        setProfileId(result.data.id);
      } else {
        throw new Error(result.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError("Passwords don't match");
      return;
    }

    if (passwordData.new.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      setSuccessMessage('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });

      await LandlordQueries.logActivity(profileId, 'password_change', 'Changed password');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    if (!profileId) return;
    const next = !profile?.two_factor_enabled;
    setIsSaving(true);
    setError(null);
    try {
      const res = await LandlordQueries.updateTwoFactor(profileId, next);
      if (res.success) {
        setProfile(res.data);
        setSuccessMessage(next ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.');
        setTimeout(() => setSuccessMessage(null), 2500);
        try {
          await LandlordQueries.logActivity(profileId, 'security_update', `${next ? 'Enabled' : 'Disabled'} two-factor authentication`);
        } catch { /* ignore */ }
      } else {
        throw new Error(res.error || 'Failed to update two-factor authentication.');
      }
    } catch (e) {
      console.error("Error updating 2FA:", e);
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    const updatedPreferences = {
      ...profile?.notification_preferences,
      [key]: value
    };

    setProfile({
      ...profile,
      notification_preferences: updatedPreferences
    });

    try {
      const result = await LandlordQueries.updateNotificationPreferences(profileId, updatedPreferences);
      if (result.success) {
        setSuccessMessage('Notification preferences updated!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
      setError(error.message);
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  const notif = profile?.notification_preferences || {};
  const twoFA = Boolean(profile?.two_factor_enabled);

  const inputStyle = {
    width: "100%", padding: "0.7rem 0.85rem", background: "#ffffff",
    border: `1px solid ${T.borderStrong}`, borderRadius: "0.75rem", color: T.textPrimary,
    fontSize: "0.9rem", fontFamily: "inherit", outline: "none"
  };

  return (
    <div className="ll-scope" style={{ maxWidth: "1200px", margin: "0 auto", minWidth: 0 }}>

      {successMessage && (
        <div style={{
          background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, borderRadius: "0.875rem",
          padding: "0.9rem 1.1rem", marginBottom: "1rem", color: T.emerald,
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600,
          animation: "llToast 0.25s ease-out"
        }}>
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          background: T.redSoft, border: `1px solid ${T.redBorder}`, borderRadius: "0.875rem",
          padding: "0.9rem 1.1rem", marginBottom: "1rem", color: T.red,
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ACCOUNT OVERVIEW */}
      <div className="ll-anim-up" style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap",
        borderBottom: `1px solid ${T.border}`, paddingBottom: "1.4rem", marginBottom: "1.75rem"
      }}>
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          <p style={{ ...EYEBROW, marginBottom: 6 }}>Landlord account</p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem, 4vw, 2.3rem)", color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Account &amp; preferences
          </h1>
          <p style={{ color: T.textSecondary, fontSize: "0.9rem", maxWidth: 640, lineHeight: 1.6, marginTop: 8 }}>
            Manage how your portfolio account is secured and how Place4U keeps you informed about leases, payments and maintenance.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap", paddingTop: 4 }}>
          {[
            { icon: Shield, label: "Account", value: (profile?.account_status || "active").replace(/^\w/, (c) => c.toUpperCase()), color: T.emerald },
            { icon: KeyRound, label: "Landlord code", value: profile?.landlord_code || "—", color: T.accent },
            { icon: ShieldCheck, label: "Two-factor", value: twoFA ? "Enabled" : "Disabled", color: twoFA ? T.emerald : T.amber },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 9, minWidth: 0 }}>
              <Icon size={15} color={color} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={EYEBROW}>{label}</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 650, color: T.textPrimary, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Password Section */}
      <SettingsSection title="Security" subtitle="Passwords and account protection" icon={Lock}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
          borderBottom: `1px solid ${T.border}`, padding: "0.85rem 0"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
            <KeyRound size={16} color={T.accent} style={{ marginTop: 3, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "0.88rem", fontWeight: 650, color: T.textPrimary }}>Account password</p>
              <p style={{ fontSize: "0.74rem", color: T.textMuted, marginTop: 2 }}>Update your password regularly to keep your account secure.</p>
            </div>
          </div>
          <SecondaryBtn onClick={() => setShowPasswordModal(true)}>
            <Lock size={15} /> Change Password
          </SecondaryBtn>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
          borderBottom: `1px solid ${T.border}`, padding: "0.85rem 0"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
            <ShieldCheck size={16} color={twoFA ? T.emerald : T.amber} style={{ marginTop: 3, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "0.88rem", fontWeight: 650, color: T.textPrimary }}>Two-factor authentication</p>
              <p style={{ fontSize: "0.74rem", color: T.textMuted, marginTop: 2 }}>Add an extra layer of security to your account.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
              color: twoFA ? T.emerald : T.amber
            }}>
              {twoFA ? "Active" : "Off"}
            </span>
            <Toggle checked={twoFA} onChange={handleTwoFactorToggle} disabled={isSaving} />
          </div>
        </div>
      </SettingsSection>

      {/* Notification Preferences */}
      <SettingsSection title="Notifications" subtitle="Choose how we keep you updated" icon={Bell} accent={T.purple}>
        <div>
          <ToggleRow
            icon={Mail}
            title="Email notifications"
            description="Lease updates, applications and statements"
            checked={Boolean(notif.email)}
            onChange={(v) => handleNotificationChange('email', !notif.email)}
          />
          <ToggleRow
            icon={MessageSquare}
            title="SMS notifications"
            description="Urgent alerts delivered to your phone"
            checked={Boolean(notif.sms)}
            onChange={() => handleNotificationChange('sms', !notif.sms)}
          />
          <ToggleRow
            icon={Smartphone}
            title="Push notifications"
            description="Real-time activity in the Place4U app"
            checked={Boolean(notif.push)}
            onChange={() => handleNotificationChange('push', !notif.push)}
          />
          <ToggleRow
            icon={Wrench}
            title="Maintenance alerts"
            description="Tenant maintenance requests and updates"
            checked={Boolean(notif.maintenance)}
            onChange={() => handleNotificationChange('maintenance', !notif.maintenance)}
          />
          <ToggleRow
            icon={CreditCard}
            title="Payment notifications"
            description="Rent received, arrears and disbursements"
            checked={Boolean(notif.payments)}
            onChange={() => handleNotificationChange('payments', !notif.payments)}
          />
        </div>
      </SettingsSection>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" subtitle="Secure your landlord account" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              New Password
            </label>
            <input
              type="password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ color: T.red, background: T.redSoft, border: `1px solid ${T.redBorder}`, borderRadius: "0.75rem", padding: "0.6rem 0.85rem", fontSize: "0.82rem", fontWeight: 500 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? 'Updating...' : 'Update Password'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
