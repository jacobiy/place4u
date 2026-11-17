import React, { useEffect, useRef, useState } from 'react'
import { 
  ArrowLeft, Home, CheckCircle, AlertCircle, GraduationCap,
  ArrowRight, CreditCard, Lock, CheckCircle2, MapPin, Plus, Search, X
} from 'lucide-react'
import { TenantQueries } from '../db/queries'
import PdfAttachmentSection, { DOCUMENT_CONFIG } from './PdfAttachmentSection'
import ApplicationFeeCardModal from '../../../component/ApplicationFeeCardModal'
import FeeAmount, { FeeBreakdown } from '../../../component/FeeAmount'
import { useFeeQuote } from '../../../hooks/useFeeQuote'
import { formatZarAmount } from '../../../services/promotionService'
import { applyApplicationUpdate } from '../../../services/applicationSync'
import { APPLICATION_STATUS } from '../../../services/applicationStatus'
import { describeProperty, describePropertyLocation, isGenericPropertyTitle } from '../../../utils/propertyLabel'
import {
  loadApplicationProperties,
  saveApplicationProperties,
  clearApplicationProperties,
  toApplicationPropertyEntry
} from '../../../services/applicationPropertyShortlist'

const CustomApplication = ({
  onCancel,
  property,
  user,
  profile,
  application,
  onSuccess,
  properties = [],
  onApplicationPropertiesChange
}) => {
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

  // Live application-fee quote. A promotion can make this R0; when it does, the
  // amount is rendered struck through in red with FREE everywhere fee state shows.
  const { quote: feeQuote } = useFeeQuote();
  const feeIsFree = Boolean(feeQuote?.isFree);
  const feeAmountValue = Number(feeQuote?.finalAmount ?? 100);
  const promotionFeeFields = feeQuote?.promotionApplied
    ? {
        fee_original_amount: feeQuote.originalAmount,
        fee_discount_amount: feeQuote.discountAmount,
        fee_is_free: Boolean(feeQuote.isFree),
        promotion_code: feeQuote.promotion?.code || null,
        promotion_id: feeQuote.promotion?.id || null
      }
    : {};

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

  // Homes bundled into this application. Place4U's premise is one application
  // covering every property a tenant would accept, so the basket seeded from
  // "add to application" lives here rather than on a single property row.
  const [selectedProperties, setSelectedProperties] = useState(() => {
    const existing = loadApplicationProperties();
    const current = toApplicationPropertyEntry(property);
    if (!current) return existing;
    return existing.some((entry) => String(entry.id) === String(current.id))
      ? existing
      : [current, ...existing];
  });
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [propertyQuery, setPropertyQuery] = useState('');

  const updateSelectedProperties = (next) => {
    const persisted = saveApplicationProperties(next);
    setSelectedProperties(persisted);
    if (onApplicationPropertiesChange) onApplicationPropertiesChange(persisted);
    return persisted;
  };

  const addPropertyToSelection = (candidate) => {
    const entry = toApplicationPropertyEntry(candidate);
    if (!entry) return;
    if (selectedProperties.some((existing) => String(existing.id) === String(entry.id))) return;
    updateSelectedProperties([...selectedProperties, entry]);
  };

  const removePropertyFromSelection = (entry) => {
    updateSelectedProperties(
      selectedProperties.filter((existing) => String(existing.id) !== String(entry.id))
    );
  };

  // Arriving from a listing means "I want this one in my application": persist
  // it so a refresh or back-navigation cannot silently drop the choice.
  useEffect(() => {
    if (!property) return;
    const entry = toApplicationPropertyEntry(property);
    if (!entry) return;
    const current = loadApplicationProperties();
    if (current.some((existing) => String(existing.id) === String(entry.id))) return;
    const persisted = saveApplicationProperties([...current, entry]);
    setSelectedProperties(persisted);
    if (onApplicationPropertiesChange) onApplicationPropertiesChange(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  const selectedPropertyIds = new Set(selectedProperties.map((entry) => String(entry.id)));
  const addableProperties = properties.filter((candidate) => {
    if (candidate?.id == null) return false;
    if (selectedPropertyIds.has(String(candidate.id))) return false;
    const query = propertyQuery.trim().toLowerCase();
    if (!query) return true;
    const haystack = `${describeProperty(candidate) || ''} ${describePropertyLocation(candidate) || ''}`.toLowerCase();
    return haystack.includes(query);
  });

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

  // One readable name for whatever this application covers.
  const applicationTitle =
    describeProperty(property) ||
    (selectedProperties.length > 1
      ? `${selectedProperties.length} shortlisted properties`
      : selectedProperties[0]?.label) ||
    'Rental Application';

  const handleClaimFreeFee = () => {
    const generatedPaymentId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `free-${Date.now()}`;
    const receipt = {
      receiptNumber: `FREE-P4U-${Date.now().toString().slice(-6)}`,
      paymentId: generatedPaymentId,
      orderId: `FREE-${Date.now()}`,
      amountZar: 0,
      currency: 'ZAR',
      applicantName: profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
      cardBrand: 'Promotion',
      cardLast4: '----',
      paymentMethod: 'Promotion waiver',
      timestamp: new Date().toISOString(),
      promotion: feeQuote?.promotion || null,
      lineItems: feeQuote?.lineItems || []
    };
    setFeePaid(true);
    setFeeReceipt(receipt);
    setPaymentId(generatedPaymentId);
    setShowPaymentModal(false);
    setError(null);
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

    // 2. Enforce Application Fee Payment (R100 via Card Only, or a live waiver)
    let effectiveReceipt = feeReceipt;
    let effectivePaymentId = paymentId;

    if (!feePaid) {
      if (feeIsFree) {
        effectivePaymentId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `free-${Date.now()}`;
        effectiveReceipt = {
          receiptNumber: `FREE-P4U-${Date.now().toString().slice(-6)}`,
          paymentId: effectivePaymentId,
          orderId: `FREE-${Date.now()}`,
          amountZar: 0,
          currency: 'ZAR',
          applicantName: profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
          cardBrand: 'Promotion',
          cardLast4: '----',
          paymentMethod: 'Promotion waiver',
          timestamp: new Date().toISOString(),
          promotion: feeQuote?.promotion || null,
          lineItems: feeQuote?.lineItems || []
        };
        setFeePaid(true);
        setFeeReceipt(effectiveReceipt);
        setPaymentId(effectivePaymentId);
      } else {
        setError(`Please settle the mandatory ${formatZarAmount(feeAmountValue)} Card Application Fee before final submission.`);
        setShowPaymentModal(true);
        setIsSubmitting(false);
        setTimeout(() => errorSummaryRef.current?.focus(), 0);
        return;
      }
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
    // When several homes are bundled, the bundle is named honestly instead.
    const bundledLabel =
      selectedProperties.length > 1
        ? `${selectedProperties.length} shortlisted properties`
        : selectedProperties[0]?.label || null;

    const targetPropertyTitle =
      describeProperty(property) ||
      (!isGenericPropertyTitle(application?.property_title) ? application.property_title : null) ||
      bundledLabel ||
      (category === 'student_room' ? 'Student Accommodation Application' : 'Residential Rental Application');

    const assignedPaymentId = effectivePaymentId || paymentId || effectiveReceipt?.paymentId || application?.payment_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);

    const payload = {
      tenant_id: user?.id,
      property_id: property?.id || application?.property_id || null,
      property_title: targetPropertyTitle,
      shortlisted_properties: selectedProperties.map((entry) => ({
        id: entry.id,
        label: entry.label,
        location: entry.location || null,
        price: entry.price ?? null
      })),
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
      fee_amount: feeAmountValue,
      fee_currency: 'ZAR',
      ...promotionFeeFields,
      fee_receipt: effectiveReceipt?.receiptNumber || (typeof effectiveReceipt === 'string' ? effectiveReceipt : `REC-P4U-${Date.now().toString().slice(-6)}`),
      payment_method: feeIsFree ? 'Promotion waiver' : 'Card (PayPal)',
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
    if (effectiveReceipt) {
      try {
        await TenantQueries.recordPayment({
          id: finalPaymentId,
          payer_id: user?.id,
          application_id: createdAppId.startsWith('app-') ? null : createdAppId,
          property_id: property?.id || null,
          amount: feeAmountValue,
          currency: 'ZAR',
          payment_type: 'application_fee',
          payment_method: feeIsFree ? 'promotion' : 'card',
          gateway: feeIsFree ? 'promotion' : effectiveReceipt.paymentMethod?.includes('PayPal') ? 'paypal' : 'paypal_direct_card',
          gateway_order_id: effectiveReceipt.orderId || null,
          gateway_capture_id: effectiveReceipt.orderId || null,
          receipt_number: effectiveReceipt.receiptNumber || payload.fee_receipt,
          card_brand: effectiveReceipt.cardBrand || 'Card',
          card_last4: effectiveReceipt.cardLast4 || null,
          status: 'completed',
          payer_name: effectiveReceipt.applicantName || profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
          payer_email: user?.email || null,
          description: feeIsFree
            ? `Application Fee (waived${feeQuote?.promotion?.name ? ` by ${feeQuote.promotion.name}` : ''}) - ${targetPropertyTitle}`
            : `Application Screening Fee (${formatZarAmount(feeAmountValue)}) - ${targetPropertyTitle}`,
          ...(feeQuote?.promotionApplied
            ? {
                promotion_code: feeQuote.promotion?.code || null,
                promotion_id: feeQuote.promotion?.id || null,
                original_amount: feeQuote.originalAmount,
                discount_amount: feeQuote.discountAmount,
                promotion_applied: true,
                is_free: Boolean(feeQuote.isFree),
                line_items: feeQuote.lineItems
              }
            : {}),
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

    // The basket has become an application — start the next one clean.
    clearApplicationProperties();
    setSelectedProperties([]);
    if (onApplicationPropertiesChange) onApplicationPropertiesChange([]);

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
        {(property || selectedProperties.length > 0) && (
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-blue-700 pl-3">
            <span className="text-xs font-medium text-slate-500">Applying for</span>
            <span className="font-semibold text-slate-900">{applicationTitle}</span>
            {selectedProperties.length > 1 && (
              <span className="text-sm text-slate-600">{selectedProperties.length} homes bundled</span>
            )}
            {property?.property_type && selectedProperties.length < 2 && (
              <span className="text-sm text-slate-600">{property.property_type}</span>
            )}
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

            {/* Properties bundled into this application */}
            <div className="space-y-4 border border-slate-300 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Properties in this application</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Add every home you would accept. Your agent reviews them together, so you apply and pay once.
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedProperties.length} {selectedProperties.length === 1 ? 'property' : 'properties'}
                </span>
              </div>

              {selectedProperties.length === 0 ? (
                <p className="border-l-2 border-slate-300 px-3 py-2 text-sm text-slate-600">
                  No property added yet — submit a general application, or add specific homes below.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 border-y border-slate-200">
                  {selectedProperties.map((entry) => (
                    <li key={String(entry.id)} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{entry.label}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {entry.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-blue-800" aria-hidden="true" />
                              {entry.location}
                            </span>
                          )}
                          {entry.price != null && (
                            <span>R{Number(entry.price).toLocaleString('en-ZA')} / month</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePropertyFromSelection(entry)}
                        className="min-h-9 shrink-0 inline-flex items-center gap-1 border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 transition-colors"
                        aria-label={`Remove ${entry.label} from this application`}
                      >
                        <X size={13} aria-hidden="true" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPropertyPicker((open) => !open)}
                  aria-expanded={showPropertyPicker}
                  className="min-h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={15} aria-hidden="true" />
                  {showPropertyPicker ? 'Close property list' : 'Add another property'}
                </button>

                {showPropertyPicker && (
                  <div className="space-y-3 border border-slate-200 bg-slate-50 p-3">
                    <label htmlFor="property-search" className="block text-sm font-medium text-slate-800">
                      Search available properties
                    </label>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <input
                        id="property-search"
                        type="text"
                        value={propertyQuery}
                        onChange={(event) => setPropertyQuery(event.target.value)}
                        placeholder="Suburb, city or property type"
                        className="min-h-11 w-full border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {addableProperties.length === 0 ? (
                      <p className="text-sm text-slate-600">No other properties match that search.</p>
                    ) : (
                      <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto border border-slate-200 bg-white">
                        {addableProperties.slice(0, 25).map((candidate) => (
                          <li key={String(candidate.id)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {describeProperty(candidate) || 'Property'}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {describePropertyLocation(candidate) || 'Location not specified'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addPropertyToSelection(candidate)}
                              className="min-h-9 shrink-0 inline-flex items-center gap-1 bg-blue-800 px-3 text-xs font-semibold text-white hover:bg-blue-900 transition-colors"
                            >
                              <Plus size={13} aria-hidden="true" /> Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {addableProperties.length > 25 && (
                      <p className="text-xs text-slate-500">
                        Showing the first 25 matches — refine your search to see more.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

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

              {/* Application Fee Section (card via PayPal, or a live promotion waiver) */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Application fee</h2>
                    <p className="mt-1 text-sm text-slate-600">A one-time assistance and vetting fee is required to submit.</p>
                  </div>
                  <FeeAmount quote={feeQuote} amount={feeQuote?.originalAmount ?? 100} size="md" />
                </div>

                {feeQuote?.promotionApplied && (
                  <div className="border-l-2 border-red-200 bg-red-50/40 px-4 py-3">
                    <FeeBreakdown quote={feeQuote} dense />
                    {feeQuote?.promotion?.name && (
                      <p className="mt-2 text-[11px] font-medium text-red-600">
                        {feeQuote.promotion.name}
                        {feeQuote.promotion.endsAt
                          ? ` · ends ${new Date(feeQuote.promotion.endsAt).toLocaleDateString('en-ZA')}`
                          : ''}
                      </p>
                    )}
                  </div>
                )}

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
                            {feePaid
                              ? feeIsFree || application?.fee_is_free
                                ? 'Application fee waived'
                                : 'Application fee paid'
                              : feeIsFree
                                ? 'Promotion available'
                                : 'Payment required'}
                          </h3>
                          {feePaid ? (
                            <span className="text-xs font-medium text-emerald-800">
                              {feeIsFree || application?.fee_is_free ? 'Free' : 'Paid'}
                            </span>
                          ) : (
                            <span className={`text-xs font-medium ${feeIsFree ? 'text-red-600' : 'text-amber-900'}`}>
                              {feeIsFree ? 'Free · no card required' : 'Card payment'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                          {feePaid
                            ? (feeReceipt?.receiptNumber || (typeof feeReceipt === 'string' ? `Receipt reference: ${feeReceipt}` : 'Payment recorded.'))
                            : feeIsFree
                              ? 'This promotion waives the fee. Claim it to submit without a card.'
                              : `Pay ${formatZarAmount(feeAmountValue)} by card to complete your application. The fee is non-refundable.`}
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
                      ) : feeIsFree ? (
                        <button
                          type="button"
                          onClick={handleClaimFreeFee}
                          className="min-h-11 bg-emerald-700 hover:bg-emerald-800 px-4 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 size={13} />
                          <span>Claim free application</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="min-h-11 bg-blue-800 hover:bg-blue-900 px-4 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                        >
                          <Lock size={13} />
                          <span>Pay {formatZarAmount(feeAmountValue)} with Card</span>
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
                amount: Number(receipt?.amountZar ?? feeAmountValue),
                currency: 'ZAR',
                payment_type: 'application_fee',
                payment_method: receipt?.paymentMethod?.includes('Promotion') ? 'promotion' : 'card',
                gateway: receipt?.paymentMethod?.includes('Promotion') ? 'promotion' : receipt.paymentMethod?.includes('PayPal') ? 'paypal' : 'paypal_direct_card',
                gateway_order_id: receipt.orderId || null,
                gateway_capture_id: receipt.orderId || null,
                receipt_number: receipt.receiptNumber,
                card_brand: receipt.cardBrand || 'Card',
                card_last4: receipt.cardLast4 || null,
                status: 'completed',
                payer_name: receipt.applicantName || profile?.full_name || user?.user_metadata?.full_name || 'Resident Tenant',
                payer_email: user?.email || null,
                description: feeIsFree
                  ? `Application Fee (waived${feeQuote?.promotion?.name ? ` by ${feeQuote.promotion.name}` : ''}) - ${applicationTitle}`
                  : `Application Fee (${formatZarAmount(Number(receipt?.amountZar ?? feeAmountValue))}) - ${applicationTitle}`,
                ...(feeQuote?.promotionApplied
                  ? {
                      promotion_code: feeQuote.promotion?.code || null,
                      promotion_id: feeQuote.promotion?.id || null,
                      original_amount: feeQuote.originalAmount,
                      discount_amount: feeQuote.discountAmount,
                      is_free: Boolean(feeQuote.isFree),
                      line_items: feeQuote.lineItems
                    }
                  : {}),
                metadata: {
                  propertyTitle: applicationTitle,
                  propertyCount: selectedProperties.length,
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
          propertyTitle={applicationTitle}
          amountZar={feeQuote?.originalAmount ?? 100}
          feeQuote={feeQuote}
          onClaimFree={handleClaimFreeFee}
        />
    </div>
  )
}

export default CustomApplication
