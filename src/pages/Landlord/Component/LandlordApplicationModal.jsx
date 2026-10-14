import React, { useState } from 'react';
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
  Building,
  BarChart3,
  Check,
  Layers,
  HelpCircle
} from 'lucide-react';
import { LandlordQueries } from '../db/queries';
import { T } from '../Styles/designTokens';

// Sample demo documents for quick 1-click verification testing
const DEMO_SAMPLES = {
  id: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
  titleDeed: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
  rates: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80'
};

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

export const LandlordApplicationModal = ({
  isOpen,
  onClose,
  user,
  profile,
  onSuccess
}) => {
  const [step, setStep] = useState(1); // 1: Portfolio Mode Selection, 2: Landlord & Entity Details, 3: Proof of Ownership / FICA, 4: Review
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initial state defaults
  const [formData, setFormData] = useState({
    // Crucial decision: manage portfolio on website vs listing-only
    manageWithPlatform: profile?.management_tier
      ? (profile.management_tier === 'full_management' || profile.management_tier === 'full')
      : profile?.manage_with_platform !== false,
    fullName: profile?.full_name || user?.user_metadata?.full_name || '',
    companyName: profile?.company_name || '',
    taxId: profile?.tax_id || '',
    phone: profile?.phone || '',
    alternativePhone: profile?.alternative_phone || '',
    address: profile?.address || '',
    city: profile?.city || 'Johannesburg',
    state: profile?.state || 'Gauteng',
    postalCode: profile?.postal_code || '',
    idDocUrl: profile?.id_document_url || '',
    ownershipDocUrl: profile?.ownership_doc_url || '',
    ratesTaxesDocUrl: profile?.rates_taxes_doc_url || '',
    notes: profile?.application_notes || ''
  });

  const [uploadingField, setUploadingField] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (field, file) => {
    if (!file) return;
    setUploadingField(field);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setFormData((prev) => ({ ...prev, [field]: dataUrl }));
      setUploadingField(null);
    };

    reader.onerror = () => {
      setError('Could not process file. Please try another image or document.');
      setUploadingField(null);
    };

    reader.readAsDataURL(file);
  };

  const handleUseDemo = (field, sampleUrl) => {
    setFormData((prev) => ({ ...prev, [field]: sampleUrl }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user?.id) {
      setError('You must be signed in to submit an application.');
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Full name is required.');
      setStep(2);
      return;
    }

    if (!formData.phone.trim()) {
      setError('A primary contact phone number is required.');
      setStep(2);
      return;
    }

    if (!formData.idDocUrl || !formData.ownershipDocUrl) {
      setError('Please provide both your ID document and Proof of Property Ownership (Title Deed / Transfer / Lease mandate).');
      setStep(3);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await LandlordQueries.submitLandlordApplication(user.id, formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit landlord application.');
      }

      if (onSuccess) {
        await onSuccess(result.data);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit application. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusXl,
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 40px 100px -30px rgba(2,132,199,0.45)',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: 5, background: 'linear-gradient(90deg,#7dd3fc,#0ea5e9,#2563eb)', flexShrink: 0 }} />
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: T.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.accent
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.3rem', color: T.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
                Landlord Onboarding & Verification Application
              </h2>
              <p style={{ fontSize: '0.8rem', color: T.textMuted, margin: '2px 0 0' }}>
                Verify property ownership credentials and choose how you manage your portfolio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.textMuted,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            background: T.surfaceAlt,
            borderBottom: `1px solid ${T.border}`,
            fontSize: '0.8rem'
          }}
        >
          {[
            { num: 1, label: 'Portfolio Mode' },
            { num: 2, label: 'Identity & Entity' },
            { num: 3, label: 'Ownership Proof' },
            { num: 4, label: 'Review & Submit' }
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => setStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: isActive ? T.accent : isDone ? T.emerald : T.textMuted,
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isActive ? T.accent : isDone ? T.emerald : T.surface,
                    color: isActive || isDone ? '#fff' : T.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {isDone ? <Check size={14} /> : s.num}
                </div>
                <span className="hidden sm:inline" style={{ display: 'inline' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.75rem 1rem',
                borderRadius: 9999,
                background: T.redSoft,
                border: `1px solid ${T.redBorder}`,
                color: T.red,
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PORTFOLIO MANAGEMENT MODE (CRITICAL REQUIREMENT) */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.textPrimary, margin: '0 0 6px' }}>
                  Step 1: Choose Your Operational Portfolio Mode
                </h3>
                <p style={{ fontSize: '0.85rem', color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>
                  Do you want to manage your full rental portfolio (rents, occupancy, analytics, and tenant rosters)
                  directly on Place4U, or do you only wish to list, market, and upload properties?
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                {/* Option A: Full Portfolio Management (manageWithPlatform = true) */}
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, manageWithPlatform: true }))}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: `2px solid ${formData.manageWithPlatform ? T.accent : T.border}`,
                    background: formData.manageWithPlatform ? T.accentSofter : T.surfaceAlt,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {formData.manageWithPlatform && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: T.accent,
                        color: '#fff',
                        borderRadius: '50%',
                        padding: '3px'
                      }}
                    >
                      <Check size={14} />
                    </div>
                  )}

                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: T.accentSoft,
                      color: T.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px'
                    }}
                  >
                    <BarChart3 size={24} />
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: T.textPrimary, margin: '0 0 6px' }}>
                    Yes, Manage Portfolio On Website
                  </h4>
                  <div
                    style={{
                      display: 'inline-block',
                      background: T.accentSoft,
                      color: T.accent,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    RECOMMENDED · ALL FEATURES
                  </div>
                  <p style={{ fontSize: '0.82rem', color: T.textSecondary, margin: '0 0 12px', lineHeight: 1.4 }}>
                    Full operational control: live rent collections, occupancy KPIs, financial history charts, tenant rosters, and lease tracking.
                  </p>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.2rem',
                      fontSize: '0.78rem',
                      color: T.textMuted,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <li>Real-time revenue charts & rent collection rates</li>
                    <li>Active tenant directory & lease terms</li>
                    <li>Property listing upload, edits & removal</li>
                    <li>Occupancy & deposit tracking</li>
                  </ul>
                </div>

                {/* Option B: Listing-Only Mode (manageWithPlatform = false) */}
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, manageWithPlatform: false }))}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: `2px solid ${!formData.manageWithPlatform ? T.amber : T.border}`,
                    background: !formData.manageWithPlatform ? T.amberSoft : T.surfaceAlt,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {!formData.manageWithPlatform && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: T.amber,
                        color: '#fff',
                        borderRadius: '50%',
                        padding: '3px'
                      }}
                    >
                      <Check size={14} />
                    </div>
                  )}

                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: T.amberSoft,
                      color: T.amber,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px'
                    }}
                  >
                    <Building size={24} />
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: T.textPrimary, margin: '0 0 6px' }}>
                    No, Listing & Marketing Only
                  </h4>
                  <div
                    style={{
                      display: 'inline-block',
                      background: T.amberSoft,
                      color: T.amber,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    LIGHTWEIGHT · MARKETING ONLY
                  </div>
                  <p style={{ fontSize: '0.82rem', color: T.textSecondary, margin: '0 0 12px', lineHeight: 1.4 }}>
                    Ideal if you manage rent books offline or via your own agency ERP. You will only upload, publish, and manage property listings.
                  </p>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.2rem',
                      fontSize: '0.78rem',
                      color: T.textMuted,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <li>Create, edit, pause & remove listings</li>
                    <li>Upload property photos & pricing</li>
                    <li><del>Portfolio revenue analytics</del> (hidden)</li>
                    <li><del>Tenant rosters & rent collections</del> (hidden)</li>
                  </ul>
                </div>
              </div>

              <div
                style={{
                  background: T.surfaceAlt,
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1px solid ${T.border}`,
                  fontSize: '0.8rem',
                  color: T.textMuted
                }}
              >
                💡 You can switch modes anytime from your Landlord Dashboard header or Settings tab.
              </div>
            </div>
          )}

          {/* STEP 2: LANDLORD & ENTITY DETAILS */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.textPrimary, margin: '0 0 4px' }}>
                Step 2: Landlord & Entity Identity
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Company / Trust Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Apex Property Holdings Ltd"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 82 123 4567"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Tax / VAT Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="e.g. 9876543210"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                  Physical Address / Domicilium
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street Address, Suburb"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 9999,
                    background: '#ffffff',
                    border: `1px solid ${T.borderStrong}`,
                    color: T.textPrimary,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Johannesburg"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Province
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="2000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 9999,
                      background: '#ffffff',
                      border: `1px solid ${T.borderStrong}`,
                      color: T.textPrimary,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROOF OF OWNERSHIP & FICA */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.textPrimary, margin: '0 0 4px' }}>
                  Step 3: Verification & Ownership Documentation
                </h3>
                <p style={{ fontSize: '0.82rem', color: T.textSecondary, margin: 0 }}>
                  To protect tenants from fraudulent listings, Place4U verifies South African ID and proof of property ownership (Deed, Municipal Rates, or Mandate).
                </p>
              </div>

              {/* Doc 1: SA ID or Passport */}
              <div
                style={{
                  background: T.surfaceAlt,
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1px solid ${formData.idDocUrl ? T.emerald : T.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color={formData.idDocUrl ? T.emerald : T.accent} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.textPrimary }}>
                      1. South African ID or Passport *
                    </span>
                  </div>
                  {formData.idDocUrl && (
                    <span style={{ fontSize: '0.75rem', color: T.emerald, fontWeight: 600 }}>Attached</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      padding: '8px 14px',
                      background: T.accentSoft,
                      color: T.accent,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UploadCloud size={16} />
                    {uploadingField === 'idDocUrl' ? 'Uploading...' : 'Upload ID Document'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('idDocUrl', e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUseDemo('idDocUrl', DEMO_SAMPLES.id)}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: `1px dashed ${T.borderStrong}`,
                      color: T.textMuted,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Use Sample ID (Quick QA)
                  </button>
                </div>
              </div>

              {/* Doc 2: Proof of Property Ownership (Title Deed / Transfer / Mandate) */}
              <div
                style={{
                  background: T.surfaceAlt,
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1px solid ${formData.ownershipDocUrl ? T.emerald : T.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={18} color={formData.ownershipDocUrl ? T.emerald : T.accent} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.textPrimary }}>
                      2. Proof of Property Ownership (Title Deed / Transfer Letter) *
                    </span>
                  </div>
                  {formData.ownershipDocUrl && (
                    <span style={{ fontSize: '0.75rem', color: T.emerald, fontWeight: 600 }}>Attached</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      padding: '8px 14px',
                      background: T.accentSoft,
                      color: T.accent,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UploadCloud size={16} />
                    {uploadingField === 'ownershipDocUrl' ? 'Uploading...' : 'Upload Ownership Proof'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('ownershipDocUrl', e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUseDemo('ownershipDocUrl', DEMO_SAMPLES.titleDeed)}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: `1px dashed ${T.borderStrong}`,
                      color: T.textMuted,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Use Sample Title Deed
                  </button>
                </div>
              </div>

              {/* Doc 3: Municipal Rates & Taxes (Optional) */}
              <div
                style={{
                  background: T.surfaceAlt,
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1px solid ${formData.ratesTaxesDocUrl ? T.emerald : T.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color={formData.ratesTaxesDocUrl ? T.emerald : T.textMuted} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.textPrimary }}>
                      3. Recent Municipal Rates / Utility Statement (Optional)
                    </span>
                  </div>
                  {formData.ratesTaxesDocUrl && (
                    <span style={{ fontSize: '0.75rem', color: T.emerald, fontWeight: 600 }}>Attached</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      padding: '8px 14px',
                      background: T.surfaceAlt,
                      color: T.textSecondary,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UploadCloud size={16} />
                    {uploadingField === 'ratesTaxesDocUrl' ? 'Uploading...' : 'Upload Rates Bill'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('ratesTaxesDocUrl', e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUseDemo('ratesTaxesDocUrl', DEMO_SAMPLES.rates)}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: `1px dashed ${T.borderStrong}`,
                      color: T.textMuted,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Use Sample Utility Bill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.textPrimary, margin: '0 0 4px' }}>
                Step 4: Review Application Summary
              </h3>

              <div
                style={{
                  background: T.surfaceAlt,
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>Selected Management Mode:</span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: formData.manageWithPlatform ? T.accent : T.amber
                    }}
                  >
                    {formData.manageWithPlatform ? 'Full Portfolio Management (Rents, Tenants & Analytics)' : 'Listing & Marketing Only'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>Landlord Name:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: T.textPrimary }}>{formData.fullName}</span>
                </div>

                {formData.companyName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: T.textMuted }}>Company / Entity:</span>
                    <span style={{ fontSize: '0.82rem', color: T.textPrimary }}>{formData.companyName}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>Contact Phone:</span>
                  <span style={{ fontSize: '0.82rem', color: T.textPrimary }}>{formData.phone}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>ID Document:</span>
                  <span style={{ fontSize: '0.82rem', color: formData.idDocUrl ? T.emerald : T.red }}>
                    {formData.idDocUrl ? '✓ Attached' : '✗ Missing'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: T.textMuted }}>Proof of Ownership:</span>
                  <span style={{ fontSize: '0.82rem', color: formData.ownershipDocUrl ? T.emerald : T.red }}>
                    {formData.ownershipDocUrl ? '✓ Attached' : '✗ Missing'}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: T.textSecondary, marginBottom: '6px' }}>
                  Additional Notes or Instructions for Admin Verifier (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Managing properties under my family trust; contact my assistant for inspections."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 9999,
                    background: '#ffffff',
                    border: `1px solid ${T.borderStrong}`,
                    color: T.textPrimary,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div
                style={{
                  background: T.accentSofter,
                  border: `1px solid ${T.accentBorder}`,
                  padding: '10px 14px',
                  borderRadius: '0.75rem',
                  fontSize: '0.8rem',
                  color: T.textSecondary
                }}
              >
                Upon submission, your application will enter <strong style={{ color: T.accent }}>Pending Verification</strong>.
                Our team checks deed records promptly to safeguard the marketplace.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: `1px solid ${T.borderStrong}`,
                  color: T.textSecondary,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: T.textMuted,
                borderRadius: 9999,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg,#0ea5e9 0%,#0284c7 70%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 10px 24px -10px rgba(2,132,199,0.7)'
                }}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                style={{
                  padding: '8px 24px',
                  background: `linear-gradient(135deg, ${T.accent} 0%, #3b82f6 100%)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9999,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 24px -10px rgba(2,132,199,0.8)'
                }}
              >
                {submitting ? (
                  'Submitting Dossier...'
                ) : (
                  <>
                    <Sparkles size={16} />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
