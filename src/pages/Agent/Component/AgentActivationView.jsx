import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import AgentActivationModal from './AgentActivationModal';
import { resolveDocumentUrls, AGENT_DOCUMENTS_BUCKET } from '../../../utils/documentUrls';
import './AgentActivationView.css';

// Shared style for the clickable document chips shown in the pending-review view.
const docChipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: '#0a0e1a',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left'
};

export default function AgentActivationView({
  userRow,
  profile,
  onRefresh,
  autoOpenModal = false,
  onAutoOpenHandled = () => {}
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docUrls, setDocUrls] = useState({ id: null, por: null, ffc: null });
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url } for the enlarge modal

  // A signed URL ending in .pdf should render in an <iframe>, everything else as an image
  const isPdfUrl = (url) => typeof url === 'string' && /\.pdf(\?|#|$)/i.test(url);

  const openDocPreview = (title, url) => {
    if (!url) return;
    setPreviewDoc({ title, url });
  };

  // Allow the dashboard header's "Apply for Verification" button to open the form.
  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
      onAutoOpenHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenModal]);

  // Resolve stored FICA document paths into viewable signed URLs
  useEffect(() => {
    let active = true;
    (async () => {
      const resolved = await resolveDocumentUrls(
        {
          id: profile?.id_document_url || null,
          por: profile?.proof_of_residence_url || null,
          ffc: profile?.fidelity_fund_cert_url || null
        },
        { bucket: AGENT_DOCUMENTS_BUCKET }
      );
      if (active) setDocUrls(resolved);
    })();
    return () => {
      active = false;
    };
  }, [
    profile?.id_document_url,
    profile?.proof_of_residence_url,
    profile?.fidelity_fund_cert_url
  ]);

  const verificationStatus = profile?.verification_status || (profile?.submitted_at ? 'pending_review' : 'not_applied');
  const isPending = verificationStatus === 'pending_review' || verificationStatus === 'interview_scheduled';
  const isRejected = verificationStatus === 'rejected';

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

      {/* Full-size document preview */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(2, 6, 23, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0b1120',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              width: 'min(920px, 100%)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.85rem 1.1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem' }}>
                {previewDoc.title}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#7da2ff', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <ExternalLink size={13} />
                  <span>Open in new tab</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                  title="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: '1rem', overflow: 'auto', background: '#05070f' }}>
              {isPdfUrl(previewDoc.url) ? (
                <iframe
                  title={previewDoc.title}
                  src={previewDoc.url}
                  style={{ width: '100%', height: '75vh', border: 'none', borderRadius: '8px', background: '#fff' }}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

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
          ) : isRejected ? (
            <span className="dossier-status-badge inactive" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
              <AlertCircle size={14} />
              <span>Application Rejected</span>
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

      {/* Rejected State — allow the agent to correct and re-apply */}
      {isRejected && (
        <section className="pending-dossier" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div
            className="pending-banner"
            style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <div
              className="pending-banner-icon"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
            >
              <AlertCircle size={18} />
            </div>
            <div>
              <h4>Verification Not Approved</h4>
              <p>
                Your previous application was reviewed and not approved. Reason:{' '}
                <strong>{profile?.rejection_reason || 'Submitted documentation did not satisfy regulatory requirements.'}</strong>
              </p>
            </div>
          </div>

          <div className="dossier-action-footer">
            <p className="dossier-help-text">
              Update your personal details and re-attach valid FICA documents, then resubmit for review.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="dossier-primary-btn"
            >
              <span>Re-apply for Verification</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
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
                  color: '#7da2ff',
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

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {(docUrls.id || profile?.id_document_url) && (
              <button
                type="button"
                onClick={() => openDocPreview('Identity Document', docUrls.id || profile?.id_document_url)}
                style={docChipStyle}
                title="Preview identity document"
              >
                <img
                  src={docUrls.id || profile?.id_document_url}
                  alt="ID Document"
                  style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>Identity Document</span>
                  <span style={{ fontSize: '0.68rem', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={11} /> Attached & Submitted — click to preview
                  </span>
                </div>
              </button>
            )}

            {(docUrls.por || profile?.proof_of_residence_url) && (
              <button
                type="button"
                onClick={() => openDocPreview('Proof of Residence', docUrls.por || profile?.proof_of_residence_url)}
                style={docChipStyle}
                title="Preview proof of residence"
              >
                <img
                  src={docUrls.por || profile?.proof_of_residence_url}
                  alt="Proof of Residence"
                  style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>Proof of Residence</span>
                  <span style={{ fontSize: '0.68rem', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={11} /> Attached & Submitted — click to preview
                  </span>
                </div>
              </button>
            )}

            {(docUrls.ffc || profile?.fidelity_fund_cert_url) && (
              <button
                type="button"
                onClick={() => openDocPreview('Fidelity Fund Certificate', docUrls.ffc || profile?.fidelity_fund_cert_url)}
                style={docChipStyle}
                title="Preview Fidelity Fund Certificate"
              >
                <img
                  src={docUrls.ffc || profile?.fidelity_fund_cert_url}
                  alt="Fidelity Fund Certificate"
                  style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>Fidelity Fund Certificate</span>
                  <span style={{ fontSize: '0.68rem', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={11} /> Attached & Submitted — click to preview
                  </span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="dossier-primary-btn"
              style={{ marginLeft: 'auto' }}
              title="Change your details or replace your FICA documents"
            >
              <span>Edit / Update Application</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
