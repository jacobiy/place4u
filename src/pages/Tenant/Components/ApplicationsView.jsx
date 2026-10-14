import React, { useState, useEffect } from 'react';
import {
  FileText, MapPin, DollarSign, Calendar, XCircle, Edit2,
  GraduationCap, Home, Eye, CheckCircle2, Paperclip, Plus,
  CreditCard, Lock, UserCheck, Check
} from 'lucide-react';
import { TenantQueries } from '../db/queries';
import CustomApplication from './CustomApplication';
import { ConfirmModal, AlertToast } from '../../../component/AlertModal';
import { PdfPreviewModal } from './PdfAttachmentSection';
import ApplicationFeeCardModal from '../../../component/ApplicationFeeCardModal';
import Loading from '../../../component/loading';
import {
  subscribeToApplicationUpdates,
  mergeLocalAndDbApplications,
  broadcastApplicationUpdate
} from '../../../services/applicationSync';
import {
  resolveApplicationProperty,
  describePropertyLocation,
  isGenericPropertyTitle
} from '../../../utils/propertyLabel';
import {
  APPLICATION_STATUS,
  applicationStatusLabel,
  normalizeApplicationStatus,
  isActiveApplication,
  isClosedApplication
} from '../../../services/applicationStatus';

/* ------------------------------------------------------------------ */
/*  Palette: white surfaces, light-blue washes, one confident blue.    */
/* ------------------------------------------------------------------ */
const CARD = 'bg-white border border-sky-100 shadow-[0_12px_40px_-18px_rgba(2,132,199,0.22)]';
const BTN_PRIMARY =
  'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.55)] transition-colors duration-200 cursor-pointer';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const STATUS_STYLES = {
  submitted: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  under_review: { pill: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  matches_found: { pill: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  completed: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  expired: { pill: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500' },
  cancelled: { pill: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500' },
  rejected: { pill: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500' },
  default: { pill: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
};

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${className}`}>{children}</p>
);

export default function ApplicationsView({
  user,
  setApplicationsCount,
  onOpenCustomApplication,
  properties = [],
  onViewProperty
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [payingApp, setPayingApp] = useState(null);

  const [cancellingApp, setCancellingApp] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchApplications();

    // Cross-dashboard real-time synchronization listener
    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchApplications();
    });

    return () => unsubscribe();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    let apps = [];

    let localApps = [];
    try {
      localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
    } catch {
      localApps = [];
    }

    if (!user?.id) {
      apps = mergeLocalAndDbApplications(localApps, [], user?.id);
      setApplications(apps);
      setApplicationsCount(apps.length);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const result = await TenantQueries.getTenantApplications(user.id);
      if (result.success && Array.isArray(result.data)) {
        apps = mergeLocalAndDbApplications(localApps, result.data, user.id);
        setError(null);
      } else {
        apps = mergeLocalAndDbApplications(localApps, [], user.id);
      }
    } catch {
      apps = mergeLocalAndDbApplications(localApps, [], user.id);
      setError("We couldn't reach the server to refresh your applications. Showing your saved copy.");
    }

    setApplications(apps);
    const activeApps = apps.filter(isActiveApplication);
    setApplicationsCount(activeApps.length);
    setLoading(false);
  };

  const handleOpenCancelConfirm = (app) => {
    setCancellingApp(app);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingApp) return;
    setIsCancelling(true);

    try {
      const cancelRes = await TenantQueries.cancelApplication(cancellingApp.id);

      // Local/demo applications aren't persisted, so their cancellation is
      // applied optimistically. For a saved application, a failed write is a
      // real error and we must not report false success.
      const isLocalOnly = !user?.id || String(cancellingApp.id).startsWith('app-');
      if (!cancelRes?.success && !isLocalOnly) {
        throw new Error(cancelRes?.error || 'Cancellation failed');
      }

      const updated = applications.map((a) =>
        a.id === cancellingApp.id ? { ...a, status: 'cancelled' } : a
      );
      setApplications(updated);

      try {
        const localSaved = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
        const updatedLocal = localSaved.map((a) =>
          a.id === cancellingApp.id ? { ...a, status: 'cancelled' } : a
        );
        localStorage.setItem('place4u_tenant_applications', JSON.stringify(updatedLocal));
      } catch {}

      const activeApps = updated.filter(
        (a) => a.id !== cancellingApp.id && isActiveApplication(a)
      );
      setApplicationsCount(activeApps.length);

      // Broadcast the withdrawal so the agent, admin and landlord views update.
      broadcastApplicationUpdate(cancellingApp.id, APPLICATION_STATUS.CANCELLED);

      setToast({
        type: 'success',
        title: 'Application Cancelled',
        message: 'Your application has been successfully withdrawn.'
      });
    } catch {
      setToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: 'Could not cancel application at this time.'
      });
    } finally {
      setIsCancelling(false);
      setCancellingApp(null);
    }
  };

  const handleFeePaymentSuccess = async (receipt) => {
    if (!payingApp) return;

    const receiptNum = receipt?.receiptNumber || receipt?.orderId || `REC-P4U-${Date.now().toString().slice(-6)}`;
    const paymentId =
      receipt?.paymentId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'pay-' + Date.now());

    // Record payment first to obtain authoritative payment record & ID
    let finalPaymentId = paymentId;
    try {
      const payRes = await TenantQueries.recordPayment({
        id: paymentId,
        payer_id: user?.id,
        application_id: payingApp.id,
        property_id: payingApp.property_id || null,
        amount: 100,
        currency: 'ZAR',
        payment_type: 'application_fee',
        payment_method: 'card',
        receipt_number: receiptNum,
        card_brand: receipt?.cardBrand || 'Card',
        card_last4: receipt?.cardLast4 || null,
        status: 'completed',
        payer_name: user?.user_metadata?.full_name || 'Resident Tenant',
        payer_email: user?.email || null,
        description: `Application Fee (R100) - ${payingApp.property_title || 'Rental Unit'}`
      });
      if (payRes?.data?.id) {
        finalPaymentId = payRes.data.id;
      }
    } catch (err) {
      console.warn('Fee payment persistence notice:', err);
    }

    // Update state immediately for instant responsive UI
    const updated = applications.map((a) =>
      a.id === payingApp.id
        ? {
            ...a,
            fee_paid: true,
            fee_amount: 100,
            fee_currency: 'ZAR',
            fee_receipt: receiptNum,
            payment_method: 'Card (PayPal)',
            payment_id: finalPaymentId
          }
        : a
    );
    setApplications(updated);

    try {
      const localSaved = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
      const updatedLocal = localSaved.map((a) =>
        a.id === payingApp.id
          ? {
              ...a,
              fee_paid: true,
              fee_amount: 100,
              fee_currency: 'ZAR',
              fee_receipt: receiptNum,
              payment_method: 'Card (PayPal)',
              payment_id: finalPaymentId
            }
          : a
      );
      localStorage.setItem('place4u_tenant_applications', JSON.stringify(updatedLocal));
    } catch {}

    // Persist to Supabase Database
    try {
      if (payingApp.id && !payingApp.id.startsWith('app-demo')) {
        await TenantQueries.updateApplication(payingApp.id, {
          fee_paid: true,
          fee_amount: 100,
          fee_currency: 'ZAR',
          fee_receipt: receiptNum,
          payment_method: 'Card (PayPal)',
          payment_id: finalPaymentId
        });

        await TenantQueries.linkPaymentToApplication(finalPaymentId, payingApp.id, {
          receipt_number: receiptNum
        });
      }
    } catch (err) {
      console.warn('Fee payment persistence notice:', err);
    }

    setToast({
      type: 'success',
      title: 'Fee Paid Successfully',
      message: `R100.00 Application Fee settled for "${payingApp.property_title || 'Application'}" (Receipt: ${receiptNum}).`
    });
    setPayingApp(null);

    // Let the agent wallet, admin payments desk and landlord view reflect the
    // settled fee immediately.
    try {
      broadcastApplicationUpdate(payingApp.id, payingApp.status || APPLICATION_STATUS.SUBMITTED, {
        fee_paid: true,
        fee_amount: 100,
        fee_currency: 'ZAR',
        fee_receipt: receiptNum,
        payment_method: 'Card (PayPal)',
        payment_id: finalPaymentId
      });
    } catch (e) {
      console.warn('Fee payment broadcast notice:', e);
    }
  };

  const getStatusStyle = (status) =>
    STATUS_STYLES[normalizeApplicationStatus(status)] || STATUS_STYLES.default;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[16rem]">
        <Loading message="Loading your applications & attached verification documents..." />
      </div>
    );
  }

  const activeCount = applications.filter(isActiveApplication).length;

  return (
    <div className="max-w-6xl mx-auto pb-16 text-slate-900">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      <ConfirmModal
        isOpen={Boolean(cancellingApp)}
        title="Cancel Rental Application?"
        message={`Are you sure you want to cancel this application${cancellingApp?.property_title ? ` for "${cancellingApp.property_title}"` : ''}? The landlord and verification desk will be notified that your inquiry has been withdrawn.`}
        confirmText="Yes, Cancel Application"
        cancelText="Keep Application"
        type="danger"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingApp(null)}
      />

      {previewDoc && <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {/* ============================ HEADER ============================ */}
      <header className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-9 sm:px-10 sm:py-11 mb-10 bg-white/80 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-28 -right-20 w-[380px] h-[380px] rounded-full bg-sky-300/30 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl">
            <Eyebrow className="!text-sky-600 mb-3">Rental inquiries</Eyebrow>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-slate-900 leading-[1.05]">
              My <span className="italic text-sky-600">applications</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              Track your rental inquiries, verified PDF attachments and application status in one place.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start sm:self-auto">
            <div className="px-5 py-3 rounded-2xl bg-white/80 backdrop-blur border border-sky-100 shadow-sm">
              <p className="font-serif text-3xl text-slate-900 leading-none">{activeCount}</p>
              <p className="text-[11px] text-slate-500 mt-1.5">Active</p>
            </div>
            <button
              type="button"
              onClick={onOpenCustomApplication}
              className={`h-12 px-6 rounded-full text-sm font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
            >
              <Plus size={16} />
              Submit application
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-4 rounded-2xl mb-6">{error}</div>
      )}

      {applications.length === 0 ? (
        <div className="py-20 px-6 rounded-[28px] border border-dashed border-sky-200 bg-sky-50/50 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-500 mb-5">
            <FileText size={26} />
          </div>
          <h2 className="font-serif text-2xl text-slate-900 mb-2">No applications yet</h2>
          <p className="text-sm text-slate-500 max-w-md">
            You haven't submitted any rental applications. Choose "Submit application" above to apply for a student
            room or residential home with the required PDF verification documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {applications.map((app) => {
            const isStudent =
              app.accommodation_category === 'student_room' ||
              app.category === 'student_room' ||
              (app.preferred_types || []).some((t) => t.toLowerCase().includes('student')) ||
              (app.property_title || '').toLowerCase().includes('student') ||
              (app.property_title || '').toLowerCase().includes('campus');

            const docs = Array.isArray(app.documents) ? app.documents : [];
            const isFeePaid = Boolean(
              app.fee_paid === true || app.fee_paid === 'true' || Boolean(app.fee_receipt) || Boolean(app.payment_id)
            );
            const statusStyle = getStatusStyle(app.status);
            const isClosed = isClosedApplication(app);

            // Which property this application is for. Resolved from the
            // immutable property_id link first, then the stored title snapshot
            // so older rows that saved a generic placeholder still show up.
            const resolution = resolveApplicationProperty(app, properties);
            const resolvedProperty = resolution.property;
            const propertyLabel =
              resolution.label ||
              (isGenericPropertyTitle(app.property_title) ? null : app.property_title);
            const propertyLocation =
              describePropertyLocation(resolvedProperty) ||
              (propertyLabel && !resolvedProperty ? app.preferred_areas?.join(', ') : null);
            const resolvedPrice = Number(resolvedProperty?.price);
            const propertyPrice =
              Number.isFinite(resolvedPrice) && resolvedPrice > 0
                ? `R${resolvedPrice.toLocaleString('en-ZA')}/mo`
                : null;

            return (
              <article
                key={app.id}
                className={`${CARD} hover:border-sky-300 rounded-[28px] overflow-hidden transition-colors duration-300 flex flex-col justify-between ${
                  isClosed ? 'opacity-75' : ''
                }`}
              >
                <div className="p-6 sm:p-7">
                  {/* Top bar */}
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-sky-50 border border-sky-100 text-sky-700">
                      {isStudent ? <GraduationCap size={13} /> : <Home size={13} />}
                      {isStudent ? 'Student accommodation' : 'Residential property'}
                    </span>

                    <span
                      className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${statusStyle.pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {applicationStatusLabel(app.status)}
                    </span>
                  </div>

                  {/* Which property this application is for */}
                  {propertyLabel && (
                    <div className="mb-6">
                      <Eyebrow>Applied for</Eyebrow>
                      <h3 className="font-serif text-2xl text-slate-900 mt-1.5 leading-tight">{propertyLabel}</h3>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                        {propertyLocation && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={12} className="text-sky-500" />
                            {propertyLocation}
                          </span>
                        )}
                        {propertyPrice && (
                          <span className="inline-flex items-center gap-1.5">
                            <DollarSign size={12} className="text-sky-500" />
                            {propertyPrice}
                          </span>
                        )}
                        {resolvedProperty?.id && (
                          <span className="font-mono text-slate-400">
                            Listing {String(resolvedProperty.id).slice(0, 8)}
                          </span>
                        )}
                        {resolvedProperty && onViewProperty && (
                          <button
                            type="button"
                            onClick={() => onViewProperty(resolvedProperty)}
                            className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-4 cursor-pointer"
                          >
                            <Eye size={12} />
                            View property
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned agent */}
                  {(app.assigned_to || app.agent) && (
                    <div className="mb-6 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                          <UserCheck size={15} />
                        </div>
                        <div className="min-w-0">
                          <Eyebrow className="!text-sky-600">Assigned processing agent</Eyebrow>
                          <p className="font-semibold text-slate-900 text-sm truncate mt-0.5">
                            {app.agent?.full_name || 'Assigned agent'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-white text-sky-700 font-semibold border border-sky-200 shrink-0">
                        Active review
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden bg-sky-100 border border-sky-100 mb-6">
                    <div className="bg-white p-4 col-span-2">
                      <Eyebrow className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-sky-500" /> Preferred areas
                      </Eyebrow>
                      <p className="text-sm font-medium text-slate-900 mt-1.5">
                        {app.preferred_areas?.join(', ') || 'Flexible across Metro'}
                      </p>
                    </div>
                    <div className="bg-white p-4">
                      <Eyebrow className="flex items-center gap-1.5">
                        <DollarSign size={12} className="text-sky-500" /> Budget
                      </Eyebrow>
                      <p className="font-serif text-lg text-sky-700 mt-1.5">
                        R{Number(app.min_budget || 0).toLocaleString('en-ZA')} – R
                        {Number(app.max_budget || 0).toLocaleString('en-ZA')}
                      </p>
                    </div>
                    <div className="bg-white p-4">
                      <Eyebrow className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-sky-500" /> Move in
                      </Eyebrow>
                      <p className="text-sm font-medium text-slate-900 mt-2">{app.move_in_date || 'Flexible'}</p>
                    </div>
                  </div>

                  {app.special_requirements && (
                    <p className="font-serif italic text-[15px] text-slate-600 leading-relaxed line-clamp-2 mb-6 pl-4 border-l-2 border-sky-200">
                      “{app.special_requirements}”
                    </p>
                  )}

                  {/* Documents */}
                  <div className="pt-5 border-t border-sky-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Paperclip size={13} className="text-sky-500" />
                        PDF documents ({docs.length})
                      </span>
                      {docs.length > 0 ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Ready for review
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">Pending attachments</span>
                      )}
                    </div>

                    {docs.length > 0 ? (
                      <div className="space-y-2">
                        {docs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-500 font-bold text-[10px] font-mono shrink-0 border border-rose-100">
                                PDF
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate text-xs">
                                  {doc.shortLabel || doc.title || doc.fileName}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate font-mono">
                                  {doc.fileName} {doc.fileSize ? `· ${doc.fileSize}` : ''}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="h-8 px-3.5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 border border-sky-100 transition-colors cursor-pointer"
                              title="Preview PDF"
                            >
                              <Eye size={13} />
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50/60 border border-dashed border-amber-200 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600 text-[11px] leading-relaxed">
                          {isStudent
                            ? 'Requires: University acceptance + Bursary/NSFAS + ID'
                            : 'Requires: 3 months bank statements + ID + payslip'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingApp(app)}
                          className="text-sky-700 hover:text-sky-900 font-semibold text-[11px] underline underline-offset-4 shrink-0 cursor-pointer"
                        >
                          Attach PDFs
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fee status */}
                  <div className="mt-5 pt-5 border-t border-sky-100">
                    {isFeePaid ? (
                      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check size={15} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-800">Vetting fee paid</p>
                            <p className="text-[11px] text-emerald-700/70">R100 · card payment</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          {app.fee_receipt && (
                            <span className="text-[10px] font-mono text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded-md hidden sm:inline-block truncate">
                              {app.fee_receipt}
                            </span>
                          )}
                          {app.payment_id && (
                            <span
                              className="text-[10px] font-mono text-sky-700 bg-white border border-sky-200 px-2 py-1 rounded-md hidden md:inline-block"
                              title={`Linked Payment ID: ${app.payment_id}`}
                            >
                              PID {String(app.payment_id).slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-500 flex items-center justify-center shrink-0">
                            <CreditCard size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-amber-800">Vetting fee pending</p>
                            <p className="text-[11px] text-amber-700/70">R100 · required to process</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPayingApp(app)}
                          className={`h-9 px-4 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 ${BTN_PRIMARY}`}
                        >
                          <Lock size={11} />
                          Pay R100
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isClosed && (
                  <div className="px-6 sm:px-7 py-4 bg-sky-50/50 border-t border-sky-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">Ref {String(app.id).slice(0, 10)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingApp(app)}
                        className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 ${BTN_OUTLINE}`}
                      >
                        <Edit2 size={13} className="text-sky-600" />
                        Edit / documents
                      </button>
                      <button
                        onClick={() => handleOpenCancelConfirm(app)}
                        className="h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <XCircle size={13} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Application Modal */}
      {editingApp && (
        <CustomApplication
          user={user}
          application={editingApp}
          onCancel={() => setEditingApp(null)}
          onSuccess={() => {
            setToast({
              type: 'success',
              title: 'Application Updated',
              message: 'Your application preferences and PDF attachments were updated successfully.'
            });
            fetchApplications();
          }}
        />
      )}

      {/* Application Fee Card Payment Modal (Powered by PayPal) */}
      {payingApp && (
        <ApplicationFeeCardModal
          isOpen={Boolean(payingApp)}
          onClose={() => setPayingApp(null)}
          onPaymentSuccess={handleFeePaymentSuccess}
          applicantName={user?.user_metadata?.full_name || 'Resident Tenant'}
          propertyTitle={payingApp?.property_title || 'Rental Application'}
          amountZar={100}
        />
      )}
    </div>
  );
}