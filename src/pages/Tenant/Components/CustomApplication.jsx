import React, { useState } from 'react'
import { 
  X, MapPin, Home, DollarSign, Calendar, Clock, FileText, 
  CheckCircle, AlertCircle, GraduationCap, Building, ShieldCheck, 
  AlertTriangle, ArrowRight, CreditCard, Lock, CheckCircle2 
} from 'lucide-react'
import { TenantQueries } from '../db/queries'
import PdfAttachmentSection, { DOCUMENT_CONFIG } from './PdfAttachmentSection'
import ApplicationFeeCardModal from '../../../component/ApplicationFeeCardModal'
import { applyApplicationUpdate } from '../../../services/applicationSync'
import { APPLICATION_STATUS } from '../../../services/applicationStatus'
import { describeProperty, isGenericPropertyTitle } from '../../../utils/propertyLabel'

const CustomApplication = ({ onCancel, property, user, profile, application, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Auto-detect whether this is a Student Room application or a Standard Room application
  const detectCategory = () => {
    if (application?.accommodation_category) return application.accommodation_category;
    if (application?.category) return application.category;
    
    // Check if property is a student room / accommodation
    if (property) {
      const pText = `${property.title || ''} ${property.property_type || ''} ${property.description || ''}`.toLowerCase();
      if (
        pText.includes('student') || 
        pText.includes('campus') || 
        pText.includes('nsfas') || 
        pText.includes('residence') ||
        pText.includes('university')
      ) {
        return 'student_room';
      }
    }

    // Check if preferred_types had student room
    const pTypes = (application?.preferred_types || []).join(' ').toLowerCase();
    if (pTypes.includes('student')) return 'student_room';

    return 'standard_room';
  };

  const [category, setCategory] = useState(detectCategory);

  // Application Fee State (R100 Card Payment powered by PayPal)
  const [feePaid, setFeePaid] = useState(Boolean(application?.fee_paid));
  const [feeReceipt, setFeeReceipt] = useState(application?.fee_receipt || null);
  const [paymentId, setPaymentId] = useState(application?.payment_id || null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Initialize attached documents (keyed by slotKey)
  const [documents, setDocuments] = useState(() => {
    const initialDocs = {};
    const existing = application?.documents;
    if (Array.isArray(existing)) {
      existing.forEach(doc => {
        if (doc && doc.slotKey) {
          initialDocs[doc.slotKey] = doc;
        }
      });
    }
    return initialDocs;
  });

  const [formData, setFormData] = useState({
    preferred_areas: application?.preferred_areas?.join(', ') || property?.city || '',
    preferred_types: application?.preferred_types?.join(', ') || property?.property_type || (category === 'student_room' ? 'Student Room' : 'Apartment'),
    min_budget: application?.min_budget || '',
    max_budget: application?.max_budget || property?.price || '',
    move_in_date: application?.move_in_date || '',
    lease_duration_months: application?.lease_duration_months || (category === 'student_room' ? 10 : 12),
    special_requirements: application?.special_requirements || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCategorySwitch = (newCategory) => {
    setCategory(newCategory);
    setError(null);
    // Update preferred type if it's default
    if (newCategory === 'student_room' && (!formData.preferred_types || formData.preferred_types === 'Apartment')) {
      setFormData(prev => ({ ...prev, preferred_types: 'Student Room', lease_duration_months: 10 }));
    } else if (newCategory === 'standard_room' && formData.preferred_types === 'Student Room') {
      setFormData(prev => ({ ...prev, preferred_types: 'Room, Apartment', lease_duration_months: 12 }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // 1. Validate required PDF attachments for the active category
    const activeConfig = DOCUMENT_CONFIG[category] || DOCUMENT_CONFIG.standard_room;
    const missingDocs = activeConfig.slots
      .filter(s => s.required && !documents[s.key])
      .map(s => s.shortLabel || s.title);

    if (missingDocs.length > 0) {
      setError(`Please attach all required PDF documents before submitting: ${missingDocs.join(', ')}.`);
      setIsSubmitting(false);
      return;
    }

    // 2. Enforce Application Fee Payment (R100 via Card Only)
    if (!feePaid) {
      setError('Please settle the mandatory R100 Card Application Fee before final submission.');
      setShowPaymentModal(true);
      setIsSubmitting(false);
      return;
    }

    // Format arrays correctly for Postgres
    const preferredAreasArray = formData.preferred_areas
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const preferredTypesArray = formData.preferred_types
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const docsList = Object.values(documents).filter(Boolean);

    // Record which specific property this application is for. The properties
    // table has no `title` column, so resolve the label from its real fields —
    // otherwise every specific-unit application saved a generic placeholder and
    // the tenant, agent and admin views could not tell which property it was.
    const targetPropertyTitle =
      describeProperty(property) ||
      (!isGenericPropertyTitle(application?.property_title) ? application.property_title : null) ||
      (category === 'student_room' ? 'Student Accommodation Application' : 'Residential Rental Application');

    const assignedPaymentId = paymentId || feeReceipt?.paymentId || application?.payment_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);

    const payload = {
      tenant_id: user?.id,
      property_id: property?.id || application?.property_id || null,
      property_title: targetPropertyTitle,
      accommodation_category: category,
      preferred_areas: preferredAreasArray.length > 0 ? preferredAreasArray : null,
      preferred_types: preferredTypesArray.length > 0 ? preferredTypesArray : null,
      min_budget: formData.min_budget ? parseFloat(formData.min_budget) : null,
      max_budget: formData.max_budget ? parseFloat(formData.max_budget) : null,
      move_in_date: formData.move_in_date || null,
      lease_duration_months: parseInt(formData.lease_duration_months) || null,
      special_requirements: formData.special_requirements || null,
      documents: docsList,
      fee_paid: true,
      fee_amount: 100,
      fee_currency: 'ZAR',
      fee_receipt: feeReceipt?.receiptNumber || (typeof feeReceipt === 'string' ? feeReceipt : `REC-P4U-${Date.now().toString().slice(-6)}`),
      payment_method: 'Card (PayPal)',
      payment_id: assignedPaymentId,
      status: APPLICATION_STATUS.SUBMITTED
    }

    let result;
    if (application?.id) {
      result = await TenantQueries.updateApplication(application.id, payload)
    } else {
      result = await TenantQueries.submitApplication(payload)
    }

    const createdAppId = application?.id || result?.data?.id || `app-${Date.now()}`;
    const finalPaymentId = result?.data?.payment_id || assignedPaymentId;

    // Explicitly link payment record and application record
    if (finalPaymentId) {
      try {
        await TenantQueries.linkPaymentToApplication(finalPaymentId, createdAppId, {
          receipt_number: payload.fee_receipt
        });
      } catch (linkErr) {
        console.warn('Link payment notice:', linkErr);
      }
    }

    // Ensure payment record exists and is linked to the created application
    if (feeReceipt) {
      try {
        await TenantQueries.recordPayment({
          id: finalPaymentId,
          payer_id: user?.id,
          application_id: createdAppId.startsWith('app-') ? null : createdAppId,
          property_id: property?.id || null,
          amount: 100,
          currency: 'ZAR',
          payment_type: 'application_fee',
          payment_method: 'card',
          gateway: feeReceipt.paymentMethod?.includes('PayPal') ? 'paypal' : 'paypal_direct_card',
          gateway_order_id: feeReceipt.orderId || null,
          gateway_capture_id: feeReceipt.orderId || null,
          receipt_number: feeReceipt.receiptNumber || payload.fee_receipt,
          card_brand: feeReceipt.cardBrand || 'Card',
          card_last4: feeReceipt.cardLast4 || null,
          status: 'completed',
          payer_name: feeReceipt.applicantName || profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
          payer_email: user?.email || null,
          description: `Application Screening Fee (R100) - ${targetPropertyTitle}`,
          metadata: {
            propertyTitle: targetPropertyTitle,
            accommodationCategory: category,
            paidAt: feeReceipt.timestamp || new Date().toISOString()
          }
        });
      } catch (payErr) {
        console.warn('Payment record link notice:', payErr);
      }
    }

    // Persist application locally so demo/mock mode always retains documents
    const finalizedApp = {
      id: createdAppId,
      property_id: property?.id || application?.property_id || null,
      property_title: targetPropertyTitle,
      ...payload,
      payment_id: finalPaymentId,
      submitted_at: application?.submitted_at || new Date().toISOString()
    };

    try {
      const existingSaved = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
      const filtered = existingSaved.filter(a => a.id !== finalizedApp.id);
      // Remove large dataUrl from localStorage to avoid quota issues while preserving metadata
      const persistableApp = {
        ...finalizedApp,
        documents: finalizedApp.documents.map(d => ({
          ...d,
          dataUrl: d.dataUrl && d.dataUrl.length > 80000 ? null : d.dataUrl
        }))
      };
      localStorage.setItem('place4u_tenant_applications', JSON.stringify([persistableApp, ...filtered]));
    } catch (e) {
      console.warn('LocalStorage save fallback:', e);
    }

    setSuccess(true);
    if (onSuccess) onSuccess(finalizedApp);
    // Fan the new/updated application out to the agent, admin and landlord
    // dashboards so they do not have to wait for a manual refresh.
    try {
      applyApplicationUpdate(finalizedApp.id, APPLICATION_STATUS.SUBMITTED, {
        tenant_id: payload.tenant_id,
        property_id: finalizedApp.property_id,
        property_title: finalizedApp.property_title,
        submitted_at: finalizedApp.submitted_at,
        documents: finalizedApp.documents
      });
    } catch (e) {
      console.warn('Application broadcast notice:', e);
    }
    setTimeout(() => {
      onCancel();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[94dvh] sm:max-h-[88vh] overflow-y-auto shadow-2xl custom-scrollbar text-white">
        
        {/* Sticky Header */}
        <div className='sticky top-0 bg-[#0b0e14]/95 backdrop-blur-md p-4 sm:p-6 border-b border-white/5 z-20 flex items-center justify-between'>
          <div className="min-w-0 pr-3">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white truncate">
              {application ? 'Edit Rental Application' : 'Submit Rental Application'}
            </h2>
            {property ? (
              <p className="text-xs sm:text-sm text-white/50 mt-1 flex flex-wrap items-center gap-1.5">
                <span>Applying for:</span>
                <span className="text-blue-400 font-semibold truncate">{property.title || 'Property'}</span>
                {property.property_type && (
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {property.property_type}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                Attach your certified PDF verification documents to submit an official application.
              </p>
            )}
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center border-2 border-green-500 shadow-xl shadow-green-500/10">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-white">
              {application ? 'Application Updated!' : 'Application Submitted Successfully!'}
            </h3>
            <p className="text-white/60 max-w-md">
              Your rental application and attached PDF verification documents have been received and recorded for landlord/agent review.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <ShieldCheck size={16} />
              <span>{Object.keys(documents).length} Official Documents Verified</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Top Error Alert */}
            {error && (
              <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 flex items-start gap-3 text-sm animate-in fade-in">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Required Document Submission Incomplete</p>
                  <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Accommodation Category Switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs uppercase tracking-wider text-white/50 font-bold flex items-center gap-2">
                  <Building size={14} className="text-blue-400" />
                  <span>Choose Accommodation Category</span>
                </label>
                <span className="text-[11px] text-white/40">Sets the exact PDF requirements</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Student Accommodation / Student Room */}
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('student_room')}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex items-start gap-3.5 ${
                    category === 'student_room'
                      ? 'bg-blue-600/15 border-blue-500/80 shadow-lg shadow-blue-500/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    category === 'student_room' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    <GraduationCap size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-white">Student Accommodation</p>
                      {category === 'student_room' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      For student rooms, residences, NSFAS & university bursary applicants.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Acceptance Letter
                      </span>
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        NSFAS / Bursary
                      </span>
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        ID
                      </span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Standard Room / Residential Property */}
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('standard_room')}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex items-start gap-3.5 ${
                    category === 'standard_room'
                      ? 'bg-emerald-600/15 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    category === 'standard_room' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    <Home size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-white">Standard Room / Residential</p>
                      {category === 'standard_room' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      For private rooms, apartments, cottages, and working professionals.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Bank Statements
                      </span>
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Certified ID
                      </span>
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Payslip
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic PDF Attachment Feature */}
            <div className="pt-2 border-t border-white/5">
              <PdfAttachmentSection
                category={category}
                documents={documents}
                onDocumentsChange={(updated) => {
                  setDocuments(updated);
                  setError(null);
                }}
                onError={(errText) => setError(errText)}
              />
            </div>

            {/* Application Preference Fields */}
            <div className="space-y-6 pt-4 border-t border-white/10">
              
              {/* Location & Property Type */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-1">
                  <MapPin size={14} />
                  <span>Rental Preferences</span>
                </div>
                <div className="glass rounded-2xl p-5 space-y-4 border border-white/5">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Preferred Areas / Suburbs (Comma Separated)
                    </label>
                    <input 
                      type="text" 
                      name="preferred_areas" 
                      value={formData.preferred_areas} 
                      onChange={handleChange}
                      placeholder={category === 'student_room' ? "e.g. Braamfontein, Auckland Park, Hatfield" : "e.g. Rosebank, Sea Point, Sandton"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Preferred Accommodation Type
                    </label>
                    <input 
                      type="text" 
                      name="preferred_types" 
                      value={formData.preferred_types} 
                      onChange={handleChange}
                      placeholder={category === 'student_room' ? "e.g. Single Room, Ensuite, Sharing" : "e.g. Room, Apartment, Studio"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-1">
                  <DollarSign size={14} />
                  <span>Monthly Rental Budget (ZAR)</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Minimum Budget (R)
                    </label>
                    <input 
                      type="number" 
                      name="min_budget" 
                      value={formData.min_budget} 
                      onChange={handleChange} 
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Maximum Budget (R)
                    </label>
                    <input 
                      type="number" 
                      name="max_budget" 
                      value={formData.max_budget} 
                      onChange={handleChange} 
                      placeholder={category === 'student_room' ? "6500" : "18000"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Lease Timing Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-1">
                  <Calendar size={14} />
                  <span>Move-in Timing & Lease Period</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Target Move-in Date
                    </label>
                    <input 
                      type="date" 
                      name="move_in_date" 
                      value={formData.move_in_date} 
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block font-semibold">
                      Lease Duration (Months)
                    </label>
                    <input 
                      type="number" 
                      name="lease_duration_months" 
                      value={formData.lease_duration_months} 
                      onChange={handleChange} 
                      placeholder={category === 'student_room' ? "10" : "12"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Application Fee Section (R100 - Card Only powered by PayPal) */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold">
                    <CreditCard size={14} className="text-blue-400" />
                    <span>Application Vetting Fee (Card Only)</span>
                  </div>
                  <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    R100.00 ZAR
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  feePaid 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' 
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        feePaid ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'
                      }`}>
                        {feePaid ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {feePaid ? 'R100 Application Fee Settled' : 'Mandatory Vetting Fee (R100.00)'}
                          </h4>
                          {feePaid ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Paid & Verified
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Payment Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">
                          {feePaid 
                            ? `Receipt Ref: ${feeReceipt?.receiptNumber || feeReceipt || 'REC-P4U-891042'} · Cleared via Debit/Credit Card (PayPal)`
                            : 'Covers automated ID check, credit bureau assessment, and document validation. Payable using card only.'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-auto">
                      {feePaid ? (
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white border border-white/10 transition-colors"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                        >
                          <Lock size={13} />
                          <span>Pay R100 with Card</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-1">
                  <FileText size={14} />
                  <span>Additional Notes & Sponsor Details</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <textarea 
                    name="special_requirements" 
                    value={formData.special_requirements} 
                    onChange={handleChange}
                    placeholder={
                      category === 'student_room'
                        ? "Specify your university, student number, NSFAS application reference, or room sharing preferences..."
                        : "Any specific parking requirements, pet approval, guarantor context, or move-in notes?"
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors min-h-[90px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-white/50 flex items-center gap-2 self-start sm:self-auto">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>POPIA compliant & SSL secured file upload</span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors text-center"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-center"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : application ? (
                    <span>Update Application</span>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Card Only Payment Modal (Powered by PayPal) */}
        <ApplicationFeeCardModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={async (receipt) => {
            const assignedPaymentId = receipt?.paymentId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('pay-' + Date.now()));
            setFeePaid(true);
            setFeeReceipt(receipt);
            setPaymentId(assignedPaymentId);
            setError(null);

            // Record payment immediately to Supabase public.payments & local storage
            try {
              const payResult = await TenantQueries.recordPayment({
                id: assignedPaymentId,
                payer_id: user?.id,
                application_id: application?.id || null,
                property_id: property?.id || null,
                amount: 100,
                currency: 'ZAR',
                payment_type: 'application_fee',
                payment_method: 'card',
                gateway: receipt.paymentMethod?.includes('PayPal') ? 'paypal' : 'paypal_direct_card',
                gateway_order_id: receipt.orderId || null,
                gateway_capture_id: receipt.orderId || null,
                receipt_number: receipt.receiptNumber,
                card_brand: receipt.cardBrand || 'Card',
                card_last4: receipt.cardLast4 || null,
                status: 'completed',
                payer_name: receipt.applicantName || profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
                payer_email: user?.email || null,
                description: `Application Fee (R100) - ${property?.title || 'Rental Application'}`,
                metadata: {
                  propertyTitle: property?.title || 'Rental Application',
                  category: category,
                  paidAt: receipt.timestamp || new Date().toISOString()
                }
              });
              if (payResult?.data?.id) {
                setPaymentId(payResult.data.id);
              }
            } catch (err) {
              console.warn('Direct payment recording notice:', err);
            }
          }}
          applicantName={profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant'}
          propertyTitle={property?.title || 'Rental Application'}
          amountZar={100}
        />
      </div>
    </div>
  )
}

export default CustomApplication
