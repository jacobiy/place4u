import React, { useState } from 'react';
import {
  X, FileText, Upload, Calendar, DollarSign, Building, AlertCircle,
  CheckCircle2, FileCheck, ShieldAlert
} from 'lucide-react';
import { supabase } from '../utils/Supabase';
import { uploadLeaseAsLandlord } from '../services/matchWorkflowService';

export default function LeaseUploadModal({
  isOpen,
  onClose,
  match,
  currentUserId,
  onSuccess,
  theme = 'light'
}) {
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
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
  const defaultRent = property.price || match?.application?.max_budget || '';

  const [form, setForm] = useState({
    title: `Lease Agreement - ${property.title || property.address || 'Property'}`,
    rent: defaultRent,
    deposit: defaultRent,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationMonths: '12',
    notes: 'Standard 12-month lease agreement. Water and refuse included. Electricity metered.'
  });

  if (!isOpen || !match) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !fileBase64) {
      setError('Please select a lease agreement PDF file to upload.');
      return;
    }
    if (!form.rent) {
      setError('Please specify the monthly rent amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let leaseStorageUrl = fileBase64;
      const landlordId = currentUserId || match.landlord?.id || 'landlord';

      // Attempt to persist to private Supabase Storage 'documents' bucket
      if (file && landlordId) {
        try {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `landlords/${landlordId}/leases/${Date.now()}_${safeName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || 'application/pdf' });

          if (!uploadErr && uploadData?.path) {
            leaseStorageUrl = uploadData.path;
          }
        } catch (storageErr) {
          console.warn('Storage bucket upload fallback:', storageErr);
        }
      }

      const leaseTerms = {
        rent: Number(form.rent),
        deposit: Number(form.deposit || 0),
        startDate: form.startDate,
        endDate: form.endDate,
        durationMonths: Number(form.durationMonths || 12),
        notes: form.notes,
        fileName: file?.name || 'lease_agreement.pdf',
        fileDataUrl: fileBase64 || null,
        uploadedAt: new Date().toISOString()
      };

      const res = await uploadLeaseAsLandlord(match.id, {
        leaseUrl: leaseStorageUrl,
        leaseTitle: form.title,
        leaseTerms,
        note: `Landlord uploaded lease agreement (${form.title})`
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to upload lease agreement.');
      }
    } catch (err) {
      setError(err?.message || 'An error occurred while uploading.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.input,
    color: colors.text,
    fontSize: 13,
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: colors.muted,
    marginBottom: 5
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
          maxWidth: 600,
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
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
              Upload Official Lease Agreement
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.muted }}>
              Send the rental contract to {tenant.full_name || tenant.email || 'the tenant'} for review and signature
            </p>
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* PDF Upload Dropzone */}
          <div>
            <label style={labelStyle}>Lease Document File (PDF) *</label>
            <div
              style={{
                border: `2px dashed ${file ? colors.ok : colors.border}`,
                borderRadius: 14,
                padding: '24px 16px',
                textAlign: 'center',
                background: file ? colors.okSoft : colors.card,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => document.getElementById('lease-file-input')?.click()}
            >
              <input
                id="lease-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {file ? (
                  <>
                    <FileCheck size={32} color={colors.ok} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.ok }}>
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <span style={{ fontSize: 11, color: colors.muted }}>Click to choose a different PDF</span>
                  </>
                ) : (
                  <>
                    <Upload size={28} color={colors.accent} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                      Select or drag & drop Lease Agreement PDF
                    </span>
                    <span style={{ fontSize: 11, color: colors.muted }}>PDF format up to 20MB</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lease Title */}
          <div>
            <label style={labelStyle}>Document Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          {/* Financials Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Monthly Rent (ZAR) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: 10, color: colors.muted, fontSize: 13 }}>R</span>
                <input
                  type="number"
                  value={form.rent}
                  onChange={(e) => setForm({ ...form, rent: e.target.value })}
                  style={{ ...inputStyle, paddingLeft: 26 }}
                  placeholder="5500"
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Security Deposit (ZAR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: 10, color: colors.muted, fontSize: 13 }}>R</span>
                <input
                  type="number"
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  style={{ ...inputStyle, paddingLeft: 26 }}
                  placeholder="5500"
                />
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Lease Start</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Lease End</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Duration (Months)</label>
              <input
                type="number"
                value={form.durationMonths}
                onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                style={inputStyle}
                min="1"
                max="60"
              />
            </div>
          </div>

          {/* Special Conditions / Notes */}
          <div>
            <label style={labelStyle}>Key Lease Conditions / Special House Rules</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="e.g. Deposit payable prior to key handover. No subletting allowed."
            />
          </div>

          {/* Footer inside form */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 10,
              borderTop: `1px solid ${colors.border}`
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 10,
                background: colors.accent,
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Upload size={14} />
              {isSubmitting ? 'Uploading Lease...' : 'Upload & Send Lease to Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
