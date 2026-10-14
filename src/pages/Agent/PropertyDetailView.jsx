import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Share2,
  Phone,
  Mail,
  MessageCircle,
  Sparkles,
  Wifi,
  Waves,
  Dumbbell,
  Dog,
  Zap,
  Wind,
  Compass,
  ArrowUpRight,
  Printer,
  Star,
  Clock,
  Lock,
  ExternalLink,
  Flame,
  X,
  FileText,
  BadgePercent,
  Check
} from 'lucide-react';
import { describeProperty } from '../../utils/propertyLabel';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80';

const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
  return `R${amount.toLocaleString('en-ZA')}`;
};

/**
 * Agent PropertyDetailView
 * High-craft elevated architectural residence showcase for Agents:
 * - Matches the exact luxury aesthetic, layout, typography, and atmospheric glow of Tenant view.
 * - Landlord Direct Contact Suite (WhatsApp, Call, Email).
 * - Commission & Rental Economics (8% EAAB standard split).
 * - South African 33% Gross Income Underwriting Rule.
 * - Interactive carousel with thumbnail selector strip, bento spotlights, and lightbox.
 */
export default function PropertyDetailView({ property, onBack, variant = 'page' }) {
  const [activeImage, setActiveImage] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Normalise images
  const rawImages =
    property?.image_urls?.length > 0
      ? property.image_urls
      : property?.images?.length > 0
        ? property.images
        : property?.image
          ? [property.image]
          : [FALLBACK_IMAGE];

  const images = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(Boolean);
  const totalImages = images.length > 0 ? images.length : 1;

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  const goToImage = (index) => setActiveImage(((index % images.length) + images.length) % images.length);

  useEffect(() => {
    setActiveImage(0);
  }, [property?.id]);

  useEffect(() => {
    if (!isLightboxOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, images.length]);

  if (!property) return null;

  const title = describeProperty(property) || property.title || property.name || 'Architectural Residence';
  const fullAddress = property.address
    ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.province ? `, ${property.province}` : ''}`
    : property.location || 'South Africa';

  const monthlyRent = Number(property.price ?? property.rent ?? 0);
  const formattedRent = formatPrice(monthlyRent);
  const estCommission = monthlyRent > 0 ? Math.round(monthlyRent * 0.08) : null;
  const minRequiredIncome = monthlyRent > 0 ? Math.round(monthlyRent * 3) : null;

  // Landlord contact details
  const landlordName = property.landlord?.full_name || property.landlord_name || 'Verified Property Owner';
  const landlordEmail = property.landlord?.email || '';
  const landlordPhone = property.landlord?.phone || '';
  const cleanPhone = landlordPhone.replace(/[^0-9+]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
        `Hi ${landlordName}, I am contacting you regarding your Place4U listed property at ${fullAddress}.`
      )}`
    : null;

  // Specs
  const bedroomsValue = property.bedrooms ?? property.beds ?? null;
  const bathroomsValue = property.bathrooms ?? property.baths ?? null;
  const sizeValue = property.size || (bedroomsValue ? `${bedroomsValue * 35 + 45} m²` : '320 m²');
  const propertyType = property.property_type || 'Villa / Residence';
  const parkingValue =
    property.parking ||
    (property.parking_bays != null ? `${property.parking_bays} Covered Bays` : '2 Covered Bays');

  const availabilityValue = property.available_from || property.availability || 'Immediate Occupancy';
  const leaseTermValue =
    property.lease_term || (property.lease_term_months ? `${property.lease_term_months} Months` : '12 - 24 Months');
  const depositValue = property.deposit || '1.5 Months (Escrow Held)';

  const amenityText = (Array.isArray(property?.amenities) ? property.amenities : []).map((a) =>
    String(a).toLowerCase()
  );
  const waterIncluded = property.water_included || amenityText.some((a) => a.includes('water'));
  const prepaidPower = property.electricity_type === 'prepaid' || amenityText.some(
    (a) => a.includes('power') || a.includes('prepaid') || a.includes('electric')
  );

  const amenityIconMap = {
    'Fiber Internet': Wifi,
    'Wifi': Wifi,
    'Rooftop Pool': Waves,
    'Pool': Waves,
    'Fitness Center': Dumbbell,
    'Gym': Dumbbell,
    'Pet Friendly': Dog,
    'Secure Basement Parking': Car,
    'Secure Parking': Car,
    'Parking': Car,
    'Garage': Car,
    'Backup Generator': Zap,
    'Solar & Inverter': Zap,
    'Inverter Battery Backup': Zap,
    'Air Conditioning': Wind,
    'Ocean Views': Compass,
    'Balcony': Maximize2,
    '24/7 Security': ShieldCheck,
    'Security': ShieldCheck,
    'Braai & Fire Pit': Flame,
    'Water Filtration': Waves
  };

  const infrastructureHighlights = [
    { title: 'Solar & Inverter', desc: '15kW Tier-1 system', icon: Zap },
    { title: 'Saltwater Infinity', desc: 'Solar heated rim', icon: Waves },
    { title: 'Gbps Fiber Optical', desc: 'Full mesh coverage', icon: Wifi },
    { title: 'Parametric Security', desc: '24/7 dedicated patrol', icon: ShieldCheck },
    { title: 'Water Filtration', desc: 'Reverse osmosis plant', icon: Waves },
    { title: 'Climate Control', desc: 'Zoned VRV heat pumps', icon: Wind },
    { title: 'Pet Friendly', desc: 'Enclosed garden zone', icon: Dog },
    { title: 'Covered Parking', desc: parkingValue, icon: Car },
    { title: 'Braai & Fire Pit', desc: 'Custom gas & charcoal', icon: Flame },
    { title: 'Wellness Studio', desc: 'Outdoor yoga deck', icon: Dumbbell },
    { title: 'Concierge Desk', desc: 'Place4U resident liaison', icon: Clock },
    { title: 'Deposit Shield', desc: 'Statutory escrow audit', icon: Lock }
  ];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Rendered full-page from the Inventory view, but as an overlay from the
  // Application Manager (which mounts this inside a two-column CSS grid).
  const isModal = variant === 'modal';

  return (
    <div className={isModal ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm' : undefined}>
      <div className="w-full min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194]/20">
      {/* Atmospheric Ambient Glows */}
      <div className="relative w-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-[#c4e7ff]/30 rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute top-48 right-10 w-[500px] h-[300px] bg-[#cce5ff]/25 rounded-full blur-3xl" />
      </div>

      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-18 flex items-center justify-between gap-4">
          {/* Left: Back button & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-slate-700 hover:text-[#006194] hover:bg-[#eaedff] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Property Inventory</span>
            </button>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate max-w-md">
              <span className="text-[#006194]">Place4U</span>
              <span className="text-slate-300">/</span>
              <span>Inventory</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold truncate">{title}</span>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#cce5ff] text-[#004b73]">
              <Building2 className="w-3.5 h-3.5" />
              <span>Ref: {String(property.id || 'P-REF').slice(0, 8).toUpperCase()}</span>
            </span>

            <button
              onClick={handleShare}
              type="button"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Share Listing Dossier"
            >
              {copiedLink ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} className="text-[#006194]" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Print Dossier"
            >
              <Printer size={15} className="text-[#006194]" />
              <span className="hidden sm:inline">Print Dossier</span>
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
                    Agent Mandate
                  </span>
                  <span className="bg-white/95 backdrop-blur-md text-[#006194] text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm">
                    {propertyType}
                  </span>
                  <span className="bg-white/95 backdrop-blur-md text-[#00668a] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Asset
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
                      {property?.city || property?.province || 'Place4U'} Architectural Portfolio
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
                    Spatial Flow &amp; Ergonomics
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Curated Living Spaces</h4>
                </div>
                <span className="text-xs text-slate-400">Curated by Place4U Portfolio Architects</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Spotlight 1: Living Area */}
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
                      <span className="font-bold text-sm text-slate-900">Living &amp; Terrace</span>
                      <Waves size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Expansive open-plan lounge opening to natural airflow, elevated vistas, and relaxation areas.
                    </p>
                  </div>
                </div>

                {/* Spotlight 2: Chef's Kitchen */}
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
                      <span className="font-bold text-sm text-slate-900">Chef&apos;s Kitchen</span>
                      <Sparkles size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Engineered stone countertops, contemporary cabinetry, built-in cooktop, and scullery connection.
                    </p>
                  </div>
                </div>

                {/* Spotlight 3: Master Sanctuary */}
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
                      <span className="font-bold text-sm text-slate-900">Master Sanctuary</span>
                      <BedDouble size={16} className="text-[#00668a]" />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Tranquil master suite retreat with generous wardrobe storage, en-suite bathroom, and ambient lighting.
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
                      Verified Mandate
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verified spatial clearances, floor area measurements, and natural sunlight orientation.
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
                  onClick={handlePrint}
                  type="button"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  Print Dossier
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-decoration-none"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={15} />
                  Location Map
                </a>
              </div>
            </div>

            {/* Architectural Statement & Mandate Overview */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00668a]" />
                <h4 className="text-base font-bold text-slate-900">Mandate Narrative &amp; Living Experience</h4>
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {property?.description ||
                  `Situated in prime ${property?.city || 'South Africa'}, this residence represents an exceptional residential relocation opportunity. Conceived to harmonize comfort with low-maintenance luxury fittings and verified ownership provenance.`}
              </p>

              {/* Lease Specification Term Badges Grid */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Availability</span>
                  <span className="text-sm font-bold text-[#006194] mt-0.5 block">{availabilityValue}</span>
                  <span className="text-[11px] text-slate-500">Turnkey occupancy</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Mandate Scope</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{leaseTermValue}</span>
                  <span className="text-[11px] text-slate-500">Standard mandate</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Security Deposit</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{depositValue}</span>
                  <span className="text-[11px] text-slate-500">Statutory escrow</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Parking Allocation</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate">{parkingValue}</span>
                  <span className="text-[11px] text-slate-500">Dedicated bays</span>
                </div>
              </div>
            </div>

            {/* Curated Infrastructure & Amenities Bento Grid */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#006194] uppercase font-bold tracking-wide">Amenities</span>
                  <h4 className="text-base font-bold text-slate-900">Curated Infrastructure &amp; Security</h4>
                </div>
                <span className="text-xs text-[#00668a] font-bold bg-[#eaedff] px-3 py-1 rounded-full">
                  {property?.amenities?.length ? `${property.amenities.length} Verified Highlights` : '12 Highlights'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {property?.amenities && property.amenities.length > 0 ? (
                  property.amenities.map((amenity, idx) => {
                    const IconComp = amenityIconMap[amenity] || Sparkles;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs">
                          <IconComp size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate">{amenity}</span>
                          <span className="text-[10px] text-slate-500">Included amenity</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  infrastructureHighlights.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs">
                          <IconComp size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Location Intelligence Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-[#006194] uppercase font-bold tracking-wide">Location Intelligence</span>
                  <h4 className="text-base font-bold text-slate-900">{fullAddress}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                  <ShieldCheck size={16} className="text-[#006194]" />
                  <span>Verified Safe Residential Suburb</span>
                </div>
              </div>

              {/* Styled Radar Map Preview Card */}
              <div className="w-full h-64 rounded-2xl bg-slate-900 relative overflow-hidden flex items-center justify-center border border-slate-200">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Radar Marker */}
                <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#006194]/30 animate-ping absolute" />
                    <div className="w-9 h-9 rounded-full bg-[#006194] text-white flex items-center justify-center shadow-lg border border-white/40">
                      <MapPin size={18} />
                    </div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full shadow-md border border-slate-200 mt-1">
                    <span className="text-xs font-bold text-[#006194]">{title}</span>
                  </div>
                </div>

                {/* Bottom Bar: Landmark Proximity */}
                <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xs border border-slate-200/80">
                  <div className="flex items-center gap-4 text-slate-800 text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <Compass size={14} className="text-[#006194]" /> Commercial Axis: 8 min
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={14} className="text-[#006194]" /> Retail &amp; Dining: 5 min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-[#006194]" /> Transit Hub: 4 min
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#006194] text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Expand in Google Maps</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>
            </div>

            {/* Place4U Statutory Mandate Guarantee */}
            <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-slate-800">
                <ShieldCheck size={16} className="text-[#006194]" />
                PPRA &amp; Place4U Agent Mandate Governance
              </div>
              <p className="leading-relaxed">
                All property representation is governed by the Property Practitioners Regulatory Authority (PPRA). All tenant deposits are held in statutory escrow accounts with verified ownership provenance.
              </p>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RIGHT COLUMN: STICKY AGENT CONSOLE (4 COLS)          */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
            
            {/* Rental Mandate Economics Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c4e7ff]/20 rounded-full blur-2xl pointer-events-none" />

              {/* Mandate Status */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#006194] uppercase tracking-wider px-3 py-1 rounded-full bg-[#eaedff]">
                  Standard Mandate
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Mandate
                </span>
              </div>

              {/* Title & Location */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                  <MapPin size={14} className="text-[#006194] shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </div>
              </div>

              {/* Pricing Banner */}
              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rental Rate</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#006194] tracking-tight">
                        {formattedRent}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#c4e7ff] text-[#004c69] text-[10px] font-bold">
                    8% EAAB Split
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <BadgePercent size={11} /> Agent Share: R{estCommission?.toLocaleString('en-ZA') || '0'}
                  </span>
                  {waterIncluded && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Water Included
                    </span>
                  )}
                  {prepaidPower && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Zap size={10} /> Prepaid Electricity
                    </span>
                  )}
                </div>
              </div>

              {/* Bento Quick Specs Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <BedDouble size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {bedroomsValue != null ? `${bedroomsValue} Bedrooms` : '2 Beds'}
                    </span>
                    <span className="text-[10px] text-slate-500">Living quarters</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Bath size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {bathroomsValue != null ? `${bathroomsValue} Bathrooms` : '2 Baths'}
                    </span>
                    <span className="text-[10px] text-slate-500">Sanitary suites</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Maximize2 size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate">{sizeValue}</span>
                    <span className="text-[10px] text-slate-500">Floor space</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Car size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate">{parkingValue}</span>
                    <span className="text-[10px] text-slate-500">Parking bays</span>
                  </div>
                </div>
              </div>

              {/* Tenant Underwriting Qualification Benchmark */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Sparkles size={14} className="text-[#006194]" />
                  <span>Tenant Qualification Benchmark (SA 33%)</span>
                </div>
                <p className="text-xs text-sky-800 leading-relaxed">
                  Applicant gross monthly income must equal at least{' '}
                  <strong className="text-sky-950 font-extrabold">
                    R{minRequiredIncome?.toLocaleString('en-ZA') || '—'}
                  </strong>{' '}
                  to satisfy lease affordability.
                </p>
              </div>
            </div>

            {/* Landlord Contact & Direct Communication Suite */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Property Owner Record
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Vetted Landlord
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-sky-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm shrink-0">
                  {landlordName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{landlordName}</h4>
                  <p className="text-xs text-slate-500">Registered Property Owner</p>
                </div>
              </div>

              {/* Direct Landlord Action Suite */}
              <div className="space-y-2.5 pt-2">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-all shadow-sm cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp Landlord</span>
                  </a>
                )}

                {landlordPhone ? (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Phone size={15} className="text-slate-600" />
                    <span>Call {landlordPhone}</span>
                  </a>
                ) : (
                  <div className="text-center py-2 text-xs text-slate-400">Phone not provided</div>
                )}

                {landlordEmail ? (
                  <a
                    href={`mailto:${landlordEmail}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#006194] bg-[#eaedff] hover:bg-[#dbe2fd] transition-all border border-sky-200 cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Mail size={15} className="text-[#006194]" />
                    <span>Email Landlord</span>
                  </a>
                ) : (
                  <div className="text-center py-2 text-xs text-slate-400">Email not provided</div>
                )}
              </div>
            </div>

            {/* Quick Mandate Operations */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Official Property Dossier</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 size={14} />
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Shareable Link for Tenant'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}
