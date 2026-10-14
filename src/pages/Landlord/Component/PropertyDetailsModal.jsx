import React, { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Maximize2,
  BedDouble,
  Bath,
  Users,
  CheckCircle2,
  FileText,
  Edit3,
  ShieldCheck,
  Upload,
  Send,
  Clock,
  Car,
  Sparkles,
  Share2,
  Printer,
  X,
  Compass,
  ArrowUpRight,
  AlertTriangle,
  BadgePercent,
  Check
} from "lucide-react";
import { getApprovalMeta, countDocs, hasRequiredDocuments } from "../Styles/approval";
import { describeProperty } from "../../../utils/propertyLabel";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80";

const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Price on request";
  return `R${amount.toLocaleString("en-ZA")}`;
};

/**
 * PropertyDetailsModal (Landlord)
 * Elevated architectural residence showcase for Landlords:
 * - Full-takeover elevated modal overlay with fluid navigation.
 * - Curated living spaces bento vignettes, spatial specs, and registered amenities.
 * - Current occupancy and active lease tracking.
 * - Direct listing approval console (document readiness check, submit for approval, notes).
 * - Direct listing editing and document upload triggers.
 */
export const PropertyDetailsModal = ({
  isOpen,
  onClose,
  property,
  onEdit,
  onViewDocuments,
  onUploadDocuments,
  onSubmitForApproval
}) => {
  const [activeImage, setActiveImage] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveImage(0);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          if (isLightboxOpen) setIsLightboxOpen(false);
          else onClose?.();
        }
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "ArrowLeft") prevImage();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow || "unset";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, isLightboxOpen, property?.id]);

  if (!isOpen || !property) return null;

  const approval = getApprovalMeta(property?.approval_status);
  const docs = Array.isArray(property.documents) ? property.documents : [];
  const docCount = countDocs(docs);
  const canSubmit = ["draft", "rejected"].includes(property?.approval_status || "approved");
  const docsReady = hasRequiredDocuments(docs);

  const rawImages =
    property.image_urls && property.image_urls.length > 0
      ? property.image_urls
      : property.images && property.images.length > 0
        ? property.images
        : property.image
          ? [property.image]
          : [FALLBACK_IMAGE];

  const images = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(Boolean);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  const goToImage = (index) => setActiveImage(((index % images.length) + images.length) % images.length);

  const title = describeProperty(property) || property.name || property.title || "Architectural Residence";
  const fullAddress = property.address
    ? `${property.address}${property.city ? `, ${property.city}` : ""}${property.province ? `, ${property.province}` : ""}`
    : property.location || "South Africa";

  const monthlyRent = Number(property.rent ? String(property.rent).replace(/[^0-9]/g, "") : property.price || 0);
  const formattedRent = formatPrice(monthlyRent);

  const bedroomsValue = property.bedrooms ?? property.beds ?? null;
  const bathroomsValue = property.bathrooms ?? property.baths ?? null;
  const sizeValue = property.size && property.size !== "—" ? property.size : (bedroomsValue ? `${bedroomsValue * 35 + 45} m²` : "320 m²");
  const propertyType = property.property_type || "Luxury Residence";
  const parkingValue =
    property.parking ||
    (property.parking_bays != null ? `${property.parking_bays} Covered Bays` : "2 Covered Bays");

  const availabilityValue = property.available_from || property.availability || "Immediate";
  const leaseTermValue = property.lease_term || "12 - 24 Months";
  const depositValue = property.deposit || "1.5 Months (Escrow Held)";
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const tenants = Array.isArray(property.tenants) ? property.tenants : [];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex justify-center p-2 sm:p-4 lg:p-6"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl bg-[#faf8ff] rounded-3xl shadow-2xl overflow-hidden my-auto focus:outline-none flex flex-col max-h-[92vh] border border-slate-200"
      >
        {/* Modal Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Properties</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 truncate">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{title}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span
              style={{
                color: approval.color,
                backgroundColor: approval.soft,
                borderColor: approval.border
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {approval.label}
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 font-['Manrope',sans-serif] text-[#131b2e]">
          {/* Main Title & Rate Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#cce5ff] text-[#004b73]">
                  {propertyType}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Landlord Asset
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Available: {availabilityValue}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e]">
                {title}
              </h1>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-[#006194] flex-shrink-0" />
                <span>{fullAddress}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#006194] font-medium hover:underline ml-2"
                >
                  Verify on Maps <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Price Card */}
            <div className="lg:text-right bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Monthly Rental Income</p>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#006194] tracking-tight">
                {formattedRent}
                <span className="text-sm font-normal text-slate-500"> / month</span>
              </div>
              <div className="flex items-center lg:justify-end gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                    property.occupied
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-amber-700 bg-amber-50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {property.occupied ? "Occupied (Active Lease)" : "Vacant / Market Ready"}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Showcase Carousel */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md group">
            <div className="relative aspect-[16/9] sm:aspect-[21/9] max-h-[500px] w-full overflow-hidden">
              <img
                src={images[activeImage]}
                alt={title}
                className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-black/60 backdrop-blur-md text-white border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Property Portfolio Showcase
                </span>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-slate-900 hover:bg-white border border-white/30 shadow transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen View</span>
                </button>
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label="Previous photo"
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all focus:outline-none"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="Next photo"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all focus:outline-none"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold tracking-wider border border-white/10">
                {activeImage + 1} / {images.length} Photos
              </div>
            </div>

            {images.length > 1 && (
              <div className="bg-slate-950/90 p-3 flex gap-2.5 overflow-x-auto border-t border-white/10 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => goToImage(idx)}
                    className={`relative flex-shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === idx ? "border-sky-400 ring-2 ring-sky-400/30" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 8-col / 4-col Asymmetrical Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Content (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Curated Living Spaces Bento */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#006194]" />
                    Curated Living Spaces
                  </h2>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Photographic Assets</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100">
                      <img src={images[1] || images[0]} alt="Living area" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Living & Entertaining Lounge</h3>
                      <p className="text-xs text-slate-600 mt-1">Generous proportions, natural light, and ambient finishes.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100">
                      <img src={images[2] || images[0]} alt="Primary suite" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Executive Primary Suite</h3>
                      <p className="text-xs text-slate-600 mt-1">Ensuite master retreat with custom wardrobe storage.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100">
                      <img src={images[3] || images[0]} alt="Kitchen" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Gourmet Culinary Kitchen</h3>
                      <p className="text-xs text-slate-600 mt-1">Premium countertops, stove extraction, and scullery connection.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100">
                      <img src={images[4] || images[0]} alt="Outdoor patio" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Patio & Exterior Grounds</h3>
                      <p className="text-xs text-slate-600 mt-1">Elevated outdoor area with secure boundary fencing.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Spatial Specifications */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#006194]" />
                  Architectural Specifications
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-sky-50 text-[#006194] flex items-center justify-center mb-2">
                      <BedDouble className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Bedrooms</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {bedroomsValue != null ? `${bedroomsValue} Beds` : "2 Beds"}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                      <Bath className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Bathrooms</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {bathroomsValue != null ? `${bathroomsValue} Baths` : "2 Baths"}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Floor Space</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{sizeValue}</div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Parking Bays</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{parkingValue}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase font-semibold block">Available</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{availabilityValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-semibold block">Lease Term</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{leaseTermValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-semibold block">Deposit</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{depositValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-semibold block">Pet Friendly</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {property.pet_friendly ? "Yes, Approved" : "Subject to Rules"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Current Occupancy & Assigned Tenants */}
              <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#006194]" />
                    <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e]">
                      Current Occupancy & Active Tenants
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {tenants.length} Active Records
                  </span>
                </div>

                {tenants.length > 0 ? (
                  <div className="space-y-2.5">
                    {tenants.map((t, idx) => {
                      const name = typeof t === "object" ? t.name || t.full_name : t;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              {typeof name === "string" ? name.charAt(0).toUpperCase() : "T"}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{name}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active Lease
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    No active tenant records assigned to this property listing.
                  </div>
                )}
              </section>

              {/* Description & Overview */}
              <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-3">
                <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#006194]" />
                  Property Narrative & Details
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {property.description || "No description provided for this listing."}
                </p>
              </section>

              {/* Amenities Grid */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#006194]" />
                  Registered Features & Amenities
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(amenities.length > 0
                    ? amenities
                    : [
                        "Fiber Internet Ready",
                        "24/7 Security Access",
                        "Covered Parking Bays",
                        "Backup Inverter / Power",
                        "Communal Gardens & Pool"
                      ]
                  ).map((item, idx) => (
                    <div
                      key={`${item}-${idx}`}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-2.5 shadow-sm"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#006194] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Location Card */}
              <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#131b2e] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#006194]" />
                      Location Intelligence
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{fullAddress}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#006194] text-white hover:bg-[#004d77] transition-all shadow-sm"
                  >
                    <span>Open in Google Maps</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </section>
            </div>

            {/* Right Sticky Sidebar: Landlord Management Console (4 cols) */}
            <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
              {/* Approval & Verification Status Console */}
              <div
                style={{
                  backgroundColor: approval.soft,
                  borderColor: approval.border
                }}
                className="rounded-3xl p-6 border shadow-md space-y-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#006194]" />
                    Approval & Compliance
                  </span>
                  <span
                    style={{
                      color: approval.color,
                      backgroundColor: "#fff",
                      borderColor: approval.border
                    }}
                    className="inline-flex items-center gap-1 text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm"
                  >
                    {approval.label}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {property.approval_status === "rejected" && property.approval_notes
                    ? property.approval_notes
                    : approval.help}
                </p>

                {/* Verification Documents Count */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#006194]" />
                    {docCount} Document{docCount === 1 ? "" : "s"} Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      if (onUploadDocuments) onUploadDocuments(property);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#006194] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{docCount > 0 ? "Manage" : "Upload"}</span>
                  </button>
                </div>

                {/* Submit for Approval Action */}
                {canSubmit && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={!docsReady}
                      onClick={() => {
                        if (!docsReady) return;
                        onClose?.();
                        if (onSubmitForApproval) onSubmitForApproval(property);
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                        docsReady
                          ? "bg-[#006194] hover:bg-[#004d77] cursor-pointer"
                          : "bg-slate-400 cursor-not-allowed opacity-75"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Listing for Approval</span>
                    </button>
                    {!docsReady && (
                      <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Please attach proof of ownership before submitting.
                      </p>
                    )}
                  </div>
                )}

                {property.approval_status === "pending_approval" && (
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Submitted — under review by Place4U verification team.</span>
                  </div>
                )}
              </div>

              {/* Landlord Action Suite */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Listing Management
                </span>

                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    if (onEdit) onEdit(property);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-[#006194] hover:bg-[#004d77] transition-all shadow-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Listing Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    if (onViewDocuments) onViewDocuments(property);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
                >
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>View Uploaded Documents</span>
                </button>
              </div>

              {/* Statutory Guarantee Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 text-xs text-slate-600 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-[#006194]" />
                  Place4U Guaranteed Lease Protection
                </div>
                <p className="leading-relaxed">
                  All applicant tenants undergo strict FICA vetting and 33% gross income qualification prior to lease signing.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
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
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
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
};

export default PropertyDetailsModal;
