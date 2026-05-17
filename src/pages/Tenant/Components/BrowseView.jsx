import React, { useMemo, useState } from 'react'
import { Bed, Bath, Grid, List as ListIcon, MapPin, Heart, SlidersHorizontal, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { PROPERTIES } from '../Data/constants'

export default function BrowseView({ onPropertyClick, onApplyClick }) {
  const [view, setView] = useState('list') // 'list' | 'grid'
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(6)
  const [selectedTypes, setSelectedTypes] = useState([])
  const [bedsMin, setBedsMin] = useState(null)
  const [bathsMin, setBathsMin] = useState(null)
  const [selectedAmenities, setSelectedAmenities] = useState([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PROPERTIES.filter((p) => {
      const haystack = `${p.title} ${p.type} ${p.address} ${p.city} ${p.state}`.toLowerCase()
      const matchesQuery = !q || haystack.includes(q)
      const matchesType = !selectedTypes.length || selectedTypes.includes(p.type)
      const matchesBeds = bedsMin == null || Number(p.beds ?? 0) >= bedsMin
      const matchesBaths = bathsMin == null || Number(p.baths ?? 0) >= bathsMin
      const matchesAmenities =
        !selectedAmenities.length ||
        selectedAmenities.every((a) =>
          (p.amenities ?? []).some((pa) => String(pa).toLowerCase().includes(String(a).toLowerCase()))
        )

      return matchesQuery && matchesType && matchesBeds && matchesBaths && matchesAmenities
    })
  }, [bathsMin, bedsMin, query, selectedAmenities, selectedTypes])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  return (
    <div className="flex gap-8 pb-12 min-h-[calc(100vh-12rem)]">
      {/* Desktop filters */}
      <aside className="hidden lg:block w-80 shrink-0 glass rounded-3xl p-6 h-fit sticky top-24 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-8">
        <div>
          <h3 className="text-sm font-semibold mb-4 text-white/40 uppercase tracking-widest">Price Range</h3>
          <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center mb-4">
            <span className="text-sm font-medium">R5,000 – R30,000+</span>
          </div>
          <div className="relative h-2 bg-white/10 rounded-full">
            <div className="absolute left-[10%] right-[20%] h-full bg-blue-500 rounded-full" />
            <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500" />
            <div className="absolute right-[20%] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500" />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-medium text-white/30">
            <span>R5,000</span>
            <span>R30,000+</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-white/40 uppercase tracking-widest">Property Type</h3>
          <div className="space-y-3">
            {['Apartment', 'House', 'Condo', 'Townhouse'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setSelectedTypes((prev) =>
                    prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                  )
                }
                className="w-full flex items-center justify-between gap-3 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedTypes.includes(type) ? 'border-blue-500' : 'border-white/20 group-hover:border-blue-500'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 bg-blue-500 rounded-sm transition-opacity ${
                        selectedTypes.includes(type) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">{type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-white/40 uppercase tracking-widest">Beds</h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBedsMin((prev) => (prev === n ? null : n))}
                className={`py-2 text-xs font-bold rounded-xl border border-white/10 transition-all ${
                  bedsMin === n ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-white/40 uppercase tracking-widest">Baths</h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBathsMin((prev) => (prev === n ? null : n))}
                className={`py-2 text-xs font-bold rounded-xl border border-white/10 transition-all ${
                  bathsMin === n ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-white/40 uppercase tracking-widest">Amenities</h3>
          <div className="space-y-3">
            {['Gym', 'Pool', 'Parking', 'Pet Friendly'].map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() =>
                  setSelectedAmenities((prev) =>
                    prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
                  )
                }
                className="w-full flex items-center justify-between gap-3 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedAmenities.includes(amenity)
                        ? 'border-blue-500'
                        : 'border-white/20 group-hover:border-blue-500'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 bg-blue-500 rounded-sm transition-opacity ${
                        selectedAmenities.includes(amenity) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">{amenity}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-6 pr-0 lg:pr-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Browse Properties</h2>
            <p className="text-white/40 text-sm mt-1">Search, filter, and open any listing to view details.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition"
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-2 border-white/10">
              <Search size={16} className="text-white/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setVisibleCount(6)
                }}
                placeholder="Search by city, address, type..."
                className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 w-64"
              />
            </div>

            <div className="flex gap-2">
              <button
                className={`p-2 rounded-xl transition ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                className={`p-2 rounded-xl transition ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-2 glass rounded-xl px-3 py-2 border-white/10">
          <Search size={16} className="text-white/40" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisibleCount(6)
            }}
            placeholder="Search..."
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 w-full"
          />
        </div>

        {mobileFiltersOpen ? (
          <div className="lg:hidden glass rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Filters</h3>
              <button type="button" className="text-white/50 hover:text-white" onClick={() => setMobileFiltersOpen(false)}>
                Close
              </button>
            </div>
            <div className="text-sm text-white/40">Filters are shown on desktop. Hook these up to DB later.</div>
          </div>
        ) : null}

        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/60">Featured</h3>
            <span className="text-xs text-white/30">{Math.min(filtered.length, 2)} highlights</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filtered.slice(0, 2).map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => onPropertyClick(property)}
                className="min-w-[300px] sm:min-w-[380px] glass rounded-3xl overflow-hidden text-left hover:border-blue-500/50 transition-all group"
              >
                <div className="relative h-44">
                  <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-lg font-bold">{property.price}</div>
                    <div className="text-xs text-white/70 truncate">
                      {property.title} • {property.city}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visible.map((property) => (
              <motion.div
                key={property.id}
                layoutId={`property-${property.id}`}
                className="glass rounded-3xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all group"
                onClick={() => onPropertyClick(property)}
              >
                <div className="relative h-56">
                  <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {property.type}
                  </div>
                  <button
                    type="button"
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-red-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Heart size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{property.price}</div>
                    <div className="flex items-center gap-1 text-white/40 text-xs">
                      <MapPin size={12} />
                      <span>
                        {property.address}, {property.city}, {property.state}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-white/60 text-sm font-medium pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Bed size={16} />
                      <span>{property.beds} Beds</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bath size={16} />
                      <span>{property.baths} Baths</span>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-blue-300 hover:text-blue-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        onApplyClick?.(property)
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((property) => (
              <motion.button
                key={property.id}
                layoutId={`property-${property.id}`}
                type="button"
                onClick={() => onPropertyClick(property)}
                className="w-full text-left glass rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all group"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-0">
                  <div className="sm:col-span-4 relative h-56 sm:h-44">
                    <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {property.type}
                    </div>
                  </div>
                  <div className="sm:col-span-8 p-5 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">{property.price}</div>
                        <div className="text-sm text-white/80 mt-1">{property.title}</div>
                        <div className="flex items-center gap-1 text-white/40 text-xs mt-2">
                          <MapPin size={12} />
                          <span>
                            {property.address}, {property.city}, {property.state}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-xs font-bold border border-blue-600/30"
                        onClick={(e) => {
                          e.stopPropagation()
                          onApplyClick?.(property)
                        }}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-red-500 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Save property"
                      >
                        <Heart size={18} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm font-medium pt-4 border-t border-white/5 mt-5">
                      <div className="flex items-center gap-1.5">
                        <Bed size={16} />
                        <span>{property.beds} Beds</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath size={16} />
                        <span>{property.baths} Baths</span>
                      </div>
                      <div className="text-xs text-white/30">Tap to open details</div>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center pt-2">
          {visible.length < filtered.length ? (
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition"
              onClick={() => setVisibleCount((n) => n + 6)}
            >
              Load more
            </button>
          ) : (
            <span className="text-xs text-white/30">You’ve reached the end.</span>
          )}
        </div>
      </div>
    </div>
  )
}
