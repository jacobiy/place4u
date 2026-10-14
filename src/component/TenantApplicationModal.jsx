import React, { useState } from 'react';
import {
  X, User, Mail, Phone, Calendar, DollarSign, MapPin, Building,
  FileText, ShieldCheck, Download, Eye, ExternalLink, CheckCircle2,
  Clock, AlertCircle, Home
} from 'lucide-react';
import { resolveDocumentUrl, openDocumentSafely } from '../utils/documentUrls';

export default function TenantApplicationModal({
  isOpen,
  onClose,
  application,
  tenant,
  property,
  theme = 'light'
}) {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [openingDocId, setOpeningDocId] = useState(null);

  if (!isOpen || !application) return null;

  const isDark = theme === 'dark';
  const colors = isDark
    ? {
        bg: '#0f172a',
        card: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        muted: '#94a3b8',
        accent: '#38bdf8',
        accentSoft: 'rgba(56,189,248,0.12)',
        ok: '#34d399',
        okSoft: 'rgba(52,211,153,0.12)'
      }
    : {
        bg: '#ffffff',
        card: '#f8fafc',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#64748b',
        accent: '#0284c7',
        accentSoft: '#e0f2fe',
        ok: '#059669',
        okSoft: '#ecfdf5'
      };

  const appTenant = tenant || application.tenant || {};
  const tenantName = appTenant.full_name || appTenant.email || 'Applicant';
  const tenantEmail = appTenant.email || '—';
  const tenantPhone = appTenant.phone || '—';

  const documents = Array.isArray(application.documents) ? application.documents : [];

  const handleOpenDoc = async (doc, idx) => {
    const docId = doc.id || idx;
    setOpeningDocId(docId);
    try {
      const rawUrl = doc.fileUrl || doc.url || doc.path || doc.dataUrl;
      let targetUrl = rawUrl;
      if (rawUrl && typeof rawUrl === 'string' && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
        targetUrl = await resolveDocumentUrl(rawUrl, { bucket: 'documents' });
      }
      if (targetUrl) {
        openDocumentSafely(targetUrl, { fileName: doc.fileName || 'tenant_document.pdf' });
      } else {
        alert('Document link could not be generated. Please ensure it was uploaded properly.');
      }
    } catch (err) {
      console.warn('Could not open document:', err);
      alert('Unable to load document: ' + (err?.message || 'Unknown error'));
    } finally {
      setOpeningDocId(null);
    }
  };

  const formatZar = (val) =>
    val != null && val !== '' ? `R${Number(val).toLocaleString('en-ZA')}` : '—';

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: colors.card
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #6366f1 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: '0 4px 12px rgba(56,189,248,0.3)'
              }}
            >
              {tenantName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
                  {tenantName}
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: colors.accentSoft,
                    color: colors.accent,
                    border: `1px solid ${colors.accent}33`
                  }}
                >
                  Tenant Application
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, color: colors.muted, fontSize: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} color={colors.accent} /> {tenantEmail}
                </span>
                {tenantPhone !== '—' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={12} color={colors.accent} /> {tenantPhone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Matched Property Banner */}
          {property && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: colors.card,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Home size={18} color={colors.accent} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>
                    {property.title || property.address || property.area || 'Matched Property'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.muted }}>
                    {[property.area, property.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              {property.price != null && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.ok }}>
                    {formatZar(property.price)}/mo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12
            }}
          >
            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Monthly Budget</span>
              <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                {application.min_budget || application.max_budget
                  ? `${formatZar(application.min_budget)} – ${formatZar(application.max_budget)}`
                  : '—'}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Target Move-In</span>
              <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                {formatDate(application.move_in_date)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Lease Duration</span>
              <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                {application.lease_duration_months ? `${application.lease_duration_months} Months` : '12 Months'}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Category</span>
              <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4, textTransform: 'capitalize' }}>
                {(application.accommodation_category || 'Standard').replace('_', ' ')}
              </strong>
            </div>
          </div>

          {/* Preferences */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preferred Suburbs
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.text, fontWeight: 500 }}>
                {Array.isArray(application.preferred_areas) && application.preferred_areas.length > 0
                  ? application.preferred_areas.join(', ')
                  : 'Flexible'}
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Screening Fee
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: application.fee_paid ? colors.ok : colors.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {application.fee_paid ? (
                  <>
                    <CheckCircle2 size={14} color={colors.ok} /> Paid {application.fee_receipt ? `(${application.fee_receipt})` : '(R100)'}
                  </>
                ) : (
                  'Pending payment'
                )}
              </p>
            </div>
          </div>

          {/* Special Requirements */}
          {(application.cleanSpecialRequirements || application.special_requirements) && (
            <div style={{ padding: 14, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Applicant Notes & Special Requirements
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
                {application.cleanSpecialRequirements || application.special_requirements}
              </p>
            </div>
          )}

          {/* Attached Documents */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color={colors.accent} />
                Submitted FICA & Verification Documents ({documents.length})
              </h4>
              <span style={{ fontSize: 11, color: colors.muted }}>
                Click to inspect attached verification files
              </span>
            </div>

            {documents.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 14,
                  background: colors.card,
                  border: `1px dashed ${colors.border}`,
                  textAlign: 'center',
                  color: colors.muted,
                  fontSize: 13
                }}
              >
                No attachments uploaded directly on this application.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map((doc, idx) => {
                  const docId = doc.id || idx;
                  const isOpening = openingDocId === docId;
                  return (
                    <div
                      key={docId}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: colors.accentSoft,
                            color: colors.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <FileText size={17} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title || doc.shortLabel || doc.fileName || `Verification Document #${idx + 1}`}
                          </p>
                          <span style={{ fontSize: 11, color: colors.muted }}>
                            {doc.fileName || 'document.pdf'} {doc.fileSize ? `· ${doc.fileSize}` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenDoc(doc, idx)}
                        disabled={isOpening}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: colors.accent,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isOpening ? 'wait' : 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Eye size={13} />
                        {isOpening ? 'Loading...' : 'Review Document'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.card,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              background: colors.accent,
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close Application
          </button>
        </div>
      </div>
    </div>
  );
}
