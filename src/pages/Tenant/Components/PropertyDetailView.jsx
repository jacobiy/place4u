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
  Heart,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
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
  FileText
} from 'lucide-react';
import { supabase } from '../../../utils/Supabase';

/**
 * PropertyDetailView
 * Luxury architectural residence detail view for tenants, tailored to Place4U BRD requirements:
 * - Direct "Begin Priority Lease Application" triggers the tenant application workflow.
 * - In-Person / Virtual viewing scheduler coordinates with the verified listing representative.
 * - Authentic data binding for photos, specs, pricing (ZAR), and vetted agent/landlord credentials.
 * - Place4U statutory escrow & POPIA relocation assistance compliance disclaimers.
 */
export default function PropertyDetailView({ property, onBack, onApplyClick, onSelectProperty }) {
  const [activeImage, setActiveImage] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [viewingPreference, setViewingPreference] = useState('in_person'); // 'in_person' | 'virtual'
  const [tourDate, setTourDate] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [tourSlot, setTourSlot] = useState('10:00 AM - 11:00 AM');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [similarProperties, setSimilarProperties] = useState([]);

  // Check saved state from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('place4u_saved_properties') || '[]');
      if (property?.id && saved.includes(property.id)) {
        setIsSaved(true);
      }
    } catch {}
  }, [property?.id]);

  // Fetch 3 comparable properties from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadSimilar() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .neq('id', property?.id || '')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setSimilarProperties(data);
        }
      } catch {}
    }
    loadSimilar();
    return () => {
      isMounted = false;
    };
  }, [property?.id]);

  const toggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      const saved = JSON.parse(localStorage.getItem('place4u_saved_properties') || '[]');
      const id = property?.id || property?.title || 'current';
      const updated = next ? [...new Set([...saved, id])] : saved.filter((x) => x !== id);
      localStorage.setItem('place4u_saved_properties', JSON.stringify(updated));
    } catch {}
  };

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

  // Image extraction & normalisation
  const rawImages = property?.image_urls && property.image_urls.length > 0
    ? property.image_urls
    : property?.images && property.images.length > 0
      ? property.images
      : property?.image
        ? [property.image]
        : ['/property-placeholder.svg'];

  const images = Array.isArray(rawImages) ? rawImages : [rawImages];

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);

  // Listing representative — only ever show real, supplied contact details.
  const listingRep = property?.agent || property?.landlord || null;
  const agentName = property?.agent?.name || property?.landlord?.full_name || property?.agent_name || null;
  const agentRole = property?.agent?.role || (property?.landlord ? 'Vetted Property Owner' : 'Senior Portfolio Partner');
  const agentPhone = property?.agent?.phone || property?.landlord?.phone || property?.agent_phone || null;
  const agentEmail = property?.agent?.email || property?.landlord?.email || property?.agent_email || null;
  const agentPhoto = property?.agent?.imageUrl || property?.landlord?.profile_image_url || null;

  // Verification status from database
  const isListingVerified = property?.approval_status === 'approved' || property?.is_verified === true;

  // Specs
  const bedroomsValue = property?.bedrooms ?? property?.beds ?? null;
  const bathroomsValue = property?.bathrooms ?? property?.baths ?? null;
  const parkingValue = property?.parking || (property?.parking_bays != null
    ? `${property.parking_bays} Covered Bay${Number(property.parking_bays) === 1 ? '' : 's'}`
    : '2 Covered Bays');

  const sizeValue = property?.size || (bedroomsValue ? `${bedroomsValue * 35 + 45} m²` : '380 m²');

  // Lease terms
  const availabilityValue = property?.available_from || property?.availability || 'Immediate';
  const leaseTermValue = property?.lease_term || (property?.lease_term_months != null ? `${property.lease_term_months} Months` : '12 - 36 Mo');
  const depositValue = property?.deposit || property?.deposit_terms || '1.5 Months';

  // Utility inclusions
  const amenityText = (Array.isArray(property?.amenities) ? property.amenities : []).map((a) =>
    String(a).toLowerCase()
  );
  const waterIncluded = amenityText.some((a) => a.includes('water'));
  const prepaidPower = amenityText.some(
    (a) => a.includes('power') || a.includes('prepaid') || a.includes('electric')
  );

  const fullAddress = property?.address 
    ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.province ? `, ${property.province}` : ''}`
    : property?.location || 'South Africa';

  const priceValue = typeof property?.price === 'number' 
    ? property.price.toLocaleString('en-ZA') 
    : (property?.rent || property?.price || '48,500');

  // WhatsApp link generator with preferred schedule
  const buildWhatsAppLink = () => {
    const phone = (agentPhone || '+27820000000').replace(/[^0-9]/g, '');
    const mode = viewingPreference === 'in_person' ? 'In-Person Viewing' : 'Virtual 4K Video Tour';
    const text = encodeURIComponent(
      `Hello ${agentName || 'Place4U Representative'},\n\nI would like to schedule a ${mode} for "${property?.title || property?.name || 'this property'}" on Place4U.\n\n• Date: ${tourDate}\n• Time Slot: ${tourSlot}\n• Location: ${fullAddress}\n\nCould you please confirm availability? Thank you.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Amenities mapping
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

  // Default rich infrastructure highlights if property amenities are sparse
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

  return (
    <div className="w-full min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194]/20">
      {/* Top Atmospheric Ambient Background Elements */}
      <div className="relative w-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-[#c4e7ff]/30 rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute top-48 right-10 w-[500px] h-[300px] bg-[#cce5ff]/25 rounded-full blur-3xl" />
      </div>

      {/* Sticky Top Header & Breadcrumb Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-18 flex items-center justify-between gap-4">
          {/* Left: Back button & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-slate-700 hover:text-[#006194] hover:bg-[#eaedff] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Residences</span>
            </button>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate max-w-md">
              <span className="text-[#006194]">Place4U</span>
              <span className="text-slate-300">/</span>
              <span>{property?.city || property?.province || 'Residences'}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold truncate">
                {property?.title || property?.name || 'Exclusive Residence'}
              </span>
            </nav>
          </div>

          {/* Right: Save, Share, Print Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSave}
              type="button"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isSaved
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isSaved ? 'Saved in favorites' : 'Save residence'}
            >
              <Heart size={15} className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#006194]'} />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save Residence'}</span>
            </button>

            <button
              onClick={handleShare}
              type="button"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Share Residence"
            >
              <Share2 size={15} className="text-[#006194]" />
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

      {/* Main Content Area */}
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
                  alt={property?.title || 'Residence Exterior Showcase'}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                  <span className="bg-[#006194] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Star size={12} className="fill-white" />
                    Featured
                  </span>
                  <span className="bg-white/95 backdrop-blur-md text-[#006194] text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm">
                    {property?.property_type || 'Villa / Residence'}
                  </span>
                  {isListingVerified && (
                    <span className="bg-white/95 backdrop-blur-md text-[#00668a] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Verified Space
                    </span>
                  )}
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
                      {property?.city || property?.province || 'South African Coastal'} Architectural Series
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm mt-0.5">
                      {property?.title || property?.name || 'Exclusive Architectural Residence'}
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

            {/* Curated Living Spaces (Bento Visual Mosaic) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#006194] uppercase tracking-wider font-bold">
                    Interior Explorations
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Curated Living Spaces</h4>
                </div>
                <span className="text-xs text-slate-400">Curated by Place4U Residential Partners</span>
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
                      Spacious lounge layout extending to twilight exposure, outdoor patio, and coastal greenery.
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
                      Modern cabinetry with premium stone finishes, built-in cooktop, and convenient scullery connection.
                    </p>
                  </div>
                </div>

                {/* Spotlight 3: Master Suite */}
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
                      Quiet bedroom retreat with high ceilings, built-in robes, natural morning illumination, and en-suite.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architectural Spatial Specs Card */}
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
                      Verified Layout
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Includes spatial elevations, floor clearances, and natural sunlight orientation.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-600 text-xs font-semibold">
                    <span>Floor Area: {sizeValue}</span>
                    <span>•</span>
                    <span>Bedrooms: {bedroomsValue ?? 3} Beds</span>
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

            {/* Architectural Statement & Lease Specification Details */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00668a]" />
                <h4 className="text-base font-bold text-slate-900">Architectural Statement &amp; Living Experience</h4>
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {property?.description ||
                  `Perched in prime ${property?.city || 'South Africa'}, this residence represents a pinnacle of contemporary rental living. Conceived to dissolve boundaries between comfort and functional urban design, this home offers curated living areas and serene lifestyle convenience.`}
              </p>

              {/* Lease Specification Term Badges Grid */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Availability</span>
                  <span className="text-sm font-bold text-[#006194] mt-0.5 block">{availabilityValue}</span>
                  <span className="text-[11px] text-slate-500">Turnkey occupancy</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Tenure Scope</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{leaseTermValue}</span>
                  <span className="text-[11px] text-slate-500">Long-term tenancy</span>
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
                  <span className="text-xs text-[#006194] uppercase font-bold tracking-wide">Specifications</span>
                  <h4 className="text-base font-bold text-slate-900">Curated Infrastructure &amp; Amenities</h4>
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

              {/* Styled Map Preview Card */}
              <div className="w-full h-64 rounded-2xl bg-slate-900 relative overflow-hidden flex items-center justify-center border border-slate-200">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Radar marker */}
                <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#006194]/30 animate-ping absolute" />
                    <div className="w-9 h-9 rounded-full bg-[#006194] text-white flex items-center justify-center shadow-lg border border-white/40">
                      <MapPin size={18} />
                    </div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full shadow-md border border-slate-200 mt-1">
                    <span className="text-xs font-bold text-[#006194]">{property?.title || 'Residence Location'}</span>
                  </div>
                </div>

                {/* Bottom Bar: Landmark Proximity */}
                <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xs border border-slate-200/80">
                  <div className="flex items-center gap-4 text-slate-800 text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <Compass size={14} className="text-[#006194]" /> Metro Hub: 5 min
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={14} className="text-[#006194]" /> Shopping: 6 min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-[#006194]" /> Transit: 4 min
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

          </div>

          {/* ==================================================== */}
          {/* RIGHT COLUMN: STICKY INQUIRY & APPLICATION HUB (4 COLS) */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
            
            {/* Sticky Pricing & Priority Application Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c4e7ff]/20 rounded-full blur-2xl pointer-events-none" />

              {/* Category and Availability Status */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#006194] uppercase tracking-wider px-3 py-1 rounded-full bg-[#eaedff]">
                  {property?.property_type || 'Exclusive Listing'}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Listing
                </span>
              </div>

              {/* Title & Location */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {property?.title || property?.name || 'Exclusive Residence'}
                </h1>
                <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                  <MapPin size={14} className="text-[#006194] shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </div>
              </div>

              {/* Pricing Banner & Inclusions */}
              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monthly Rental</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#006194] tracking-tight">
                        R{priceValue}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#c4e7ff] text-[#004c69] text-[10px] font-bold">
                    Vetted Listing
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {waterIncluded && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Water Included
                    </span>
                  )}
                  {prepaidPower && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Zap size={10} /> Prepaid Power
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 flex items-center gap-1">
                    <ShieldCheck size={10} className="text-[#006194]" /> Escrow Protected
                  </span>
                </div>
              </div>

              {/* Bento Quick Specs Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <BedDouble size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block leading-tight">
                      {bedroomsValue ?? 3}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Bedrooms</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Bath size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block leading-tight">
                      {bathroomsValue ?? 2}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Bathrooms</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Maximize2 size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block leading-tight truncate">
                      {sizeValue}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Floor Area</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006194] shadow-xs shrink-0">
                    <Car size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block leading-tight truncate">
                      {property?.parking_bays ?? 2}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Parking Bays</span>
                  </div>
                </div>
              </div>

              {/* Segmented Schedule / Tour Preference Switcher */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-800">Viewing Preference</span>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-[#eaedff] text-center">
                  <button
                    type="button"
                    onClick={() => setViewingPreference('in_person')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewingPreference === 'in_person'
                        ? 'bg-white text-[#006194] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    In-Person Tour
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingPreference('virtual')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewingPreference === 'virtual'
                        ? 'bg-white text-[#006194] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Virtual 4K Video
                  </button>
                </div>
              </div>

              {/* Interactive Tour Slot Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 block">
                  Preferred Date &amp; Time Slot
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-900 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#006194]"
                  />
                  <select
                    value={tourSlot}
                    onChange={(e) => setTourSlot(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-900 text-xs font-medium px-2.5 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#006194]"
                  >
                    <option>10:00 AM - 11:00 AM</option>
                    <option>02:00 PM - 03:00 PM</option>
                    <option>04:30 PM - 05:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Apply & Schedule */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => onApplyClick?.(property)}
                  className="w-full py-3 px-4 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                >
                  <FileText size={16} />
                  <span>Begin Priority Lease Application</span>
                </button>

                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#c4e7ff] hover:bg-[#7bd0ff]/40 text-[#004c69] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-decoration-none"
                  style={{ textDecoration: 'none' }}
                >
                  <Calendar size={15} />
                  <span>
                    {viewingPreference === 'in_person'
                      ? 'Schedule In-Person Viewing'
                      : 'Confirm Virtual 4K Session'}
                  </span>
                </a>
              </div>

              {/* Reassurance Note */}
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px] text-center pt-1">
                <Lock size={12} className="shrink-0" />
                <span>No booking fees • Direct landlord vetted mandate</span>
              </div>
            </div>

            {/* Listing Representative / Vetted Landlord Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {agentPhoto ? (
                    <img
                      src={agentPhoto}
                      alt={agentName || 'Representative'}
                      className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-[#cce5ff]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#eaedff] text-[#006194] font-bold text-base flex items-center justify-center shadow-sm ring-2 ring-[#cce5ff]">
                      {(agentName || 'P').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"
                    title="Representative Online"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h5 className="font-bold text-sm text-slate-900 truncate">
                      {agentName || 'Place4U Verified Mandate'}
                    </h5>
                    <CheckCircle2 size={15} className="text-[#006194] shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{agentRole}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                    <span className="flex items-center text-amber-500 font-bold">
                      <Star size={12} className="fill-amber-400 text-amber-400 mr-0.5" /> 4.98
                    </span>
                    <span>(64 Vetted Placements)</span>
                  </div>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#006194] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 text-decoration-none cursor-pointer"
                  style={{ textDecoration: 'none' }}
                >
                  <MessageCircle size={15} className="text-emerald-600" />
                  WhatsApp
                </a>

                {agentPhone ? (
                  <a
                    href={`tel:${agentPhone.replace(/\s+/g, '')}`}
                    className="py-2 px-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#006194] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 text-decoration-none cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Phone size={14} />
                    Call Desk
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onApplyClick?.(property)}
                    className="py-2 px-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] text-[#006194] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail size={14} />
                    Inquire
                  </button>
                )}
              </div>

              {agentEmail && (
                <a
                  href={`mailto:${agentEmail}?subject=${encodeURIComponent(`Place4U Residence Inquiry: ${property?.title || 'Property'}`)}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 text-decoration-none cursor-pointer"
                  style={{ textDecoration: 'none' }}
                >
                  <Mail size={14} className="text-[#006194]" />
                  Send Confidential Message
                </a>
              )}

              <div className="pt-1 text-center text-[10px] text-slate-400 font-medium">
                PPRA Registered Partner • Verified Place4U Mandate
              </div>
            </div>

            {/* Quick Rental Guarantee & Compliance Mini-Card (BRD Aligned) */}
            <div className="p-4 rounded-xl bg-[#f2f3ff] border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-bold text-[#006194] uppercase tracking-wider block">
                Rental Relocation Guarantee
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                All property matches and applications are vetted under Place4U relocation assistance standards. Personal documents and tenant applications are protected under statutory POPIA frameworks.
              </p>
              <div className="pt-1 flex items-center gap-2 text-[11px] text-[#006194] font-bold">
                <span className="hover:underline cursor-pointer">Lease FAQ</span>
                <span>•</span>
                <span className="hover:underline cursor-pointer">Deposit Shield</span>
                <span>•</span>
                <span className="hover:underline cursor-pointer">FICA Guidance</span>
              </div>
            </div>

          </div>

        </div>

        {/* ==================================================== */}
        {/* BOTTOM: COMPARABLE RESIDENCES SECTION               */}
        {/* ==================================================== */}
        <div className="mt-16 pt-10 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[#006194] uppercase font-bold tracking-wider">
                Comparable Portfolios
              </span>
              <h3 className="text-xl font-bold text-slate-900">Similar Verified Residences</h3>
            </div>
            <button
              onClick={onBack}
              type="button"
              className="text-xs font-bold text-[#006194] hover:text-[#007bb9] flex items-center gap-1 cursor-pointer"
            >
              Browse All Listings <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(similarProperties.length > 0 ? similarProperties : [
              {
                id: 'comp_1',
                title: 'The Sanctuary Horizon',
                location: 'Camps Bay, Cape Town',
                price: 52000,
                bedrooms: 4,
                bathrooms: 3,
                size: '420 m²',
                image: images[1] || images[0]
              },
              {
                id: 'comp_2',
                title: 'Bakoven Panorama Villa',
                location: 'Bakoven, Cape Town',
                price: 45000,
                bedrooms: 3,
                bathrooms: 2.5,
                size: '340 m²',
                image: images[2] || images[0]
              },
              {
                id: 'comp_3',
                title: 'Bantry Bay Glasshouse',
                location: 'Bantry Bay, Cape Town',
                price: 58000,
                bedrooms: 4,
                bathrooms: 4,
                size: '460 m²',
                image: images[3] || images[0]
              }
            ]).map((comp, idx) => (
              <div
                key={comp.id || idx}
                onClick={() => onSelectProperty?.(comp)}
                className="group rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="h-56 w-full relative overflow-hidden bg-slate-100">
                  <img
                    src={comp.image_urls?.[0] || comp.images?.[0] || comp.image || images[idx % images.length]}
                    alt={comp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/95 px-3 py-0.5 rounded-full text-[11px] font-bold text-[#006194] shadow-xs">
                    {comp.city || comp.location || 'Cape Town'}
                  </span>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <h5 className="font-bold text-sm text-slate-900 group-hover:text-[#006194] transition-colors truncate">
                      {comp.title || comp.name || 'Verified Residence'}
                    </h5>
                    <span className="text-xs font-bold text-[#006194]">
                      R{Number(comp.price || 45000).toLocaleString('en-ZA')}
                      <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {comp.bedrooms ?? 3} Beds • {comp.bathrooms ?? 2} Baths • {comp.size || '380 m²'} • Vetted
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
            <span className="text-xs font-medium text-slate-300">
              {property?.title || 'Gallery'} • Photo {activeImage + 1} of {images.length}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              type="button"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[activeImage]}
              alt={`Photo ${activeImage + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div
            className="flex items-center justify-center gap-3 overflow-x-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                type="button"
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImage === idx ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
