import React, { useState } from 'react'
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
  Briefcase,
  Zap,
  Wind,
  Compass,
  ArrowUpRight
} from 'lucide-react'

export default function PropertyDetailView({ property, onBack, onApplyClick }) {
  const [activeImage, setActiveImage] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const rawImages = (property.image_urls && property.image_urls.length > 0)
    ? property.image_urls
    : (property.images && property.images.length > 0)
      ? property.images
      : property.image
        ? [property.image]
        : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80"];

  const images = Array.isArray(rawImages) ? rawImages : [rawImages];

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length)
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length)

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
    'Co-working Space': Briefcase,
    'Backup Generator': Zap,
    'Inverter Battery Backup': Zap,
    'Air Conditioning': Wind,
    'Ocean Views': Compass,
    'Balcony': Maximize2,
    '24/7 Concierge': ShieldCheck,
    'Security': ShieldCheck,
    'Backyard': MapPin
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const agentName = property.agent?.name || property.landlord?.full_name || "Place4U Verified Partner"
  const agentRole = property.agent?.role || (property.landlord ? "Verified Landlord" : "Senior Portfolio Specialist")
  const agentPhone = property.agent?.phone || property.landlord?.phone || "+27 82 444 3322"
  const agentEmail = property.agent?.email || property.landlord?.email || "contact@place4u.co.za"
  const agentPhoto = property.agent?.imageUrl || property.landlord?.profile_image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240"

  const fullAddress = property.address 
    ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.province ? `, ${property.province}` : ''}`
    : property.location || 'South Africa'

  const priceValue = typeof property.price === 'number' 
    ? property.price.toLocaleString('en-ZA') 
    : (property.rent || property.price || '0')

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 pb-20 selection:bg-blue-600/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0a0f1d]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] transition-all text-xs font-semibold tracking-wide"
              type="button"
            >
              <ChevronLeft size={16} />
              <span>Back to Listings</span>
            </button>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="text-blue-400 font-medium">{property.property_type || "Apartment"}</span>
              <span>•</span>
              <span className="truncate max-w-[280px] text-slate-300">{property.title || property.name || "Property Detail"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-2.5 rounded-xl border transition-all ${
                isSaved 
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
              type="button"
              aria-label="Save property"
              title="Save to favorites"
            >
              <Heart size={16} className={isSaved ? "fill-rose-400" : ""} />
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all text-xs font-medium"
              type="button"
              title="Share listing"
            >
              <Share2 size={15} />
              <span>{copiedLink ? "Link Copied!" : "Share"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Left Column (Bento Visuals + Story + Specs) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Gallery Showcase Card */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/[0.08] shadow-2xl group">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-950">
                <img
                  src={images[activeImage]}
                  alt={property.title || property.name || "Property image"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
                
                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-blue-600/90 text-white backdrop-blur-md shadow-lg border border-blue-400/30 flex items-center gap-1.5">
                      <Sparkles size={12} />
                      {property.property_type || "Verified Residence"}
                    </span>
                    {property.featured && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-white/90 backdrop-blur-md border border-white/10 shadow-md">
                    {activeImage + 1} / {images.length} Photos
                  </div>
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none">
                    <button
                      onClick={prevImage}
                      className="w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/15 shadow-xl transition-all pointer-events-auto hover:scale-105 active:scale-95"
                      type="button"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/15 shadow-xl transition-all pointer-events-auto hover:scale-105 active:scale-95"
                      type="button"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}

                {/* Bottom Title Bar overlay */}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                    {property.title || property.name || "Modern Sanctuary"}
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1 drop-shadow-sm">
                    <MapPin size={14} className="text-blue-400 shrink-0" />
                    <span className="truncate">{fullAddress}</span>
                  </div>
                </div>
              </div>

              {/* Thumbnails Strip */}
              {images.length > 1 && (
                <div className="p-3 bg-slate-900/90 border-t border-white/[0.06] flex gap-2.5 overflow-x-auto scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImage === idx
                          ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20 opacity-100 scale-100'
                          : 'border-transparent opacity-60 hover:opacity-90 hover:scale-[0.98]'
                      }`}
                      type="button"
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bento Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <BedDouble size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Bedrooms</div>
                  <div className="text-base font-bold text-white mt-0.5">{property.bedrooms ?? property.beds ?? 2} Beds</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bath size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Bathrooms</div>
                  <div className="text-base font-bold text-white mt-0.5">{property.bathrooms ?? property.baths ?? 2} Baths</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Maximize2 size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Floor Size</div>
                  <div className="text-base font-bold text-white mt-0.5">{property.size || "95 m²"}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Car size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Parking</div>
                  <div className="text-base font-bold text-white mt-0.5">1 Bay Covered</div>
                </div>
              </div>
            </div>

            {/* Description & Overview Bento Box */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-400" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">About this residence</h2>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  <span>Verified Listing</span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                {property.description || "Designed for sophisticated urban comfort, this premium property offers seamless modern living with tailored finishes, expansive living areas, and high accessibility to premier dining, transport, and leisure hubs."}
              </p>

              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                  Available: Immediate
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                  Lease Term: 12 Months
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                  Deposit: 1 Month Rent
                </span>
              </div>
            </div>

            {/* Amenities Grid Bento Box */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.07] space-y-5">
              <div className="border-b border-white/[0.06] pb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">Features & Amenities</h2>
                <span className="text-xs text-slate-400">{(property.amenities || []).length} inclusions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(property.amenities && property.amenities.length > 0
                  ? property.amenities
                  : ['Fiber Internet', 'Rooftop Pool', 'Secure Parking', '24/7 Security', 'Pet Friendly', 'Balcony']
                ).map((amenity) => {
                  const Icon = amenityIconMap[amenity] || Sparkles
                  return (
                    <div
                      key={amenity}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-all flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon size={16} />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-slate-200">{amenity}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Neighborhood & Map Preview Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.07] space-y-4">
              <div className="border-b border-white/[0.06] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-400" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">Location & Neighborhood</h2>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Open in Google Maps</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>

              <div className="relative rounded-2xl overflow-hidden h-44 border border-white/[0.08] bg-slate-900 flex items-center justify-center group">
                {/* Subtle map grid background effect */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Simulated radar point */}
                <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 animate-ping absolute" />
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border border-blue-300">
                      <MapPin size={16} />
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">{fullAddress}</div>
                  <div className="text-[11px] text-slate-400">Walking distance to grocery stores, transit lines, and parks</div>
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Sidebar Right Column (Pricing & CTA Bento) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Pricing & Application Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/95 border border-white/[0.1] shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Monthly Lease</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">R{priceValue}</span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Water Included
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      Prepaid Power
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    onClick={() => onApplyClick?.(property)}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    type="button"
                  >
                    <span>Apply for Lease</span>
                    <ArrowUpRight size={16} />
                  </button>

                  <a
                    href={`https://wa.me/${agentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I would like to schedule a viewing for "${property.title || property.name || 'this property'}" on Place4U.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.1] font-semibold text-xs transition-all flex items-center justify-center gap-2 text-decoration-none"
                    style={{ textDecoration: 'none' }}
                  >
                    <Calendar size={14} className="text-blue-400" />
                    <span>Schedule an In-Person Tour</span>
                  </a>
                </div>

                <div className="pt-4 border-t border-white/[0.08] text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Fast Track Application</span>
                  <span className="text-slate-300 font-medium">Response &lt; 24h</span>
                </div>
              </div>
            </div>

            {/* Verified Agent / Landlord Bento Card */}
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Listing Representative</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <ShieldCheck size={13} /> Verified
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src={agentPhoto}
                  alt={agentName}
                  className="w-13 h-13 rounded-2xl object-cover border border-white/10 shrink-0 shadow-md"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{agentName}</div>
                  <div className="text-xs text-slate-400 truncate">{agentRole}</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">Place4U Authorized</div>
                </div>
              </div>

              {/* Direct Communication Channels */}
              <div className="space-y-2 pt-2">
                <a
                  href={`https://wa.me/${agentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${agentName}, I am inquiring regarding "${property.title || property.name || 'your property'}" on Place4U.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 py-2.5 rounded-xl text-xs font-semibold transition-all text-decoration-none shadow-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Representative</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${agentPhone.replace(/\s+/g, '')}`}
                    className="flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 py-2 rounded-xl text-xs font-medium transition-all text-decoration-none"
                    style={{ textDecoration: 'none' }}
                  >
                    <Phone size={13} className="text-blue-400" />
                    <span>Call</span>
                  </a>

                  <a
                    href={`mailto:${agentEmail}?subject=${encodeURIComponent(`Inquiry: ${property.title || property.name || 'Property'}`)}`}
                    className="flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 py-2 rounded-xl text-xs font-medium transition-all text-decoration-none"
                    style={{ textDecoration: 'none' }}
                  >
                    <Mail size={13} className="text-purple-400" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Assurance Trust Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="text-[11px] text-slate-400 leading-normal">
                All agreements and tenant deposits on Place4U are protected by statutory rental escrow regulations.
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
