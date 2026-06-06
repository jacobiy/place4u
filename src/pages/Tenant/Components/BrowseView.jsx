import React, { useMemo, useState } from 'react'
import { Bed, Bath, Grid, List as ListIcon, MapPin, Heart, SlidersHorizontal, Search, ChevronDown } from 'lucide-react'
import './BrowseView.css'

export default function BrowseView({ properties = [], onPropertyClick, onApplyClick }) {
  const [view, setView] = useState('grid')
  const [query, setQuery] = useState('')
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(50000)
  const [selectedType, setSelectedType] = useState('All Types')
  const [bedsMin, setBedsMin] = useState(0)
  const [bathsMin, setBathsMin] = useState(0)
  
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return properties.filter((p) => {
      const pTitle = `${p.bedrooms || 1} Bedroom ${p.property_type || 'Property'} in ${p.city || 'City'}`
      const pType = p.property_type || ''
      const pAddress = p.address || ''
      const pCity = p.city || ''
      const pState = p.state || ''
      const pPrice = p.price || 0
      
      const haystack = `${pTitle} ${pType} ${pAddress} ${pCity} ${pState}`.toLowerCase()
      const matchesQuery = !q || haystack.includes(q)
      const matchesType = selectedType === 'All Types' || pType.toLowerCase().includes(selectedType.toLowerCase())
      const matchesBeds = bedsMin === 0 || Number(p.bedrooms || 0) >= bedsMin
      const matchesBaths = bathsMin === 0 || Number(p.bathrooms || 0) >= bathsMin
      const matchesPrice = pPrice >= priceMin && pPrice <= priceMax

      return matchesQuery && matchesType && matchesBeds && matchesBaths && matchesPrice
    })
  }, [bathsMin, bedsMin, query, selectedType, priceMin, priceMax, properties])

  const featured = filtered.length > 0 ? filtered[0] : null;
  const listings = filtered.length > 0 ? filtered.slice(1) : [];

  const handleReset = () => {
    setQuery('')
    setPriceMin(0)
    setPriceMax(50000)
    setSelectedType('All Types')
    setBedsMin(0)
    setBathsMin(0)
  }

  const getImageUrl = (p) => {
    if (p?.image_urls?.length > 0) return p.image_urls[0];
    if (p?.images?.length > 0) return p.images[0];
    return "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=60";
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#10131b] text-[#e1e2ed] font-['Inter'] overflow-hidden shadow-2xl relative z-10">
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-6 mx-auto w-full">
        <div className="flex flex-col gap-8 max-w-[1400px] mx-auto">
          
          {/* Welcome Section */}
          <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#e1e2ed] mb-2 tracking-tight">Browse Properties</h2>
              <p className="text-base text-[#c2c6d7]">Search, filter, and open any listing to view details.</p>
            </div>
            
            <div className="flex items-center gap-4 flex-1 md:max-w-xl justify-end">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c90a0]" size={18} />
                <input 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#272a32] border-none rounded-full py-2 pl-10 pr-4 text-sm text-[#e1e2ed] focus:ring-1 focus:ring-[#b0c6ff] outline-none placeholder-[#8c90a0]" 
                  placeholder="Search by city, address, type..." 
                  type="text"
                />
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-[#32353d] text-[#b0c6ff]' : 'hover:bg-[#32353d] text-[#c2c6d7]'}`}
                >
                  <Grid size={20} />
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-[#32353d] text-[#b0c6ff]' : 'hover:bg-[#32353d] text-[#c2c6d7]'}`}
                >
                  <ListIcon size={20} />
                </button>
              </div>
            </div>
          </section>

          {/* Horizontal Filter Bar */}
          <div className="bg-[#191b23] rounded-xl p-4 border border-[#424654] flex flex-wrap items-center gap-4">
            {/* Price Range */}
            <div className="flex items-center gap-3 pr-4 border-r border-[#424654]">
              <span className="text-xs font-semibold text-[#8c90a0] uppercase tracking-wider whitespace-nowrap">Price Range</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  className="w-24 bg-[#32353d] border-none rounded-lg text-sm py-1.5 px-3 text-[#e1e2ed] focus:ring-1 focus:ring-[#b0c6ff] outline-none" 
                />
                <span className="text-[#8c90a0]">to</span>
                <input 
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-24 bg-[#32353d] border-none rounded-lg text-sm py-1.5 px-3 text-[#e1e2ed] focus:ring-1 focus:ring-[#b0c6ff] outline-none" 
                />
              </div>
            </div>

            {/* Property Type Filter */}
            <div className="flex items-center gap-3 pr-4 border-r border-[#424654] relative group">
              <span className="text-xs font-semibold text-[#8c90a0] uppercase tracking-wider whitespace-nowrap">Type</span>
              <div className="relative">
                <button 
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="flex items-center gap-2 bg-[#32353d] px-4 py-1.5 rounded-lg text-sm text-[#c2c6d7] hover:text-[#e1e2ed] transition-colors"
                >
                  <span>{selectedType}</span>
                  <ChevronDown size={16} />
                </button>
                {typeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 bg-[#272a32] border border-[#424654] rounded-lg shadow-xl overflow-hidden z-50">
                    {['All Types', 'Apartment', 'House', 'Condo', 'Townhouse'].map(t => (
                      <button 
                        key={t}
                        onClick={() => { setSelectedType(t); setTypeDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-[#c2c6d7] hover:bg-[#32353d] hover:text-[#e1e2ed]"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Beds Segmented Control */}
            <div className="flex items-center gap-3 pr-4 border-r border-[#424654]">
              <span className="text-xs font-semibold text-[#8c90a0] uppercase tracking-wider whitespace-nowrap">Beds</span>
              <div className="flex bg-[#32353d] p-1 rounded-lg">
                {[1, 2, 3].map(num => (
                  <button 
                    key={num}
                    onClick={() => setBedsMin(bedsMin === num ? 0 : num)}
                    className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${bedsMin === num ? 'bg-[#b0c6ff] text-[#002d6e] shadow-sm' : 'hover:bg-[#424654] text-[#c2c6d7]'}`}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>

            {/* Baths Segmented Control */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#8c90a0] uppercase tracking-wider whitespace-nowrap">Baths</span>
              <div className="flex bg-[#32353d] p-1 rounded-lg">
                {[1, 2, 3].map(num => (
                  <button 
                    key={num}
                    onClick={() => setBathsMin(bathsMin === num ? 0 : num)}
                    className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${bathsMin === num ? 'bg-[#b0c6ff] text-[#002d6e] shadow-sm' : 'hover:bg-[#424654] text-[#c2c6d7]'}`}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>

            {/* Clear/Apply */}
            <div className="ml-auto flex items-center gap-3">
              <button onClick={handleReset} className="text-sm font-medium text-[#8c90a0] hover:text-[#e1e2ed] transition-colors">Reset</button>
              <button className="bg-[#32353d] hover:bg-[#424654] text-[#e1e2ed] px-4 py-1.5 rounded-lg text-sm font-medium transition-all">
                More Filters
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {/* Featured Listing */}
            {featured && (
              <section 
                onClick={() => onPropertyClick && onPropertyClick(featured)}
                className="bg-[#191b23] rounded-xl p-4 border border-[#424654] cursor-pointer"
              >
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-xs font-bold text-[#8c90a0] uppercase tracking-[0.2em]">Featured Selection</h3>
                  <span className="text-[#8c90a0] text-xs font-semibold">Highlight</span>
                </div>
                <div className="relative group overflow-hidden rounded-xl h-[480px]">
                  <img 
                    src={getImageUrl(featured)} 
                    alt={featured.title || "Featured Property"} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
                    <div className="max-w-2xl">
                      <span className="glass-tag px-3 py-1 rounded text-xs font-bold text-white mb-3 inline-block uppercase tracking-wider">
                        {featured.property_type || 'Exclusive Property'}
                      </span>
                      <h4 className="text-4xl font-bold text-white mb-2 tracking-tight">R {Number(featured.price || 0).toLocaleString()} /mo</h4>
                      <p className="text-lg text-[#c2c6d7]">{featured.bedrooms} Bed {featured.property_type} • {featured.city}</p>
                    </div>
                    <div className="flex gap-4">
                      <button className="w-12 h-12 glass-tag flex items-center justify-center rounded-full text-white hover:bg-white hover:text-[#10131b] transition-all">
                        <Heart size={20} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onApplyClick && onApplyClick(featured); }}
                        className="bg-[#b0c6ff] text-[#002d6e] px-8 py-3 rounded-lg text-sm btn-glow transition-all uppercase tracking-widest font-bold"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Listing List */}
            <div className="flex justify-between items-center mb-4 px-2 mt-4">
              <h3 className="text-2xl font-bold text-[#e1e2ed]">Properties Available</h3>
              <span className="text-[#8c90a0] text-xs font-semibold">Showing {listings.length} listings</span>
            </div>
            
            <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
              {listings.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => onPropertyClick && onPropertyClick(p)}
                  className={`bg-[#191b23] rounded-xl border border-[#424654] flex ${view === 'grid' ? 'flex-col' : 'flex-row h-48'} overflow-hidden group hover:border-[#b0c6ff]/50 transition-all cursor-pointer`}
                >
                  <div className={`relative overflow-hidden shrink-0 ${view === 'grid' ? 'w-full h-48' : 'w-64 h-full'}`}>
                    <img 
                      src={getImageUrl(p)} 
                      alt="Property" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 glass-tag px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white">
                      {p.property_type || 'Listing'}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-[#e1e2ed]">R {Number(p.price || 0).toLocaleString()}</h3>
                      <p className="text-[#c2c6d7] text-sm mt-1 truncate">{p.bedrooms} Bed {p.property_type} in {p.city}</p>
                    </div>
                    <div className="mt-auto flex flex-col gap-4">
                      <div className="flex flex-wrap gap-4 text-[#8c90a0]">
                        <div className="flex items-center gap-1.5"><Bed size={16} /><span className="text-xs font-semibold">{p.bedrooms || 1}</span></div>
                        <div className="flex items-center gap-1.5"><Bath size={16} /><span className="text-xs font-semibold">{p.bathrooms || 1}</span></div>
                        <div className="flex items-center gap-1.5"><MapPin size={16} /><span className="text-xs font-semibold truncate max-w-[100px]">{p.city}</span></div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onApplyClick && onApplyClick(p); }}
                        className="w-full bg-[#b0c6ff] text-[#002d6e] py-2 rounded-lg text-sm font-bold btn-glow transition-all"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!filtered.length && (
              <div className="py-20 flex items-center justify-center text-[#8c90a0]">
                No properties match your filters.
              </div>
            )}

            {/* Footer End State */}
            {filtered.length > 0 && (
              <div className="py-16 flex items-center justify-center gap-4">
                <div className="w-1 h-1 bg-[#8c90a0] rounded-full"></div>
                <p className="text-[#8c90a0] text-xs font-semibold uppercase tracking-[0.2em]">You've reached the end of the current listings.</p>
                <div className="w-1 h-1 bg-[#8c90a0] rounded-full"></div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
