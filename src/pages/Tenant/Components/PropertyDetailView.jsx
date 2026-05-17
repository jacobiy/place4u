import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  MapPin,
  Grid,
  Phone,
  Mail,
  Users,
  Dumbbell,
  Waves,
  Dog,
  Car,
  Briefcase,
  FileText
} from 'lucide-react'

export default function PropertyDetailView({ property, onBack, onApplyClick }) {
  const [activeImage, setActiveImage] = useState(0)

  const nextImage = () => setActiveImage((prev) => (prev + 1) % property.images.length)
  const prevImage = () => setActiveImage((prev) => (prev - 1 + property.images.length) % property.images.length)

  const amenityIcons = {
    'Fitness Center': Dumbbell,
    'Rooftop Pool': Waves,
    'Concierge Service': Users,
    'Pet Friendly': Dog,
    'Secure Parking': Car,
    'Co-working Space': Briefcase,
    Backyard: MapPin,
    Garage: Car
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] pb-24 -mx-8 -mt-8 text-white">
      <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 shrink-0 sticky top-0 bg-[#0b0e14]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors" type="button">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center text-blue-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-lg">Place4U</span>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-white/40 text-sm font-medium tracking-wider uppercase">
          Property Details
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors" type="button">
            <Bell size={20} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors" type="button">
            <Menu size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-12">
          <div className="relative rounded-3xl overflow-hidden aspect-video group">
            <img src={property.images[activeImage]} alt={property.title} className="w-full h-full object-cover" />

            <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={prevImage}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-all border border-white/10"
                type="button"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-all border border-white/10"
                type="button"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 flex gap-2 w-[90%] overflow-x-auto">
              {property.images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  type="button"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold">
                <FileText size={14} />
                <span>Description</span>
              </div>
              <p className="text-white/70 leading-relaxed">{property.description}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold">
                <MapPin size={14} />
                <span>Location</span>
              </div>
              <div className="rounded-2xl overflow-hidden glass h-48 relative border border-white/10">
                <div className="absolute inset-0 bg-[#1e2329]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-xl animate-pulse" />
                </div>
                <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                  Map
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold">
              <Grid size={14} />
              <span>Amenities</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {property.amenities.map((amenity) => {
                const Icon = amenityIcons[amenity] || Grid
                return (
                  <div key={amenity} className="flex items-center gap-3 text-white/70">
                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-white/40">
                      <Icon size={20} />
                    </div>
                    <span className="text-sm font-medium">{amenity}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-all duration-700" />

            <div className="relative">
              <div className="text-4xl font-bold mb-1">{property.price}</div>
              <div className="text-white/40 text-sm">Utilities Included</div>
            </div>

            <div className="space-y-3 relative">
              <button
                className="w-full bg-blue-600 hover:bg-blue-500 transition-all py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 active:scale-95"
                type="button"
                onClick={() => onApplyClick?.(property)}
              >
                Apply Now
              </button>
              <button className="w-full glass hover:bg-white/10 transition-all py-4 rounded-2xl font-bold text-lg active:scale-95" type="button">
                Schedule Tour
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-2">
              <Users size={14} />
              <span>Contact Agent</span>
            </div>
            <div className="glass rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <img src={property.agent.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                <div>
                  <div className="font-bold text-lg leading-tight">{property.agent.name}</div>
                  <div className="text-white/40 text-xs font-medium uppercase tracking-wider">{property.agent.role}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/60 hover:text-white transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                    <Phone size={16} />
                  </div>
                  <span className="text-sm font-medium">{property.agent.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-white/60 hover:text-white transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                    <Mail size={16} />
                  </div>
                  <span className="text-sm font-medium">{property.agent.email}</span>
                </div>
              </div>

              <textarea
                placeholder="Message"
                className="w-full glass rounded-xl p-4 text-sm outline-none focus:border-blue-500/50 min-h-[100px] resize-none"
              />
              <button className="w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 text-blue-400 transition-all py-3 rounded-xl font-bold text-sm" type="button">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
