import React, { useEffect, useState } from 'react';
import { setPropertyApprovalStatus } from './db/queries';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  BedDouble,
  Bath,
  Maximize2,
  Car,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  Sparkles,
  Wifi,
  Waves,
  Dumbbell,
  Dog,
  Zap,
  Wind,
  Check,
  X,
  Clock,
  ExternalLink,
  FileText,
  FileCheck,
  ArrowUpRight,
  Printer,
  Compass,
  AlertTriangle,
  Star
} from 'lucide-react';
import { describeProperty } from '../../utils/propertyLabel';

const APPROVAL_META = {
  draft: { label: 'Draft', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
  pending_approval: { label: 'Pending approval', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  approved: { label: 'Approved', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' }
};

const docTypeLabel = (type) =>
  ({
    ownership: 'Proof of Ownership (Title Deed)',
    id: 'Landlord Identity Document',
    rates: 'Municipal Rates Account',
    compliance: 'Electrical / Gas Compliance Certificate',
    banking: 'Bank Account Confirmation'
  }[type] || 'Verification Document');

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || bytes === '') return '';
  if (typeof bytes === 'string') return bytes;
  const n = Number(bytes);
  if (Number.isNaN(n)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
  return `R${amount.toLocaleString('en-ZA')}`;
};

/**
 * Admin PropertyDetailView
 * Elevated architectural residence inspection view for System Administrators:
 * - Identical high-craft architectural layout, sticky header, and bento mosaic.
 * - Complete approval workflow (Approve, Reject with custom feedback, Notes persistence).
 * - Landlord Document Audit inspection suite (Ownership, ID, Rates, Compliance).
 */
export default function PropertyDetailView({ property, onBack, onApprovalChange }) {
  const [activeImage, setActiveImage] = useState(0);
  const [approvalStatus, setApprovalStatus] = useState(property?.approval_status || 'approved');
  const [approvalNotes, setApprovalNotes] = useState(property?.approval_notes || '');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const propertyDocuments = Array.isArray(property?.documents) ? property.documents : [];
  const approval = APPROVAL_META[approvalStatus] || APPROVAL_META.approved;

  const submitReview = async (status, notes = null) => {
    setReviewBusy(true);
    setReviewError('');
    try {
      const updated = await setPropertyApprovalStatus(property.id, status, { notes });
      setApprovalStatus(status);
      setApprovalNotes(notes || '');
      if (onApprovalChange) onApprovalChange(updated);
      return true;
    } catch (err) {
      setReviewError(err.message || 'Could not update the listing status.');
      return false;
    } finally {
      setReviewBusy(false);
    }
  };

  const handleApprove = () => submitReview('approved');

  const openRejectModal = () => {
    setRejectReason(approvalNotes || '');
    setReviewError('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    const notes = rejectReason.trim() || 'Listing did not meet Place4U requirements.';
    const ok = await submitReview('rejected', notes);
    if (ok) setShowRejectModal(false);
  };

  useEffect(() => {
    if (!showRejectModal && !isLightboxOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isLightboxOpen) setIsLightboxOpen(false);
        else if (!reviewBusy) setShowRejectModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showRejectModal, isLightboxOpen, reviewBusy]);

  if (!property) return null;

  const rawImages =
    property?.image_urls && property.image_urls.length > 0
      ? property.image_urls
      : property?.images && property.images.length > 0
        ? property.images
        : property?.image
          ? [property.image]
          : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80'];

  const images = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(Boolean);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  const goToImage = (index) => setActiveImage(((index % images.length) + images.length) % images.length);

  const title = describeProperty(property) || property.title || property.name || 'Architectural Residence';
  const fullAddress = property.address
    ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.province ? `, ${property.province}` : ''}`
    : property.location || 'South Africa';

  const monthlyRent = Number(property.price ?? property.rent ?? 0);
  const formattedRent = formatPrice(monthlyRent);

  const landlordName = property.landlord?.full_name || property.landlord_name || 'Verified Landlord';
  const landlordEmail = property.landlord?.email || 'landlord@place4u.co.za';
  const landlordPhone = property.landlord?.phone || '+27 82 000 0000';

  const bedroomsValue = property.bedrooms ?? property.beds ?? null;
  const bathroomsValue = property.bathrooms ?? property.baths ?? null;
  const sizeValue = property.size || (bedroomsValue ? `${bedroomsValue * 35 + 45} m²` : '320 m²');
  const propertyType = property.property_type || 'Villa / Residence';
  const parkingValue =
    property.parking ||
    (property.parking_bays != null ? `${property.parking_bays} Covered Bays` : '2 Covered Bays');

  const availabilityValue = property.available_from || property.availability || 'Immediate';
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];

  return (
    <div className="w-full min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194]/20">
      {/* Atmospheric Ambient Glows */}
      <div className="relative w-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-[#c4e7ff]/30 rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute top-48 right-10 w-[500px] h-[300px] bg-[#cce5ff]/25 rounded-full blur-3xl" />
      </div>

      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-slate-700 hover:text-[#006194] hover:bg-[#eaedff] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Listings Management</span>
            </button>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate max-w-md">
              <span className="text-[#006194]">Admin Review</span>
              <span className="text-slate-300">/</span>
              <span>Listing Inspection</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold truncate">{title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              style={{
                color: approval.color,
                backgroundColor: approval.bg,
                borderColor: approval.border
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm"
            >
              {approvalStatus === 'approved' ? (
                <Check size={12} />
              ) : approvalStatus === 'pending_approval' ? (
                <Clock size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
              {approval.label}
            </span>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} className="text-[#006194]" />
              <span className="hidden sm:inline">Print Inspection</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==================================================== */}
          {/* LEFT COLUMN: ARCHITECTURAL GALLERY & SPECS (8 COLS) */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Primary Hero Showcase Display */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md group">
              <div className="relative w-full h-[360px] sm:h-[480px] md:h-[540px] overflow-hidden bg-slate-950">
                <img
                  src={images[activeImage]}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                  <span className="bg-[#006194] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Star size={12} className="fill-white" />
                    Admin Audit
                  </span>
                  <span className="bg-white/95 backdrop-blur-md text-[#006194] text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm">
                    {propertyType}
                  </span>
                  <span className="bg-white/95 backdrop-blur-md text-[#00668a] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ref: {String(property.id || 'P-REF').slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {/* Top Right Counter Pill */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="bg-white/95 backdrop-blur-md text-slate-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {activeImage + 1} / {images.length} Photos
                  </span>
                </div>

                {/* Navigation Arrow Controls */}
                {images.length > 1 && (
                  <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none">
                    <button
                      onClick={prevImage}
                      type="button"
                      className="pointer-events-auto p-2.5 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={nextImage}
                      type="button"
                      className="pointer-events-auto p-2.5 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>
                )}

                {/* Bottom Scrim for Title Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent text-white flex items-end justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#7bd0ff]">
                      {property?.city || property?.province || 'Place4U'} Listing Inspection
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm mt-0.5">
                      {title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    type="button"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#006194] hover:bg-white text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    <Maximize2 size={14} />
                    Full Gallery
                  </button>
                </div>
              </div>

              {/* Interactive Thumbnail Selector Strip */}
              {images.length > 1 && (
                <div className="p-3 bg-white flex items-center gap-2.5 overflow-x-auto border-t border-slate-100">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      type="button"
                      className={`relative flex-shrink-0 w-24 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                        activeImage === idx
                          ? 'ring-2 ring-[#006194] opacity-100 scale-[1.02]'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 text-center text-[10px] bg-black/60 text-white py-0.5 font-medium">
                        Photo {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Curated Living Spaces Bento Mosaic */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#006194] uppercase tracking-wider font-bold">
                    Visual Evidence Audit
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Curated Living Spaces</h4>
                </div>
                <span className="text-xs text-slate-400">Landlord Uploaded Photography</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={images[1 % images.length] || images[0]}
                      alt="Living Space"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">Living &amp; Entertaining</span>
                      <Waves size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Main lounge, spatial layout, and verified natural daylight illumination.
                    </p>
                  </div>
                </div>

                <div className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={images[2 % images.length] || images[0]}
                      alt="Kitchen"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">Culinary Kitchen</span>
                      <Sparkles size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Kitchen cabinetry, stove fixtures, water connection, and scullery.
                    </p>
                  </div>
                </div>

                <div className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={images[3 % images.length] || images[0]}
                      alt="Master Suite"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">Primary Suite</span>
                      <BedDouble size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Primary bedroom suite, en-suite sanitary fittings, and wardrobe fixtures.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architectural Spatial Specifications Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-[#e2e7ff] text-[#006194] flex items-center justify-center shrink-0">
                  <Building2 size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-slate-900">
                      Architectural Spatial Specifications
                    </span>
                    <span className="px-2 py-0.5 rounded text-[#006194] text-[10px] font-bold bg-[#eaedff]">
                      Compliance Inspection
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verified floor space measurements, spatial elevations, and room counts.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-600 text-xs font-semibold">
                    <span>Floor Area: {sizeValue}</span>
                    <span>•</span>
                    <span>Bedrooms: {bedroomsValue ?? 2} Beds</span>
                    <span>•</span>
                    <span>Bathrooms: {bathroomsValue ?? 2} Baths</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
                <button
                  onClick={() => window.print()}
                  type="button"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  Print Inspection
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-decoration-none"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={15} />
                  Verify on Maps
                </a>
              </div>
            </div>

            {/* Description & Narrative */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-base font-bold text-slate-900">Listing Description &amp; Overview</h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {property?.description || 'No detailed description provided by the landlord for this property.'}
              </p>
            </div>

            {/* Location Intelligence */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-[#006194] uppercase font-bold tracking-wide">Location Intelligence</span>
                  <h4 className="text-base font-bold text-slate-900">{fullAddress}</h4>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#006194] text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <span>Open in Google Maps</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RIGHT COLUMN: ADMIN APPROVAL CONSOLE (4 COLS)        */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
            
            {/* Approval Decision Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#006194]" />
                  Listing Approval Decision
                </span>
                <span
                  style={{
                    color: approval.color,
                    backgroundColor: approval.bg,
                    borderColor: approval.border
                  }}
                  className="inline-flex items-center gap-1 text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border"
                >
                  {approval.label}
                </span>
              </div>

              {approvalStatus === 'rejected' && approvalNotes && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-900">
                    <AlertTriangle size={14} />
                    Rejection Feedback Sent to Landlord:
                  </div>
                  <p className="leading-relaxed">{approvalNotes}</p>
                </div>
              )}

              {reviewError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {reviewError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={reviewBusy || approvalStatus === 'approved'}
                  onClick={handleApprove}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                    approvalStatus === 'approved'
                      ? 'bg-emerald-400 cursor-default opacity-85'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                  }`}
                >
                  <Check size={16} />
                  <span>{approvalStatus === 'approved' ? 'Listing Currently Approved' : 'Approve & Publish Listing'}</span>
                </button>

                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={openRejectModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                >
                  <X size={15} />
                  <span>Reject Listing (Specify Reason)</span>
                </button>
              </div>

              {property.reviewed_at && (
                <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
                  Last reviewed on {new Date(property.reviewed_at).toLocaleDateString('en-ZA')}
                </div>
              )}
            </div>

            {/* Submitted Landlord Verification Documents */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Landlord Documents ({propertyDocuments.length})
                </span>
                <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                  Audit Ready
                </span>
              </div>

              {propertyDocuments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No verification documents submitted with this listing yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {propertyDocuments.map((doc, idx) => {
                    const isRequired = doc.documentType === 'ownership';
                    return (
                      <div
                        key={doc.id || idx}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isRequired ? 'bg-sky-100 text-[#006194]' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isRequired ? <FileCheck size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{doc.title || doc.fileName || 'Document'}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {docTypeLabel(doc.documentType)}
                            {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}
                          </p>
                        </div>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Document"
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Landlord Contact & Ownership Record */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Registered Landlord Record
              </span>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-sky-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm shrink-0">
                  {landlordName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{landlordName}</h4>
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Registered Property Owner
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {landlordPhone && (
                  <a
                    href={`tel:${landlordPhone.replace(/\s+/g, '')}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all font-medium cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Phone size={14} className="text-slate-500" />
                    <span>{landlordPhone}</span>
                  </a>
                )}
                {landlordEmail && (
                  <a
                    href={`mailto:${landlordEmail}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all font-medium truncate cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Mail size={14} className="text-slate-500 shrink-0" />
                    <span className="truncate">{landlordEmail}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Flag / Security Suspension */}
            <button
              type="button"
              onClick={() => {
                alert(`Listing ${title} flagged for security compliance audit.`);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
            >
              <ShieldAlert size={15} />
              <span>Flag Listing for Compliance Audit</span>
            </button>
          </div>
        </div>
      </main>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reject listing"
          onClick={() => {
            if (!reviewBusy) setShowRejectModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Reject Listing Application?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This listing will be hidden from tenants and agents. The landlord will be alerted with your notes.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label htmlFor="reject-reason" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Reason for Rejection (Shown to Landlord)
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                autoFocus
                placeholder="e.g. Missing proof of ownership deed, photos do not match property coordinates, municipal rates arrears..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              />
            </div>

            {reviewError && (
              <p className="text-xs text-red-600 font-medium">{reviewError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={reviewBusy}
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewBusy}
                onClick={confirmReject}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm cursor-pointer"
              >
                <X size={15} />
                <span>{reviewBusy ? 'Rejecting...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close fullscreen view"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[activeImage]}
              alt={title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <div className="absolute bottom-6 text-white text-xs font-semibold tracking-wider">
            {activeImage + 1} / {images.length} · {title}
          </div>
        </div>
      )}
    </div>
  );
}
