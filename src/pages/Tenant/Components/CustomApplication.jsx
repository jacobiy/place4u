import React, { useRef, useState } from 'react'
import { 
  ArrowLeft, Home, CheckCircle, AlertCircle, GraduationCap,
  ArrowRight, CreditCard, Lock, CheckCircle2
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
  const errorSummaryRef = useRef(null)

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
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    // 2. Enforce Application Fee Payment (R100 via Card Only)
    if (!feePaid) {
      setError('Please settle the mandatory R100 Card Application Fee before final submission.');
      setShowPaymentModal(true);
      setIsSubmitting(false);
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
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
      if (onSuccess) onSuccess(finalizedApp);
      else onCancel();
    }, 1500);
  }

  return (
    <div className="tenant-application-page mx-auto w-full max-w-5xl py-2 text-slate-900">
      <button type="button" onClick={onCancel} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <ArrowLeft size={17} aria-hidden="true" /> Back
      </button>

      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-800">Tenant application</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {application ? 'Edit rental application' : 'Submit rental application'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Share your rental preferences and attach the documents needed for review.
        </p>
        {property && (
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-blue-700 pl-3">
            <span className="text-xs font-medium text-slate-500">Applying for</span>
            <span className="font-semibold text-slate-900">{describeProperty(property) || property.title || 'Selected property'}</span>
            {property.property_type && <span className="text-sm text-slate-600">{property.property_type}</span>}
          </div>
        )}
      </header>
        
        {success ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle size={25} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {application ? 'Application updated' : 'Application submitted'}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Your application and attached documents have been received. You can track its status from Applications.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 pb-8">
            
            {/* Top Error Alert */}
            {error && (
              <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-red-950 flex items-start gap-3 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-red-700">
                <AlertCircle size={19} aria-hidden="true" className="shrink-0 mt-0.5 text-red-700" />
                <div className="flex-1">
                  <p className="font-semibold">Please review before submitting</p>
                  <p className="mt-1 text-sm text-red-900">{error}</p>
                </div>
              </div>
            )}

            {/* Accommodation Category Switcher */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-slate-950">What type of accommodation do you need?</h2>
                <p className="text-sm text-slate-600">This sets the required documents for your application.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Student Accommodation / Student Room */}
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('student_room')}
                  aria-pressed={category === 'student_room'}
                  className={`min-h-28 p-4 border text-left transition-colors flex items-start gap-3 ${
                    category === 'student_room'
                      ? 'bg-blue-50 border-blue-700'
                      : 'bg-white border-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-blue-800">
                    <GraduationCap size={19} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-950">Student accommodation</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      For university, college, TVET, NSFAS, or bursary applicants.
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-500">Acceptance letter, funding proof, and ID</p>
                  </div>
                </button>

                {/* Option 2: Standard Room / Residential Property */}
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('standard_room')}
                  aria-pressed={category === 'standard_room'}
                  className={`min-h-28 p-4 border text-left transition-colors flex items-start gap-3 ${
                    category === 'standard_room'
                      ? 'bg-blue-50 border-blue-700'
                      : 'bg-white border-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-blue-800">
                    <Home size={19} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-950">Residential rental</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      For private rooms, apartments, cottages, and working professionals.
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-500">Bank statements, proof of income, and ID</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic PDF Attachment Feature */}
            <div className="border-t border-slate-200 pt-6">
              <PdfAttachmentSection
                category={category}
                documents={documents}
                onDocumentsChange={(updated) => {
                  setDocuments(updated);
                  setError(null);
                }}
                onError={(errText) => {
                  setError(errText);
                  setTimeout(() => errorSummaryRef.current?.focus(), 0);
                }}
              />
            </div>

            {/* Application Preference Fields */}
            <div className="space-y-8 border-t border-slate-200 pt-6">
              
              {/* Location & Property Type */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Where would you like to live?</h2>
                  <p className="mt-1 text-sm text-slate-600">Separate multiple areas with commas.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="preferred-areas" className="block text-sm font-medium text-slate-800">
                      Preferred areas or suburbs
                    </label>
                    <input 
                      id="preferred-areas"
                      type="text" 
                      name="preferred_areas" 
                      value={formData.preferred_areas} 
                      onChange={handleChange}
                      placeholder={category === 'student_room' ? "e.g. Braamfontein, Auckland Park, Hatfield" : "e.g. Rosebank, Sea Point, Sandton"}
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="preferred-types" className="block text-sm font-medium text-slate-800">
                      Preferred accommodation type
                    </label>
                    <input 
                      id="preferred-types"
                      type="text" 
                      name="preferred_types" 
                      value={formData.preferred_types} 
                      onChange={handleChange}
                      placeholder={category === 'student_room' ? "e.g. Single Room, Ensuite, Sharing" : "e.g. Room, Apartment, Studio"}
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Monthly rental budget</h2>
                  <p className="mt-1 text-sm text-slate-600">Enter amounts in South African rand. These fields are optional.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label htmlFor="min-budget" className="block text-sm font-medium text-slate-800">
                      Minimum (R)
                    </label>
                    <input 
                      id="min-budget"
                      type="number" 
                      name="min_budget" 
                      value={formData.min_budget} 
                      onChange={handleChange} 
                      placeholder="0"
                      min="0"
                      step="100"
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="max-budget" className="block text-sm font-medium text-slate-800">
                      Maximum (R)
                    </label>
                    <input 
                      id="max-budget"
                      type="number" 
                      name="max_budget" 
                      value={formData.max_budget} 
                      onChange={handleChange} 
                      placeholder={category === 'student_room' ? "6500" : "18000"}
                      min="0"
                      step="100"
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Lease Timing Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Move-in and lease</h2>
                  <p className="mt-1 text-sm text-slate-600">Tell us when you plan to move and your preferred lease length.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label htmlFor="move-in-date" className="block text-sm font-medium text-slate-800">
                      Target move-in date <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input 
                      id="move-in-date"
                      type="date" 
                      name="move_in_date" 
                      value={formData.move_in_date} 
                      onChange={handleChange}
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lease-duration" className="block text-sm font-medium text-slate-800">
                      Lease duration (months)
                    </label>
                    <input 
                      id="lease-duration"
                      type="number" 
                      name="lease_duration_months" 
                      value={formData.lease_duration_months} 
                      onChange={handleChange} 
                      placeholder={category === 'student_room' ? "10" : "12"}
                      min="1"
                      max="60"
                      className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Application Fee Section (R100 - Card Only powered by PayPal) */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Application fee</h2>
                    <p className="mt-1 text-sm text-slate-600">A one-time assistance and vetting fee is required to submit.</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">R100.00</span>
                </div>

                <div className={`border-l-2 px-4 py-3 ${
                  feePaid 
                    ? 'bg-emerald-50 border-emerald-700'
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={feePaid ? 'mt-0.5 text-emerald-800' : 'mt-0.5 text-slate-600'}>
                        {feePaid ? <CheckCircle2 size={18} aria-hidden="true" /> : <CreditCard size={18} aria-hidden="true" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-950">
                            {feePaid ? 'Application fee paid' : 'Payment required'}
                          </h3>
                          {feePaid ? (
                            <span className="text-xs font-medium text-emerald-800">
                              Paid
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-900">
                              Card payment
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                          {feePaid 
                            ? (feeReceipt?.receiptNumber || (typeof feeReceipt === 'string' ? `Receipt reference: ${feeReceipt}` : 'Payment recorded.'))
                            : 'Pay by card to complete your application. The fee is non-refundable.'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-auto">
                      {feePaid ? (
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="min-h-11 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="min-h-11 bg-blue-800 hover:bg-blue-900 px-4 text-sm font-semibold text-white transition-colors flex items-center gap-2"
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
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Additional details <span className="font-normal text-slate-500">(optional)</span></h2>
                  <p className="mt-1 text-sm text-slate-600">Add information that may help reviewers understand your needs.</p>
                </div>
                <div>
                  <label htmlFor="special-requirements" className="mb-2 block text-sm font-medium text-slate-800">Notes for reviewers</label>
                  <textarea 
                    id="special-requirements"
                    name="special_requirements" 
                    value={formData.special_requirements} 
                    onChange={handleChange}
                    placeholder={
                      category === 'student_room'
                        ? "Specify your university, student number, NSFAS application reference, or room sharing preferences..."
                        : "Any specific parking requirements, pet approval, guarantor context, or move-in notes?"
                    }
                    className="min-h-28 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-slate-600 max-w-md">
                Attach only documents relevant to this rental application.
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-11 w-full sm:w-auto border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-center"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-11 w-full sm:w-auto bg-blue-800 hover:bg-blue-900 text-white font-semibold px-5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-center"
                >
                  {isSubmitting ? (
                    <span>Submitting application…</span>
                  ) : application ? (
                    <span>Update Application</span>
                  ) : (
                    <>
                      <span>Submit rental application</span>
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
  )
}

export default CustomApplication
