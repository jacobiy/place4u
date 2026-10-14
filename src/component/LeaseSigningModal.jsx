import React, { useState, useEffect } from 'react';
import {
  X, FileText, CheckCircle2, ShieldCheck, Download, ExternalLink,
  Calendar, DollarSign, Home, User, Upload, Check, Eye, AlertCircle,
  FileCheck, ArrowDownToLine, RefreshCw, EyeOff, Sparkles
} from 'lucide-react';
import { supabase } from '../utils/Supabase';
import {
  resolveDocumentUrl,
  openDocumentSafely,
  dataUrlToBlobUrl
} from '../utils/documentUrls';
import { signLeaseAsTenant } from '../services/matchWorkflowService';

/**
 * Generates an official, printable Place4U residential lease agreement HTML blob.
 * This guarantees the tenant and landlord can always view, print, and download the
 * lease terms even if a custom binary PDF was not uploaded or is loading.
 */
function generateStandardLeaseBlobUrl({ property, tenant, landlord, terms, match }) {
  const rentVal = terms?.rent || property?.price;
  const rentStr = rentVal != null && rentVal !== '' ? `R${Number(rentVal).toLocaleString('en-ZA')}` : 'R—';
  const depositVal = terms?.deposit != null && terms?.deposit !== '' ? terms.deposit : rentVal;
  const depositStr = depositVal != null && depositVal !== '' ? `R${Number(depositVal).toLocaleString('en-ZA')}` : rentStr;
  const startDateStr = terms?.startDate || 'Upon Handover';
  const endDateStr = terms?.endDate || '12 Months from Commencement';
  const durationStr = terms?.durationMonths ? `${terms.durationMonths} Months` : '12 Months';
  const propertyTitle = property?.title || property?.address || 'Residential Property';
  const propertyLocation = [property?.address, property?.area, property?.city].filter(Boolean).join(', ') || 'South Africa';
  const landlordName = landlord?.full_name || landlord?.email || 'Property Owner';
  const tenantName = tenant?.full_name || tenant?.email || 'Resident / Tenant';
  const notes = terms?.notes || 'Standard residential occupancy terms. The tenant agrees to keep the premises in clean, tenantable order and abide by all building regulations.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Official Residential Lease Agreement</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 36px auto; max-width: 800px; color: #0f172a; line-height: 1.6; padding: 0 20px; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { font-size: 22px; color: #0284c7; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge { background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px; }
    h2 { font-size: 14px; margin-top: 22px; color: #334155; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 18px; font-size: 13px; }
    .table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
    .table th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="badge">Place4U Property Management</span>
      <h1 style="margin-top: 6px;">Residential Lease Agreement</h1>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      Ref: #${match?.id ? String(match.id).slice(0, 8).toUpperCase() : 'P4U-LEASE'}<br>
      Date: ${new Date().toLocaleDateString('en-ZA')}
    </div>
  </div>

  <div class="box">
    <strong style="color: #0f172a; font-size: 15px;">Property Premise:</strong>
    <p style="margin: 4px 0 0; font-size: 13px; color: #334155;">${propertyTitle} &mdash; ${propertyLocation}</p>
  </div>

  <h2>1. Contracting Parties</h2>
  <table class="table">
    <tr>
      <td width="50%">
        <strong>LANDLORD (LESSOR):</strong><br>
        Name: ${landlordName}<br>
        Email: ${landlord?.email || 'Verified Landlord'}<br>
        Phone: ${landlord?.phone || 'On file with Place4U'}
      </td>
      <td width="50%">
        <strong>TENANT (LESSEE):</strong><br>
        Name: ${tenantName}<br>
        Email: ${tenant?.email || 'Applicant'}<br>
        Phone: ${tenant?.phone || 'On file with Place4U'}
      </td>
    </tr>
  </table>

  <h2>2. Financial Terms &amp; Tenancy Period</h2>
  <table class="table">
    <thead>
      <tr><th>Term</th><th>Specification</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Monthly Rental</strong></td><td><strong style="color: #059669;">${rentStr}</strong> per month, payable in advance.</td></tr>
      <tr><td><strong>Security Deposit</strong></td><td><strong>${depositStr}</strong> refundable subject to exit inspection.</td></tr>
      <tr><td><strong>Commencement Date</strong></td><td>${startDateStr}</td></tr>
      <tr><td><strong>Termination Date</strong></td><td>${endDateStr} (${durationStr})</td></tr>
    </tbody>
  </table>

  <h2>3. Conditions &amp; House Regulations</h2>
  <div class="box" style="font-size: 13px; color: #334155; line-height: 1.6;">
    ${notes}
  </div>

  <h2>4. Confirmation &amp; Signature</h2>
  <p style="font-size: 13px; color: #475569;">
    The tenant agrees to execute this contract, upload their signed copy to the Place4U platform, and settle the deposit and first month's rent prior to occupancy.
  </p>

  <div class="footer">
    Place4U Property Match &amp; Lease Platform &bull; Legally Enforceable Residential Contract &bull; Page 1 of 1
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

export default function LeaseSigningModal({
  isOpen,
  onClose,
  match,
  currentUserId,
  userRole = 'tenant',
  onSuccess,
  theme = 'light'
}) {
  const [resolvedLeaseUrl, setResolvedLeaseUrl] = useState(null);
  const [isFallbackLease, setIsFallbackLease] = useState(false);
  const [isLoadingLeaseUrl, setIsLoadingLeaseUrl] = useState(false);

  const [resolvedSignedUrl, setResolvedSignedUrl] = useState(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);

  // Default preview to 'original' (or 'signed' if already completed) so document is immediately visible
  const [previewMode, setPreviewMode] = useState('original');

  const [signedFile, setSignedFile] = useState(null);
  const [signedFileBase64, setSignedFileBase64] = useState('');
  const [signerName, setSignerName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
        okSoft: 'rgba(52,211,153,0.12)',
        input: '#1e293b'
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
        okSoft: '#ecfdf5',
        input: '#ffffff'
      };

  const property = match?.property || {};
  const tenant = match?.tenant || match?.application?.tenant || {};
  const landlord = match?.landlord || {};
  const terms = match?.leaseTerms || {};
  const isAlreadySigned = Boolean(match?.leaseSignedAt || match?.state === 'lease_signed');
  const signature = match?.leaseSignature || {};

  // Prefill tenant name
  useEffect(() => {
    if (tenant.full_name) {
      setSignerName(tenant.full_name);
    }
  }, [tenant.full_name]);

  // Reset errors and selections when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSignedFile(null);
      setSignedFileBase64('');
      setAgreedToTerms(false);
      setPreviewMode(isAlreadySigned ? 'signed' : 'original');
    }
  }, [isOpen, isAlreadySigned]);

  // Resolve Landlord Original Lease URL with bulletproof multi-layer fallback
  useEffect(() => {
    let cancelled = false;
    const fetchLeaseUrl = async () => {
      const url =
        match?.leaseUrl ||
        match?.lease_url ||
        terms?.fileDataUrl ||
        terms?.leaseUrl ||
        terms?.url ||
        terms?.fileUrl ||
        terms?.storagePath ||
        null;

      if (!url) {
        // No explicit file URL in DB -> generate standard lease document so buttons are never disabled!
        const fallbackUrl = generateStandardLeaseBlobUrl({ property, tenant, landlord, terms, match });
        if (!cancelled) {
          setResolvedLeaseUrl(fallbackUrl);
          setIsFallbackLease(true);
        }
        return;
      }

      setIsFallbackLease(false);

      if (url.startsWith('data:')) {
        const blobUrl = dataUrlToBlobUrl(url);
        if (!cancelled) setResolvedLeaseUrl(blobUrl);
        return;
      }

      if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
        if (!cancelled) setResolvedLeaseUrl(url);
        return;
      }

      setIsLoadingLeaseUrl(true);
      try {
        const signed = await resolveDocumentUrl(url, { bucket: 'documents' });
        if (!cancelled && signed) {
          setResolvedLeaseUrl(signed.startsWith('data:') ? dataUrlToBlobUrl(signed) : signed);
        } else if (!cancelled) {
          // If storage RLS denied reading the path, fall back to standard agreement so buttons are active
          const fallbackUrl = generateStandardLeaseBlobUrl({ property, tenant, landlord, terms, match });
          setResolvedLeaseUrl(fallbackUrl);
          setIsFallbackLease(true);
        }
      } catch (err) {
        console.warn('Could not resolve lease document url:', err);
        if (!cancelled) {
          const fallbackUrl = generateStandardLeaseBlobUrl({ property, tenant, landlord, terms, match });
          setResolvedLeaseUrl(fallbackUrl);
          setIsFallbackLease(true);
        }
      } finally {
        if (!cancelled) setIsLoadingLeaseUrl(false);
      }
    };

    if (isOpen) {
      fetchLeaseUrl();
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, match?.leaseUrl, match?.lease_url, terms?.fileDataUrl, terms?.leaseUrl, terms?.url]);

  // Resolve Tenant's Uploaded Signed Lease URL (if already signed)
  useEffect(() => {
    let cancelled = false;
    const fetchSignedLeaseUrl = async () => {
      const url =
        signature?.signedLeaseUrl ||
        signature?.fileDataUrl ||
        match?.signed_lease_url ||
        match?.signedLeaseUrl ||
        null;

      if (!url) {
        setResolvedSignedUrl(null);
        return;
      }

      if (url.startsWith('data:')) {
        const blobUrl = dataUrlToBlobUrl(url);
        if (!cancelled) setResolvedSignedUrl(blobUrl);
        return;
      }

      if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
        if (!cancelled) setResolvedSignedUrl(url);
        return;
      }

      setIsLoadingSignedUrl(true);
      try {
        const signed = await resolveDocumentUrl(url, { bucket: 'documents' });
        if (!cancelled && signed) {
          setResolvedSignedUrl(signed.startsWith('data:') ? dataUrlToBlobUrl(signed) : signed);
        }
      } catch (err) {
        console.warn('Could not resolve signed lease document url:', err);
      } finally {
        if (!cancelled) setIsLoadingSignedUrl(false);
      }
    };

    if (isOpen && isAlreadySigned) {
      fetchSignedLeaseUrl();
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAlreadySigned, signature?.signedLeaseUrl, signature?.fileDataUrl, match?.signed_lease_url]);

  if (!isOpen || !match) return null;

  const handleSignedFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setSignedFile(selected);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setSignedFileBase64(reader.result);
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmitSignedLease = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!signedFile && !signedFileBase64) {
      setError('Please select your signed lease agreement file (PDF or image) to upload.');
      return;
    }
    if (!signerName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please confirm that you have signed and uploaded the executed lease agreement.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let signedLeaseStorageUrl = signedFileBase64;
      const tenantId = currentUserId || tenant.id || 'tenant';

      // Attempt to upload to Supabase storage bucket
      if (signedFile && tenantId) {
        try {
          const safeName = signedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `tenants/${tenantId}/signed_leases/${Date.now()}_${safeName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(path, signedFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: signedFile.type || 'application/pdf'
            });

          if (!uploadErr && uploadData?.path) {
            signedLeaseStorageUrl = uploadData.path;
          }
        } catch (storageErr) {
          console.warn('Storage upload fallback to base64 payload:', storageErr);
        }
      }

      const signatureData = {
        signerName: signerName.trim(),
        idNumber: idNumber.trim() || null,
        signedLeaseUrl: signedLeaseStorageUrl,
        signedLeaseFileName: signedFile?.name || 'signed_lease.pdf',
        fileDataUrl: signedFileBase64,
        signedAt: new Date().toISOString(),
        termsAccepted: true
      };

      const res = await signLeaseAsTenant(
        match.id,
        signatureData,
        `Tenant uploaded signed lease agreement (${signedFile?.name || 'signed_lease.pdf'})`
      );

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to submit signed lease agreement.');
      }
    } catch (err) {
      setError(err?.message || 'Error occurred while uploading signed lease.');
    } finally {
      setIsSubmitting(false);
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
          maxWidth: 740,
          maxHeight: '92vh',
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
            padding: '18px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: colors.card
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: isAlreadySigned ? colors.okSoft : colors.accentSoft,
                color: isAlreadySigned ? colors.ok : colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isAlreadySigned ? <ShieldCheck size={24} /> : <FileText size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
                {match.leaseTitle || 'Residential Lease Agreement'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.muted }}>
                {isAlreadySigned
                  ? `Executed agreement · Signed copy submitted on ${formatDate(match.leaseSignedAt)}`
                  : `Review lease details, download the agreement, and upload your signed copy`}
              </p>
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

        {/* Scrollable Content */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Already Signed Banner */}
          {isAlreadySigned && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: colors.okSoft,
                border: `1px solid ${colors.ok}44`,
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}
            >
              <CheckCircle2 size={26} color={colors.ok} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: colors.ok, fontSize: 14, display: 'block' }}>
                  Signed Lease Agreement Executed &amp; Tenancy Active
                </strong>
                <span style={{ fontSize: 12, color: colors.text, marginTop: 3, display: 'block' }}>
                  Executed copy submitted by {signature.signerName || tenant.full_name || 'Tenant'} on{' '}
                  {formatDate(match.leaseSignedAt)}. The tenancy is confirmed and active.
                </span>
              </div>
            </div>
          )}

          {/* Property & Landlord Strip */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              background: colors.card,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase' }}>
                Property
              </span>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: colors.text }}>
                {property.title || property.address || 'Property Unit'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.muted }}>
                {[property.address, property.city].filter(Boolean).join(', ')}
              </p>
            </div>
            {landlord.full_name && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase' }}>
                  Landlord
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: colors.text }}>
                  {landlord.full_name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.muted }}>
                  {landlord.email || 'Verified Owner'}
                </p>
              </div>
            )}
          </div>

          {/* Key Terms Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Monthly Rent</span>
              <strong style={{ fontSize: 16, color: colors.ok, display: 'block', marginTop: 4 }}>
                {formatZar(terms.rent || property.price)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Deposit</span>
              <strong style={{ fontSize: 16, color: colors.text, display: 'block', marginTop: 4 }}>
                {formatZar(terms.deposit || property.price)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Lease Period</span>
              <strong style={{ fontSize: 13, color: colors.text, display: 'block', marginTop: 4 }}>
                {formatDate(terms.startDate)} – {formatDate(terms.endDate)}
              </strong>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, color: colors.muted, display: 'block' }}>Duration</span>
              <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                {terms.durationMonths ? `${terms.durationMonths} Months` : '12 Months'}
              </strong>
            </div>
          </div>

          {/* Special Rules / Conditions */}
          {terms.notes && (
            <div style={{ padding: 14, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Landlord&apos;s Special Conditions &amp; Rules
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
                {terms.notes}
              </p>
            </div>
          )}

          {/* Official Landlord Lease Document Access Card */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: colors.accentSoft,
                    color: colors.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {terms.fileName || match.leaseTitle || 'Official Lease Agreement'}
                    </p>
                    {isFallbackLease && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: colors.accentSoft,
                          color: colors.accent,
                          textTransform: 'uppercase'
                        }}
                      >
                        Place4U Standard
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    {isFallbackLease
                      ? 'Formal agreement generated with specified rental terms'
                      : `Uploaded by Landlord on ${formatDate(match.leaseUploadedAt || terms.uploadedAt)}`}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Always Active & Clickable */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (resolvedLeaseUrl) {
                      openDocumentSafely(resolvedLeaseUrl, {
                        fileName: terms.fileName || 'lease_agreement.html',
                        download: true
                      });
                    }
                  }}
                  disabled={isLoadingLeaseUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isLoadingLeaseUrl ? 'wait' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <ArrowDownToLine size={13} />
                  {isLoadingLeaseUrl ? 'Preparing...' : 'Download Contract'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (resolvedLeaseUrl) {
                      openDocumentSafely(resolvedLeaseUrl, {
                        fileName: terms.fileName || 'lease_agreement.html',
                        download: false
                      });
                    }
                  }}
                  disabled={isLoadingLeaseUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: colors.accentSoft,
                    color: colors.accent,
                    border: `1px solid ${colors.accent}44`,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isLoadingLeaseUrl ? 'wait' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <ExternalLink size={13} />
                  Open in New Tab
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode(previewMode === 'original' ? null : 'original')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: previewMode === 'original' ? colors.accent : colors.bg,
                    color: previewMode === 'original' ? '#fff' : colors.text,
                    border: `1px solid ${colors.border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {previewMode === 'original' ? <EyeOff size={13} /> : <Eye size={13} />}
                  {previewMode === 'original' ? 'Hide Preview' : 'Preview Document'}
                </button>
              </div>
            </div>

            {/* In-Modal PDF / Contract Preview */}
            {previewMode === 'original' && resolvedLeaseUrl && (
              <div
                style={{
                  marginTop: 6,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `1px solid ${colors.border}`,
                  background: '#ffffff',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                <iframe
                  src={resolvedLeaseUrl}
                  title="Official Lease Agreement Preview"
                  style={{ width: '100%', height: 380, border: 'none', display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* If already signed: View Signed Lease Document */}
          {isAlreadySigned && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                border: `1px solid ${colors.ok}55`,
                background: colors.okSoft,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: colors.ok,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {signature.signedLeaseFileName || 'Executed_Signed_Lease.pdf'}
                    </p>
                    <span style={{ fontSize: 11, color: colors.muted }}>
                      Signed &amp; Uploaded by {signature.signerName || tenant.full_name || 'Tenant'}{' '}
                      {signature.idNumber ? `(ID: ${signature.idNumber})` : ''} on {formatDate(match.leaseSignedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions for Signed Lease */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (resolvedSignedUrl) {
                        openDocumentSafely(resolvedSignedUrl, {
                          fileName: signature.signedLeaseFileName || 'executed_signed_lease.pdf',
                          download: true
                        });
                      } else {
                        alert('Signed document is loading or being processed.');
                      }
                    }}
                    disabled={isLoadingSignedUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: colors.ok,
                      color: '#fff',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isLoadingSignedUrl ? 'wait' : 'pointer'
                    }}
                  >
                    <ArrowDownToLine size={13} />
                    Download Signed Copy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (resolvedSignedUrl) {
                        openDocumentSafely(resolvedSignedUrl, {
                          fileName: signature.signedLeaseFileName || 'executed_signed_lease.pdf',
                          download: false
                        });
                      } else {
                        alert('Signed document is loading or being processed.');
                      }
                    }}
                    disabled={isLoadingSignedUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: 'transparent',
                      color: colors.ok,
                      border: `1px solid ${colors.ok}`,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isLoadingSignedUrl ? 'wait' : 'pointer'
                    }}
                  >
                    <ExternalLink size={13} />
                    Open Signed PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewMode(previewMode === 'signed' ? null : 'signed')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: previewMode === 'signed' ? colors.ok : 'transparent',
                      color: previewMode === 'signed' ? '#fff' : colors.text,
                      border: `1px solid ${colors.border}`,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {previewMode === 'signed' ? <EyeOff size={13} /> : <Eye size={13} />}
                    {previewMode === 'signed' ? 'Hide Preview' : 'Preview Signed Copy'}
                  </button>
                </div>
              </div>

              {previewMode === 'signed' && resolvedSignedUrl && (
                <div style={{ marginTop: 6, borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                  <iframe
                    src={resolvedSignedUrl}
                    title="Executed Signed Lease Preview"
                    style={{ width: '100%', height: 380, border: 'none', background: '#fff' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* UPLOAD SIGNED LEASE SECTION (Tenant only, when not yet signed) */}
          {/* ============================================================== */}
          {!isAlreadySigned && userRole === 'tenant' && (
            <div
              style={{
                padding: 20,
                borderRadius: 18,
                border: `1.5px solid ${colors.accent}`,
                background: colors.card,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: colors.accentSoft,
                    color: colors.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Upload size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text }}>
                    Upload Signed Lease Agreement
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.muted }}>
                    Download or print the contract above, sign it, and upload the signed document below to finalize your tenancy.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: colors.muted,
                    marginBottom: 6,
                    letterSpacing: '0.05em'
                  }}
                >
                  Executed Lease Document (PDF or Scan) *
                </label>
                <div
                  style={{
                    border: `2px dashed ${signedFile ? colors.ok : colors.accent}`,
                    borderRadius: 14,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: signedFile ? colors.okSoft : colors.accentSoft,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => document.getElementById('tenant-signed-lease-input')?.click()}
                >
                  <input
                    id="tenant-signed-lease-input"
                    type="file"
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleSignedFileChange}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {signedFile ? (
                      <>
                        <FileCheck size={36} color={colors.ok} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: colors.ok }}>
                          {signedFile.name} ({(signedFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <span style={{ fontSize: 11, color: colors.muted }}>
                          Ready to upload. Click to replace with a different file.
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} color={colors.accent} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                          Select or drag &amp; drop your signed lease document
                        </span>
                        <span style={{ fontSize: 11, color: colors.muted }}>
                          Accepted formats: PDF, PNG, JPG (up to 25MB)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: colors.muted,
                    marginBottom: 5,
                    letterSpacing: '0.05em'
                  }}
                >
                  Full Legal Name of Signer *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Johnathan S. Doe"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.input,
                    color: colors.text,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* National ID / Passport */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: colors.muted,
                    marginBottom: 5,
                    letterSpacing: '0.05em'
                  }}
                >
                  National ID / Passport Number (Optional)
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 9801015024089"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.input,
                    color: colors.text,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Confirmation Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: colors.text,
                  marginTop: 4,
                  lineHeight: 1.5
                }}
              >
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ marginTop: 2, cursor: 'pointer', width: 16, height: 16 }}
                />
                <span>
                  I, <strong>{signerName || 'the undersigned'}</strong>, confirm that I have reviewed all lease conditions,
                  agreed to the rental obligations, signed the document, and uploaded the authentic executed lease agreement.
                </span>
              </label>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={handleSubmitSignedLease}
                  disabled={!signedFile || !signerName.trim() || !agreedToTerms || isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 24px',
                    borderRadius: 12,
                    background: colors.ok,
                    color: '#fff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor:
                      !signedFile || !signerName.trim() || !agreedToTerms || isSubmitting
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      !signedFile || !signerName.trim() || !agreedToTerms || isSubmitting ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Uploading & Executing Lease...' : 'Submit Signed Lease Agreement'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ fontSize: 11, color: colors.muted }}>
            Place4U Secure Lease Management
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
