import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  Phone,
  RefreshCw,
  Check,
  Building,
  Users,
  Wallet,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import AgentActivationModal from './AgentActivationModal';
import { AgentQueries } from '../db/queries';
import './AgentActivationView.css';

export default function AgentActivationView({
  userRow,
  profile,
  onRefresh
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const verificationStatus = profile?.verification_status || (profile?.submitted_at ? 'pending_review' : 'not_applied');
  const isPending = verificationStatus === 'pending_review' || verificationStatus === 'interview_scheduled';
  const isRejected = verificationStatus === 'rejected';

  const handleSimulateToggle = async (targetVerified) => {
    setIsSimulating(true);
    try {
      const userId = userRow?.id || profile?.user_id;
      await AgentQueries.simulateAdminVerification(userId, targetVerified);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplicationSuccess = async () => {
    if (onRefresh) await onRefresh();
  };

  return (
    <div className="dossier-wrapper">
      {/* Verification Modal */}
      <AgentActivationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRow={userRow}
        profile={profile}
        onSuccess={handleApplicationSuccess}
      />

      {/* Header and Compliance Status */}
      <header className="dossier-header">
        <div className="dossier-title-group">
          <h1>Agent Onboarding & Verification</h1>
          <p>
            Place4U requires statutory FICA identity verification and an introductory interview before operational tenant placement and commission withdrawal tools are unlocked for your profile.
          </p>
        </div>

        <div>
          {isPending ? (
            <span className="dossier-status-badge pending">
              <Clock size={14} />
              <span>Application Under Review</span>
            </span>
          ) : (
            <span className="dossier-status-badge inactive">
              <Lock size={13} />
              <span>Verification Required</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace (Unapplied State) */}
      {!isPending && !isRejected && (
        <div className="dossier-workspace">
          {/* Left Column: Requirements Checklist */}
          <section className="dossier-panel">
            <div className="dossier-panel-title">
              <span>Required Submissions</span>
              <span className="count">4 steps</span>
            </div>

            <div className="checklist-list">
              {/* Item 1 */}
              <div className="checklist-row">
                <div className="checklist-step-indicator active">1</div>
                <div className="checklist-step-details">
                  <h4>South African ID or Valid Passport</h4>
                  <p>Smart ID card, green barcoded ID book, or foreign passport with valid South African work endorsement.</p>
                </div>
                <span className="checklist-step-tag required">FICA</span>
              </div>

              {/* Item 2 */}
              <div className="checklist-row">
                <div className="checklist-step-indicator">2</div>
                <div className="checklist-step-details">
                  <h4>Proof of Residential Address</h4>
                  <p>Utility bill, municipal rates invoice, or formal bank statement dated within the last 3 months.</p>
                </div>
                <span className="checklist-step-tag required">FICA</span>
              </div>

              {/* Item 3 */}
              <div className="checklist-row">
                <div className="checklist-step-indicator">3</div>
                <div className="checklist-step-details">
                  <h4>Agency Affiliation & Operating Areas</h4>
                  <p>Estate agency or independent brokerage details and active WhatsApp number for tenant matching handoffs.</p>
                </div>
                <span className="checklist-step-tag">Practice</span>
              </div>

              {/* Item 4 */}
              <div className="checklist-row">
                <div className="checklist-step-indicator">4</div>
                <div className="checklist-step-details">
                  <h4>15-Minute Compliance Review Call</h4>
                  <p>Introductory phone or video interview with Place4U compliance before payout activation.</p>
                </div>
                <span className="checklist-step-tag">Final Step</span>
              </div>
            </div>

            <div className="dossier-action-footer">
              <p className="dossier-help-text">
                Submissions are encrypted and reviewed in accordance with the Financial Intelligence Centre Act and Section 48 of the Property Practitioners Act.
              </p>

              <button
                onClick={() => setIsModalOpen(true)}
                className="dossier-primary-btn"
              >
                <span>Begin Verification</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </section>

          {/* Right Column: Operational Entitlements on Approval */}
          <aside className="entitlement-card">
            <h3>Operational Entitlements Upon Approval</h3>

            <div className="entitlement-list">
              <div className="entitlement-item">
                <div className="entitlement-icon">
                  <Users size={16} />
                </div>
                <div className="entitlement-content">
                  <h5>AI Tenant Match Stream</h5>
                  <p>Algorithmic match feed connecting verified tenant applicants directly to your listings based on verified budgets.</p>
                </div>
              </div>

              <div className="entitlement-item">
                <div className="entitlement-icon">
                  <Wallet size={16} />
                </div>
                <div className="entitlement-content">
                  <h5>50% Placement Commission</h5>
                  <p>Commission tracked transparently in escrow and disbursed directly via South African bank EFT on lease execution.</p>
                </div>
              </div>

              <div className="entitlement-item">
                <div className="entitlement-icon">
                  <Building size={16} />
                </div>
                <div className="entitlement-content">
                  <h5>Property Portfolio Registry</h5>
                  <p>Publish listings, coordinate viewing schedules, and manage application review from a single dashboard.</p>
                </div>
              </div>
            </div>

            <div className="entitlement-regulatory-box">
              <strong>Regulatory Notice:</strong> Unverified accounts may not interact with tenant personal information or collect placement fees.
            </div>
          </aside>
        </div>
      )}

      {/* Pending Review State (Submitted) */}
      {isPending && (
        <section className="pending-dossier">
          <div className="pending-banner">
            <div className="pending-banner-icon">
              <Phone size={18} />
            </div>
            <div>
              <h4>Verification Under Review</h4>
              <p>
                Your documentation has been received. Our compliance officer will contact you on <strong>{profile?.phone || userRow?.phone || 'your phone number'}</strong> via {profile?.preferred_contact_method === 'whatsapp' ? 'WhatsApp' : 'cellular call'} to conduct your brief onboarding interview.
              </p>
            </div>
          </div>

          <div>
            <div className="dossier-panel-title" style={{ marginBottom: '1rem' }}>
              <span>Dossier Summary</span>
              <button
                onClick={onRefresh}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} />
                <span>Refresh Status</span>
              </button>
            </div>

            <table className="dossier-spec-table">
              <tbody>
                <tr>
                  <th>Agent Legal Name</th>
                  <td>{profile?.full_name || userRow?.full_name || '—'}</td>
                </tr>
                <tr>
                  <th>SA ID / Passport</th>
                  <td style={{ fontFamily: 'monospace' }}>{profile?.id_number || userRow?.id_number || '—'}</td>
                </tr>
                <tr>
                  <th>Agency Affiliation</th>
                  <td>{profile?.agency_name || 'Independent Agent'}</td>
                </tr>
                <tr>
                  <th>Contact Number</th>
                  <td>{profile?.phone || userRow?.phone || '—'}</td>
                </tr>
                <tr>
                  <th>Operating Region</th>
                  <td>{profile?.city || '—'}, {profile?.province || 'Gauteng'}</td>
                </tr>
                <tr>
                  <th>Preferred Call Slot</th>
                  <td style={{ textTransform: 'capitalize' }}>{profile?.interview_time_slot || 'Morning (09:00 - 12:00)'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {(profile?.id_document_url || profile?.proof_of_residence_url) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {profile?.id_document_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}>
                  <img src={profile.id_document_url} alt="ID Document" style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>Identity Document</span>
                    <span style={{ fontSize: '0.68rem', color: '#34d399' }}>Attached & Submitted</span>
                  </div>
                </div>
              )}
              {profile?.proof_of_residence_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}>
                  <img src={profile.proof_of_residence_url} alt="Proof of Residence" style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>Proof of Residence</span>
                    <span style={{ fontSize: '0.68rem', color: '#34d399' }}>Attached & Submitted</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Developer / Testing Simulator Utility Strip */}
      <footer className="dev-sim-toolbar">
        <div className="dev-sim-label">
          <span className="mono-badge">DEV</span>
          <span>Verification Simulator — Test approved vs inactive states</span>
        </div>

        <div className="dev-sim-actions">
          <button
            onClick={() => handleSimulateToggle(true)}
            disabled={isSimulating}
            className="dev-btn approve"
          >
            Simulate Approved
          </button>
          <button
            onClick={() => handleSimulateToggle(false)}
            disabled={isSimulating}
            className="dev-btn reset"
          >
            Reset to Inactive
          </button>
        </div>
      </footer>
    </div>
  );
}
