import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Calendar,
  Building,
  DollarSign,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  ChevronRight,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { Modal } from './Modal';
import { PrimaryBtn, SecondaryBtn } from './Buttons';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { T } from '../Styles/designTokens';
import { LandlordQueries } from '../db/queries';
import { broadcastApplicationUpdate } from '../../../services/applicationSync';
import { APPLICATION_STATUS } from '../../../services/applicationStatus';
import { resolveApplicationProperty, describeProperty } from '../../../utils/propertyLabel';

export const TenantApplicationReviewModal = ({
  isOpen,
  onClose,
  application,
  properties = [],
  onStatusUpdated
}) => {
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [targetPropertyId, setTargetPropertyId] = useState(
    application?.property_id || (properties[0]?.id || '')
  );
  const [leaseMonths, setLeaseMonths] = useState(12);
  const [statusAction, setStatusAction] = useState(null); // 'completed' | 'under_review' | 'rejected'
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Reset the per-application inputs whenever a different application is opened,
  // otherwise the modal keeps the first-mount default (often an empty target).
  useEffect(() => {
    if (!application) return;
    setTargetPropertyId(application.property_id || properties[0]?.id || '');
    setReviewNote('');
    setLeaseMonths(12);
    setFeedbackMsg('');
    setIsAssigning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  if (!isOpen || !application) return null;

  const tenantName = application.tenant?.full_name || application.tenant?.email || 'Prospective Tenant';
  const tenantEmail = application.tenant?.email || '—';
  const tenantPhone = application.tenant?.phone || '—';
  // Resolve the listing the tenant applied for from its real fields — the
  // properties table has no `title`/`name`, so reading those yields the wrong
  // (or a generic) name. Falls back to the application's stored snapshot.
  const resolvedProperty = resolveApplicationProperty(application, properties);
  const propertyTitle = resolvedProperty.label || 'General application (no property linked)';
  const budget = application.max_budget ? `R${Number(application.max_budget).toLocaleString()}/mo` : '—';
  const currentStatus = application.status || 'submitted';

  // Only use documents actually attached to the application. No synthetic fallback.
  let attachedDocs = [];
  if (Array.isArray(application.documents) && application.documents.length > 0) {
    attachedDocs = application.documents;
  } else if (Array.isArray(application.verification_documents) && application.verification_documents.length > 0) {
    attachedDocs = application.verification_documents;
  }

  const handleOpenDoc = (doc) => {
    setSelectedDocForPreview({
      ...doc,
      title: doc.title || doc.name || 'Tenant Verification Document',
      fileType: doc.fileType || (doc.fileName?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    });
  };

  const handleUpdateStatus = async (newStatus) => {
    setIsAssigning(true);
    setFeedbackMsg('');
    try {
      // 1. If approving & completing, assign tenant to selected property unit
      if (newStatus === 'completed' && targetPropertyId) {
        const leaseStart = new Date();
        const leaseEnd = new Date();
        leaseEnd.setMonth(leaseEnd.getMonth() + parseInt(leaseMonths, 10));

        await LandlordQueries.assignTenantToProperty(targetPropertyId, {
          tenantName,
          tenantEmail,
          tenantPhone,
          rent: application.max_budget || null,
          leaseStartDate: leaseStart.toISOString().split('T')[0],
          leaseEndDate: leaseEnd.toISOString().split('T')[0],
          applicationId: application.id,
          tenantUserId: application.tenant_id || null
        });
      }

      // 2. Update status in DB and cache
      const res = await LandlordQueries.updateApplicationStatus(application.id, newStatus, reviewNote);
      if (res.success) {
        // Fan the decision out to the tenant, agent and admin dashboards. Without
        // this the landlord's approval/decline was invisible until a manual refresh.
        broadcastApplicationUpdate(application.id, newStatus, {
          tenant_id: application.tenant_id,
          notes: reviewNote || null,
          reviewed_at: new Date().toISOString(),
          ...(newStatus === APPLICATION_STATUS.COMPLETED && targetPropertyId
            ? { property_id: targetPropertyId }
            : {})
        });
        if (onStatusUpdated) await onStatusUpdated(application.id, newStatus);
        setFeedbackMsg(`Application successfully updated to ${newStatus.toUpperCase()}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg(res.error || 'Failed to update status');
      }
    } catch (err) {
      setFeedbackMsg(err.message || 'Operation failed');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      {/* Sub-modal: PDF & Document Preview Viewer */}
      {selectedDocForPreview && (
        <DocumentPreviewModal
          isOpen={Boolean(selectedDocForPreview)}
          onClose={() => setSelectedDocForPreview(null)}
          document={selectedDocForPreview}
          properties={properties}
        />
      )}

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Tenant Application & Document Review"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header Applicant Strip */}
          <div
            style={{
              background: `linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%)`,
              border: `1px solid ${T.border}`,
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0
                }}
              >
                {tenantName.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                  {tenantName}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '0.8rem', color: T.textMuted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={13} color={T.accent} /> {tenantEmail}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} color={T.accent} /> {tenantPhone}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: currentStatus === 'completed' ? T.emeraldSoft : T.accentSoft,
                  border: `1px solid ${currentStatus === 'completed' ? T.emeraldBorder : T.accentBorder}`,
                  color: currentStatus === 'completed' ? T.emerald : T.accent
                }}
              >
                Status: {currentStatus.replace('_', ' ')}
              </span>
              <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.25rem', color: T.emerald, margin: '6px 0 0' }}>
                {budget}
              </p>
            </div>
          </div>

          {/* SECTION 1: MANDATORY DOCUMENT VETTING & REVIEW */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: T.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color={T.accent} />
                Submitted FICA & Verification Documents ({attachedDocs.length})
              </h4>
              <span style={{ fontSize: '0.75rem', color: T.textMuted }}>
                Click "Review Document" to inspect full PDF/file
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attachedDocs.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: T.textMuted, margin: 0 }}>
                  No verification documents were attached to this application.
                </p>
              )}
              {attachedDocs.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  style={{
                    background: T.surfaceAlt,
                    border: `1px solid ${T.border}`,
                    borderRadius: '0.75rem',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '0.6rem',
                        background: T.accentSoft,
                        border: `1px solid ${T.accentBorder}`,
                        color: T.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title || doc.fileName || `Verification Document ${idx + 1}`}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: T.textMuted }}>
                        {doc.fileName || 'document.pdf'} · Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDoc(doc)}
                    style={{
                      padding: '6px 14px',
                      background: T.accentSoft,
                      border: `1px solid ${T.accentBorder}`,
                      borderRadius: 9999,
                      color: T.accent,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
                  >
                    <Eye size={13} />
                    Review Document
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: UNIT ASSIGNMENT & LEASE PARAMETERS */}
          <div
            style={{
              background: T.surfaceAlt,
              border: `1px solid ${T.border}`,
              borderRadius: '0.875rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: T.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={16} color={T.accent} />
              Assign to Property Unit & Lease Term
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: T.textMuted, marginBottom: '6px' }}>
                  Target Property Unit:
                </label>
                <select
                  value={targetPropertyId}
                  onChange={(e) => setTargetPropertyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0.75rem',
                    background: '#ffffff',
                    border: `1px solid ${T.borderStrong}`,
                    color: T.textPrimary,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {describeProperty(p) || `Listing ${String(p.id).slice(0, 8)}`}
                      {Number(p.price || p.rent) > 0 ? ` · R${Number(p.price || p.rent).toLocaleString('en-ZA')}/mo` : ''}
                    </option>
                  ))}
                  {application.property_id &&
                    !properties.some((p) => p.id === application.property_id) && (
                      <option value={application.property_id}>
                        {propertyTitle} (Linked listing — not in your portfolio)
                      </option>
                    )}
                  {properties.length === 0 && !application.property_id && (
                    <option value="default">{propertyTitle}</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: T.textMuted, marginBottom: '6px' }}>
                  Initial Lease Duration:
                </label>
                <select
                  value={leaseMonths}
                  onChange={(e) => setLeaseMonths(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0.75rem',
                    background: '#ffffff',
                    border: `1px solid ${T.borderStrong}`,
                    color: T.textPrimary,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value={6}>6 Months Lease</option>
                  <option value={12}>12 Months (1 Year Standard)</option>
                  <option value={24}>24 Months Lease</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: T.textMuted, marginBottom: '6px' }}>
                Landlord Review Assessment Notes (Optional):
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="e.g. Bank statements and payslip verified. Approved for move-in from 1st of next month."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '0.75rem',
                  background: '#ffffff',
                  border: `1px solid ${T.borderStrong}`,
                  color: T.textPrimary,
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '0.75rem',
                background: T.emeraldSoft,
                border: `1px solid ${T.emeraldBorder}`,
                color: T.emerald,
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              {feedbackMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '8px',
              borderTop: `1px solid ${T.border}`
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isAssigning}
                onClick={() => handleUpdateStatus('rejected')}
                style={{
                  padding: '8px 16px',
                  background: T.redSoft,
                  border: `1px solid ${T.redBorder}`,
                  color: T.red,
                  borderRadius: 9999,
                  cursor: isAssigning ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                Decline Application
              </button>
              <button
                type="button"
                disabled={isAssigning}
                onClick={() => handleUpdateStatus('under_review')}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: `1px solid ${T.borderStrong}`,
                  color: T.textSecondary,
                  borderRadius: 9999,
                  cursor: isAssigning ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                Mark Under Review
              </button>
            </div>

            <button
              type="button"
              disabled={isAssigning}
              onClick={() => handleUpdateStatus('completed')}
              style={{
                padding: '10px 22px',
                background: `linear-gradient(135deg, #10b981 0%, ${T.emerald} 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isAssigning ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 10px 24px -10px rgba(5,150,105,0.8)'
              }}
            >
              <CheckCircle2 size={16} />
              {isAssigning ? 'Processing Assignment...' : 'Approve & Assign Tenant'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
