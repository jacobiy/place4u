import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Phone
} from 'lucide-react';
import { AgentQueries } from '../db/queries';
import { resolveDocumentUrls, AGENT_DOCUMENTS_BUCKET } from '../../../utils/documentUrls';
import './AgentActivationModal.css';

const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'Free State',
  'North West',
  'Northern Cape'
];

export default function AgentActivationModal({
  isOpen,
  onClose,
  userRow,
  profile,
  onSuccess
}) {
  const [step, setStep] = useState(1); // 1: Info, 2: Documents & Interview
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || userRow?.full_name || '',
    email: userRow?.email || '',
    phone: profile?.phone || userRow?.phone || '',
    id_number: profile?.id_number || userRow?.id_number || '',
    address: profile?.address || '',
    city: profile?.city || 'Johannesburg',
    province: profile?.province || 'Gauteng',
    postal_code: profile?.postal_code || '',
    agency_name: profile?.agency_name || '',
    experience_years: profile?.experience_years ?? 1,
    tax_number: profile?.tax_number || '',
    id_document_url: profile?.id_document_url || '',
    proof_of_residence_url: profile?.proof_of_residence_url || '',
    fidelity_fund_cert_url: profile?.fidelity_fund_cert_url || '',
    preferred_contact_method: profile?.preferred_contact_method || 'whatsapp',
    interview_time_slot: profile?.interview_time_slot || 'morning'
  });

  // Actual File objects selected by the agent (uploaded to private storage on submit)
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [proofOfResidenceFile, setProofOfResidenceFile] = useState(null);
  const [fidelityFundCertFile, setFidelityFundCertFile] = useState(null);

  // Viewable URLs for the dropzone previews (signed URL or object URL)
  const [preview, setPreview] = useState({ id: '', por: '', ffc: '' });

  // Resolve any previously submitted document paths into viewable signed URLs
  useEffect(() => {
    if (!isOpen) return;
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
      if (active) {
        setPreview((prev) => ({
          id: resolved.id || prev.id || '',
          por: resolved.por || prev.por || '',
          ffc: resolved.ffc || prev.ffc || ''
        }));
      }
    })();
    return () => {
      active = false;
    };
  }, [
    isOpen,
    profile?.id_document_url,
    profile?.proof_of_residence_url,
    profile?.fidelity_fund_cert_url
  ]);

  if (!isOpen) return null;

  const hasIdDoc = Boolean(idDocumentFile || formData.id_document_url);
  const hasPorDoc = Boolean(proofOfResidenceFile || formData.proof_of_residence_url);
  const hasFfcDoc = Boolean(fidelityFundCertFile || formData.fidelity_fund_cert_url);

  const handleFileUpload = (field, file) => {
    if (!file) return;
    setError('');

    const objectUrl = URL.createObjectURL(file);
    if (field === 'id_document_url') {
      setIdDocumentFile(file);
      setPreview((prev) => ({ ...prev, id: objectUrl }));
    } else if (field === 'fidelity_fund_cert_url') {
      setFidelityFundCertFile(file);
      setPreview((prev) => ({ ...prev, ffc: objectUrl }));
    } else {
      setProofOfResidenceFile(file);
      setPreview((prev) => ({ ...prev, por: objectUrl }));
    }
  };

  const handleRemoveDoc = (field) => {
    if (field === 'id_document_url') {
      setIdDocumentFile(null);
      setPreview((prev) => ({ ...prev, id: '' }));
    } else if (field === 'fidelity_fund_cert_url') {
      setFidelityFundCertFile(null);
      setPreview((prev) => ({ ...prev, ffc: '' }));
    } else {
      setProofOfResidenceFile(null);
      setPreview((prev) => ({ ...prev, por: '' }));
    }
    setFormData((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasIdDoc || !hasPorDoc) {
      setError('Please provide both your ID document and proof of residence to complete FICA verification.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userId = userRow?.id || profile?.user_id;
      const res = await AgentQueries.submitVerificationApplication(userId, {
        ...formData,
        // Newly attached files take precedence; fall back to an already-stored path
        id_document_file: idDocumentFile,
        proof_of_residence_file: proofOfResidenceFile,
        fidelity_fund_cert_file: fidelityFundCertFile,
        id_document_url: idDocumentFile ? null : (formData.id_document_url || null),
        proof_of_residence_url: proofOfResidenceFile ? null : (formData.proof_of_residence_url || null),
        fidelity_fund_cert_url: fidelityFundCertFile ? null : (formData.fidelity_fund_cert_url || null)
      });
      if (!res.success) throw new Error(res.error || 'Failed to submit application');

      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err?.message || 'Submission error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="activation-modal-backdrop">
      <div className="activation-modal-card">
        {/* Header */}
        <div className="activation-modal-header">
          <div>
            <h3>Apply to Activate Agent Account</h3>
            <p>FICA Document Verification & Onboarding Interview</p>
          </div>
          <button onClick={onClose} className="activation-modal-close" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="activation-modal-progress">
          <span className="activation-progress-label">
            {step === 1 ? 'Step 1 of 2: Practitioner Information' : 'Step 2 of 2: FICA Documents & Interview'}
          </span>
          <div className="activation-progress-track">
            <div className="activation-progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}
          className="activation-modal-body"
        >
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="activation-notice-box">
                Provide your official identity details as they appear on your South African ID / Passport. Information is confidential and strictly used for compliance verification.
              </div>

              {/* Full Name & ID Number */}
              <div className="activation-grid-2">
                <div className="activation-field">
                  <label>Full Legal Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sipho David Khumalo"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="activation-field">
                  <label>SA ID or Passport Number <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9104155021088"
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Email & Contact Phone */}
              <div className="activation-grid-2">
                <div className="activation-field">
                  <label>Account Email</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                  />
                </div>

                <div className="activation-field">
                  <label>Phone / WhatsApp Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 082 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Physical Street Address */}
              <div className="activation-field">
                <label>Residential Physical Address <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Boundary Road, Houghton Estate"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* City, Province, Postal Code */}
              <div className="activation-grid-3">
                <div className="activation-field">
                  <label>City / Town <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johannesburg"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="activation-field">
                  <label>Province <span className="req">*</span></label>
                  <select
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="activation-field">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 2198"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
              </div>

              {/* Agency, Experience & PPRA Credentials */}
              <div className="activation-grid-3">
                <div className="activation-field">
                  <label>Agency or Brokerage Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Independent Practitioner / Rawson"
                    value={formData.agency_name}
                    onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  />
                </div>

                <div className="activation-field">
                  <label>Years of Real Estate Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  />
                </div>

                <div className="activation-field">
                  <label>PPRA FFC / Tax Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2019123456"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="activation-notice-box">
                Attach clear scans or photos of your FICA documentation. Files are encrypted and stored in compliance with POPIA standards.
              </div>

              {/* 1. SA ID Upload */}
              <div className="upload-dropzone-card">
                <div className="upload-dropzone-header">
                  <div>
                    <span className="upload-dropzone-title">South African ID or Valid Passport</span>
                    <p className="upload-dropzone-desc">Smart ID card (both sides), green ID book, or passport</p>
                  </div>
                </div>

                {hasIdDoc ? (
                  <div className="upload-dropzone-preview">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      {preview.id && (
                        <img
                          src={preview.id}
                          alt="ID document preview"
                          style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span style={{ color: '#f1f5f9' }}>ID Document attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc('id_document_url')}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-dropzone-box">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('id_document_url', e.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                    <UploadCloud size={20} color="#7da2ff" />
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Click or drag file to attach ID document
                    </span>
                  </label>
                )}
              </div>

              {/* 2. Proof of Address Upload */}
              <div className="upload-dropzone-card">
                <div className="upload-dropzone-header">
                  <div>
                    <span className="upload-dropzone-title">Proof of Residential Address</span>
                    <p className="upload-dropzone-desc">Utility bill or bank statement issued within the last 3 months</p>
                  </div>
                </div>

                {hasPorDoc ? (
                  <div className="upload-dropzone-preview">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      {preview.por && (
                        <img
                          src={preview.por}
                          alt="Proof of residence preview"
                          style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span style={{ color: '#f1f5f9' }}>Proof of Address attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc('proof_of_residence_url')}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-dropzone-box">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('proof_of_residence_url', e.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                    <UploadCloud size={20} color="#7da2ff" />
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Click or drag file to attach proof of address
                    </span>
                  </label>
                )}
              </div>

              {/* 3. Fidelity Fund Certificate Upload (optional) */}
              <div className="upload-dropzone-card">
                <div className="upload-dropzone-header">
                  <div>
                    <span className="upload-dropzone-title">PPRA Fidelity Fund Certificate</span>
                    <p className="upload-dropzone-desc">Optional — required for practising estate agents registered with the PPRA</p>
                  </div>
                </div>

                {hasFfcDoc ? (
                  <div className="upload-dropzone-preview">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      {preview.ffc && (
                        <img
                          src={preview.ffc}
                          alt="Fidelity Fund Certificate preview"
                          style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span style={{ color: '#f1f5f9' }}>Fidelity Fund Certificate attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc('fidelity_fund_cert_url')}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-dropzone-box">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('fidelity_fund_cert_url', e.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                    <UploadCloud size={20} color="#7da2ff" />
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Click or drag file to attach your Fidelity Fund Certificate
                    </span>
                  </label>
                )}
              </div>

              {/* Interview Booking Options */}
              <div className="activation-grid-2">
                <div className="activation-field">
                  <label>Preferred Call Time Window</label>
                  <select
                    value={formData.interview_time_slot}
                    onChange={(e) => setFormData({ ...formData, interview_time_slot: e.target.value })}
                  >
                    <option value="morning">Morning (09:00 - 12:00 SAST)</option>
                    <option value="afternoon">Afternoon (13:00 - 17:00 SAST)</option>
                    <option value="evening">Evening (17:00 - 19:00 SAST)</option>
                    <option value="anytime">Anytime during business hours</option>
                  </select>
                </div>

                <div className="activation-field">
                  <label>Preferred Communication Channel</label>
                  <select
                    value={formData.preferred_contact_method}
                    onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                  >
                    <option value="whatsapp">WhatsApp Voice Call</option>
                    <option value="phone">Cellular Direct Call</option>
                    <option value="google_meet">Google Meet Video Call</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Modal Footer Actions */}
          <div className="activation-modal-footer">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="modal-btn-cancel"
              >
                Back to Details
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="modal-btn-cancel"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                type="submit"
                className="modal-btn-primary"
              >
                <span>Continue to Documents</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="modal-btn-primary"
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
