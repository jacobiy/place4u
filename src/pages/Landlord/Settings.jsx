import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Bell } from 'lucide-react';
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { Modal } from './Component/Modal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div style={{
    background: T.cardBg,
    border: `1px solid ${T.border}`,
    borderRadius: "1rem",
    overflow: "hidden",
    marginBottom: "1.5rem"
  }}>
    <div style={{
      padding: "1rem 1.5rem",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      background: "rgba(79,126,248,0.04)"
    }}>
      <Icon size={20} color={T.accent} />
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: T.textPrimary }}>{title}</h2>
    </div>
    <div style={{ padding: "1.5rem" }}>
      {children}
    </div>
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
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", color: T.textPrimary
      }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.navy, padding: "2rem 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
        
        {successMessage && (
          <div style={{
            background: "rgba(16,185,129,0.1)", border: `1px solid ${T.emerald}`,
            borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem",
            color: T.emerald, display: "flex", alignItems: "center", gap: "0.5rem"
          }}>
            {successMessage}
          </div>
        )}
        
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: `1px solid ${T.red}`,
            borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem",
            color: T.red, display: "flex", alignItems: "center", gap: "0.5rem"
          }}>
            {error}
          </div>
        )}

        {/* Security & Password Section */}
        <SettingsSection title="Security" icon={Lock}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Change Password</p>
              <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Update your password regularly to keep your account secure</p>
            </div>
            <PrimaryBtn onClick={() => setShowPasswordModal(true)}>
              <Lock size={16} style={{ marginRight: "0.5rem" }} />
              Change Password
            </PrimaryBtn>
          </div>
          
          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Two-Factor Authentication</p>
                <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Add an extra layer of security to your account</p>
              </div>
              <SecondaryBtn>
                {profile?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </SecondaryBtn>
            </div>
          </div>
        </SettingsSection>

        {/* Notification Preferences */}
        <SettingsSection title="Notifications" icon={Bell}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.email || false} 
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>Email Notifications</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.sms || false} 
                  onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>SMS Notifications</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.push || false} 
                  onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>Push Notifications</span>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.maintenance || false} 
                  onChange={(e) => handleNotificationChange('maintenance', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>Maintenance Alerts</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.payments || false} 
                  onChange={(e) => handleNotificationChange('payments', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>Payment Notifications</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={profile?.notification_preferences?.messages || false} 
                  onChange={(e) => handleNotificationChange('messages', e.target.checked)}
                  style={{ accentColor: T.accent }} 
                />
                <span style={{ color: T.textSecondary }}>New Messages</span>
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* Change Password Modal */}
        <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="md">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit" }}
              />
            </div>
            {error && <div style={{ color: T.red, fontSize: "0.8rem" }}>{error}</div>}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Password'}
              </PrimaryBtn>
              <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
