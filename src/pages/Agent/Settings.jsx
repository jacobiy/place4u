import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Bell,
  Wallet,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Building,
  Save,
  LogOut,
  HelpCircle,
  FileText,
  X
} from 'lucide-react';
import { Modal } from './Component/Modal';
import { AgentQueries } from './db/queries';
import { supabase } from '../../utils/Supabase';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const SA_BANKS = [
  'Standard Bank',
  'First National Bank (FNB)',
  'Nedbank',
  'Absa',
  'Capitec Bank',
  'Investec',
  'Discovery Bank',
  'TymeBank',
  'African Bank'
];

export const Settings = ({ userRow, profile, user, onRefresh, onLogout }) => {
  const navigate = useNavigate();

  // Resolve the owning user id (cache + RLS are keyed by user id)
  const agentUserId = profile?.user_id || userRow?.id || user?.id;

  // Status banners
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // Password state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    whatsappMatchAlerts: profile?.whatsapp_alerts ?? true,
    emailPlacementDigest: profile?.email_digest ?? true,
    commissionPayoutAlerts: profile?.commission_alerts ?? true,
    viewingRequestAlerts: profile?.viewing_alerts ?? true
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Banking Details
  const [banking, setBanking] = useState({
    bank_name: profile?.bank_name || 'Standard Bank',
    account_holder: profile?.account_holder || userRow?.full_name || '',
    account_number: profile?.account_number || '',
    branch_code: profile?.branch_code || '',
    account_type: profile?.account_type || 'Cheque / Current'
  });
  const [isSavingBanking, setIsSavingBanking] = useState(false);

  // Re-sync preference & banking state whenever the profile loads or refreshes
  useEffect(() => {
    if (!profile) return;

    setNotifications({
      whatsappMatchAlerts: profile.whatsapp_alerts ?? true,
      emailPlacementDigest: profile.email_digest ?? true,
      commissionPayoutAlerts: profile.commission_alerts ?? true,
      viewingRequestAlerts: profile.viewing_alerts ?? true
    });

    setBanking((prev) => ({
      bank_name: profile.bank_name || prev.bank_name,
      account_holder: profile.account_holder || profile.full_name || userRow?.full_name || prev.account_holder,
      account_number: profile.account_number || prev.account_number,
      branch_code: profile.branch_code || prev.branch_code,
      account_type: profile.account_type || prev.account_type
    }));
  }, [profile, userRow]);

  // Delete Account Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger temporary notification banner
  const triggerStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  // 1. Password Update Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordData.newPassword) {
      triggerStatus('error', 'Please enter a new password.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      triggerStatus('error', 'Password must be at least 6 characters long.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      triggerStatus('error', 'Passwords do not match. Please verify your entries.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({ newPassword: '', confirmPassword: '' });
      triggerStatus('success', 'Your password has been successfully updated.');
    } catch (err) {
      triggerStatus('error', err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 2. Notification Preferences Handler
  const toggleNotification = async (key) => {
    const previous = notifications;
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setIsSavingNotifications(true);

    try {
      if (!agentUserId) throw new Error('Agent user ID not found.');

      const result = await AgentQueries.updateAgentProfile(agentUserId, {
        whatsapp_alerts: updated.whatsappMatchAlerts,
        email_digest: updated.emailPlacementDigest,
        commission_alerts: updated.commissionPayoutAlerts,
        viewing_alerts: updated.viewingRequestAlerts
      });
      if (!result.success) throw new Error(result.error);

      triggerStatus('success', 'Communication preferences saved.');
      if (onRefresh) onRefresh();
    } catch (err) {
      // Roll back the optimistic toggle if the write failed
      setNotifications(previous);
      triggerStatus('error', err?.message || 'Could not save communication preferences.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // 3. Banking Details Handler
  const handleBankingSave = async (e) => {
    e.preventDefault();
    setIsSavingBanking(true);
    try {
      if (!agentUserId) throw new Error('Agent profile ID not found.');

      const result = await AgentQueries.updateAgentProfile(agentUserId, {
        bank_name: banking.bank_name,
        account_holder: banking.account_holder,
        account_number: banking.account_number,
        branch_code: banking.branch_code,
        account_type: banking.account_type
      });

      if (!result.success) throw new Error(result.error);

      triggerStatus('success', 'Commission payout banking details saved.');
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerStatus('error', err?.message || 'Failed to save banking details.');
    } finally {
      setIsSavingBanking(false);
    }
  };

  // 4. POPIA Data Export (Section 23 DSAR)
  const handleExportData = () => {
    try {
      const payload = {
        exportDate: new Date().toISOString(),
        governingLaw: 'Protection of Personal Information Act, No. 4 of 2013 (POPIA)',
        dataSubjectId: user?.id || userRow?.id || 'agent',
        userAccount: {
          id: user?.id,
          email: user?.email,
          fullName: userRow?.full_name,
          phone: userRow?.phone,
          userType: 'agent'
        },
        agentProfile: profile,
        disclaimer: 'Official Data Subject Access Request (DSAR) export provided under POPIA Section 23.'
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Place4U_Agent_Data_Export_${user?.id || 'profile'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      triggerStatus('success', 'POPIA Data Subject Access Request (DSAR) downloaded successfully.');
    } catch (err) {
      triggerStatus('error', 'Could not generate data export.');
    }
  };

  // 5. Delete Account Handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      triggerStatus('error', 'Please type DELETE in capital letters to confirm account closure.');
      return;
    }

    setIsDeleting(true);
    try {
      const targetUserId = user?.id || userRow?.id;
      if (targetUserId) {
        // Remove agent profile
        try {
          await supabase.from('agent_profiles').delete().eq('user_id', targetUserId);
        } catch {}

        // Remove or deactivate user row
        try {
          await supabase.from('users').delete().eq('id', targetUserId);
        } catch {}
      }

      // Clear local credentials
      localStorage.clear();

      // Sign out
      await supabase.auth.signOut();

      if (onLogout) {
        onLogout();
      } else {
        navigate('/');
      }
    } catch (err) {
      triggerStatus('error', err?.message || 'Failed to close account. Please contact support.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="agent-settings-container">
      {/* Header */}
      <header className="agent-settings-header">
        <span className="ag-eyebrow">Account</span>
        <h1>Settings &amp; preferences</h1>
        <p>Manage your login credentials, commission payout banking details, notification channels, and privacy rights.</p>
      </header>

      {/* Global Status Banner */}
      {status && (
        <div className={`settings-alert ${status.type}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* 1. Security & Password Section */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title-group">
            <KeyRound size={20} color="#7da2ff" />
            <div>
              <h2>Password & Security</h2>
              <p className="settings-card-desc">Update your login password and manage access security</p>
            </div>
          </div>
        </div>

        <div className="settings-card-body">
          <form onSubmit={handlePasswordChange} className="settings-form-grid two-col">
            <div className="settings-field">
              <label>Account Email</label>
              <input
                type="text"
                disabled
                value={user?.email || userRow?.email || 'agent@place4u.co.za'}
              />
            </div>

            <div className="settings-field">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="settings-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter your new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="settings-save-btn"
              >
                <Save size={15} />
                <span>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. Commission Payout Banking Details */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title-group">
            <Wallet size={20} color="#10b981" />
            <div>
              <h2>Commission Payout Banking Details</h2>
              <p className="settings-card-desc">South African bank account for receiving 50% placement commission disbursements via EFT</p>
            </div>
          </div>
        </div>

        <div className="settings-card-body">
          <form onSubmit={handleBankingSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="settings-form-grid two-col">
              <div className="settings-field">
                <label>Bank Name</label>
                <select
                  value={banking.bank_name}
                  onChange={(e) => setBanking({ ...banking, bank_name: e.target.value })}
                >
                  {SA_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label>Account Holder Name</label>
                <input
                  type="text"
                  placeholder="e.g. S.D. Khumalo or Khumalo Properties Pty Ltd"
                  value={banking.account_holder}
                  onChange={(e) => setBanking({ ...banking, account_holder: e.target.value })}
                  required
                />
              </div>

              <div className="settings-field">
                <label>Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1012345678"
                  value={banking.account_number}
                  onChange={(e) => setBanking({ ...banking, account_number: e.target.value })}
                  required
                />
              </div>

              <div className="settings-field">
                <label>Branch Code</label>
                <input
                  type="text"
                  placeholder="e.g. 051001 or Universal Code"
                  value={banking.branch_code}
                  onChange={(e) => setBanking({ ...banking, branch_code: e.target.value })}
                />
              </div>

              <div className="settings-field">
                <label>Account Type</label>
                <select
                  value={banking.account_type}
                  onChange={(e) => setBanking({ ...banking, account_type: e.target.value })}
                >
                  <option value="Cheque / Current">Cheque / Current Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="Transmission">Transmission Account</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSavingBanking}
                className="settings-save-btn"
                style={{ background: '#059669' }}
              >
                <Save size={15} />
                <span>{isSavingBanking ? 'Saving...' : 'Save Banking Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 3. Communication & Placement Alerts */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title-group">
            <Bell size={20} color="#7da2ff" />
            <div>
              <h2>Placement Notifications & Alerts</h2>
              <p className="settings-card-desc">Configure how and when you receive tenant match alerts and payout releases</p>
            </div>
          </div>
        </div>

        <div className="settings-card-body">
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>WhatsApp Instant Match Alerts</h4>
              <p>Receive real-time WhatsApp alerts when a verified tenant profile matches your property budget and location.</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('whatsappMatchAlerts')}
              className={`settings-switch ${notifications.whatsappMatchAlerts ? 'active' : ''}`}
            >
              <div className="settings-switch-thumb" />
            </button>
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Viewing Appointment Requests</h4>
              <p>Get notified immediately when a qualified tenant requests an in-person or virtual property viewing.</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('viewingRequestAlerts')}
              className={`settings-switch ${notifications.viewingRequestAlerts ? 'active' : ''}`}
            >
              <div className="settings-switch-thumb" />
            </button>
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Commission Payout Confirmations</h4>
              <p>Receive immediate transaction alerts when tenant lease placement fees clear escrow and deposit into your bank.</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('commissionPayoutAlerts')}
              className={`settings-switch ${notifications.commissionPayoutAlerts ? 'active' : ''}`}
            >
              <div className="settings-switch-thumb" />
            </button>
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Weekly Placement Pipeline Digest</h4>
              <p>Weekly overview of pending tenant applications, market rent benchmarks, and active listing views.</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('emailPlacementDigest')}
              className={`settings-switch ${notifications.emailPlacementDigest ? 'active' : ''}`}
            >
              <div className="settings-switch-thumb" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. POPIA Privacy & Data Export */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title-group">
            <FileText size={20} color="#38bdf8" />
            <div>
              <h2>POPIA Privacy & Data Rights</h2>
              <p className="settings-card-desc">Complying with South Africa's Protection of Personal Information Act, No. 4 of 2013</p>
            </div>
          </div>
        </div>

        <div className="settings-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              Under Section 23 of POPIA, you have the right to request a complete record of all personal information held about you by Place4U. Click below to download your complete data profile in JSON format.
            </p>

            <div>
              <button
                type="button"
                onClick={handleExportData}
                className="settings-save-btn"
                style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}
              >
                <Download size={15} />
                <span>Export Personal Data (DSAR)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Danger Zone - Delete Account */}
      <section className="settings-card danger-zone">
        <div className="settings-card-header">
          <div className="settings-card-title-group">
            <Trash2 size={20} color="#f87171" />
            <div>
              <h2 style={{ color: '#f87171' }}>Danger Zone</h2>
              <p className="settings-card-desc">Irreversible actions regarding your agent portal access</p>
            </div>
          </div>
        </div>

        <div className="settings-card-body">
          <div className="settings-danger-box">
            <div className="settings-danger-desc">
              <h4>Delete Agent Account</h4>
              <p>
                Permanently deletes your agent profile, FICA documentation, active listings, and dissolves active tenant match assignments. All pending commission balances must be settled prior to account deletion.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="settings-danger-btn"
            >
              <Trash2 size={15} />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmationText('');
        }}
        title="Confirm Permanent Account Deletion"
        size="md"
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.82rem',
            lineHeight: 1.5
          }}>
            <strong>Warning:</strong> This action cannot be undone. All your agent verification records, property listings, and placement history will be permanently erased.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
              Type <span style={{ color: '#f87171', fontFamily: 'monospace' }}>DELETE</span> in capital letters to confirm:
            </label>
            <input
              type="text"
              placeholder="DELETE"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              style={{
                padding: '0.75rem',
                background: '#090e1a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmationText('');
              }}
              style={{
                padding: '0.65rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
              onClick={handleDeleteAccount}
              style={{
                padding: '0.65rem 1.25rem',
                background: deleteConfirmationText.trim().toUpperCase() === 'DELETE' ? '#dc2626' : 'rgba(239, 68, 68, 0.3)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: deleteConfirmationText.trim().toUpperCase() === 'DELETE' ? 'pointer' : 'not-allowed'
              }}
            >
              {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
