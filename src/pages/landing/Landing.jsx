// Landing.jsx - Place4U Rental Matching Marketplace
// Theme: Clean Architectural Light Mzansi (Primary: #006194, Secondary: #006c4a, Surface: #faf8ff)
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
	HiLocationMarker,
	HiShieldCheck,
	HiCheckCircle,
	HiArrowRight,
	HiHeart,
	HiCheck,
	HiX,
	HiChevronDown
} from 'react-icons/hi'
import {
	FaWhatsapp,
	FaBuilding,
	FaGavel,
	FaShieldAlt,
	FaBan,
	FaComments,
	FaLinkedinIn,
	FaQuoteLeft
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import { getFeaturedProperties } from './db/queries'

// Live listings are loaded from the database only; no sample fallback.

// Real listings come from `public.properties`. These maps turn a DB row into the
// shape the marketing cards expect.
const PROPERTY_TYPE_LABELS = {
	house: 'House',
	apartment: 'Apartment',
	room: 'Room',
	backroom: 'Backroom',
	commercial: 'Commercial'
}

const PROPERTY_TYPE_CATEGORY = {
	house: 'Apartments',
	apartment: 'Apartments',
	room: 'Student Digs',
	backroom: 'Cottages & Backrooms',
	commercial: 'Apartments'
}

const DEFAULT_PROPERTY_IMAGE =
	'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=80'

const formatPrice = (value) => {
	const amount = Number(value)
	if (!Number.isFinite(amount)) return 'POA'
	return `R ${amount.toLocaleString('en-ZA')}`
}

const formatAvailable = (value) => {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return `Available ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
}

// Map a `properties` row onto the landing card model.
const mapDbProperty = (row) => {
	const images =
		Array.isArray(row.image_urls) && row.image_urls.length > 0
			? row.image_urls.filter(Boolean)
			: row.image_url
				? [row.image_url]
				: []

	const typeLabel = PROPERTY_TYPE_LABELS[row.property_type] || 'Property'
	const locality =
		[row.area, row.city].filter(Boolean).join(', ') || row.province || 'South Africa'

	const tags = []
	if (row.furnished) tags.push('Furnished')
	if (row.pet_friendly) tags.push('Pet Friendly')
	tags.push(typeLabel)
	const availableTag = formatAvailable(row.available_from)
	if (availableTag) tags.push(availableTag)

	const price = Number(row.price)

	return {
		id: row.id,
		title:
			row.property_type && (row.area || row.city)
				? `${typeLabel} in ${row.area || row.city}`
				: typeLabel,
		category: PROPERTY_TYPE_CATEGORY[row.property_type] || 'Apartments',
		area: locality,
		province: row.province || '',
		near: `Listing in ${locality}`,
		price: formatPrice(row.price),
		numericPrice: Number.isFinite(price) ? price : 0,
		period: 'month',
		image: images[0] || DEFAULT_PROPERTY_IMAGE,
		fallbackImage: DEFAULT_PROPERTY_IMAGE,
		tags: tags.slice(0, 3),
		beds: row.bedrooms || 0,
		baths: row.bathrooms || 0,
		verifiedLandlord: row.landlord?.full_name || 'Place4U Listed Landlord',
		verificationType: 'Landlord Documents Reviewed',
		status: 'Listing Reviewed'
	}
}

const QUICK_LOCATIONS = [
	'Braamfontein',
	'Rosebank',
	'Hatfield PTA',
	'Orlando Soweto',
	'Stellenbosch',
	'Gardens CPT'
]

const CATEGORIES = [
	'All Listings',
	'Student Digs',
	'Cottages & Backrooms',
	'Apartments'
]

const PRICE_OPTIONS = [
	{ value: 'any', label: 'Any Price' },
	{ value: 'under3k', label: 'Under R 3,000 / mo' },
	{ value: 'under5k', label: 'Under R 5,000 / mo' },
	{ value: 'under8k', label: 'Under R 8,000 / mo' },
	{ value: 'under12k', label: 'Under R 12,000 / mo' }
]

const TRUST_STATS = [
	{ value: '1 form', label: 'One application', detail: 'Not one per listing' },
	{ value: 'FICA-style', label: 'Documents on file', detail: 'ID, income & ownership' },
	{ value: 'Reviewed', label: 'Owners & premises', detail: 'Documents reviewed before introduction' },
	{ value: 'Direct', label: 'Warm introductions', detail: 'You deal with the owner or agent' }
]

const TESTIMONIALS = [
	{
		name: 'Thabo Mokoena',
		role: 'Wits University Student',
		quote: 'As a Wits student moving from Polokwane, my parents were terrified of Braamfontein scams. Place4U showed us the ownership documents before we paid anything. Found my digs in 2 days!',
		initials: 'TM',
		bgClass: 'bg-[#006194]'
	},
	{
		name: 'Prof. David van der Merwe',
		role: 'Property Owner, CPT',
		quote: 'Listing my garden cottage in Rosebank took two days. The verification team checked my ownership documents before it went live. Quality tenants only!',
		initials: 'DV',
		bgClass: 'bg-[#006c4a]'
	},
	{
		name: 'Zola Ndlazi',
		role: 'Young Professional, Pretoria',
		quote: 'The WhatsApp desk is a game changer. Whenever we had questions about the backup solar setup, an agent responded within 5 minutes.',
		initials: 'ZN',
		bgClass: 'bg-[#006387]'
	}
]

const Landing = () => {
	const navigate = useNavigate()
	const [activeCategory, setActiveCategory] = useState('All Listings')
	const [activeProvince, setActiveProvince] = useState('All SA')
	const [searchQuery, setSearchQuery] = useState('')
	const [priceFilter, setPriceFilter] = useState('any')
	const [priceDropdownOpen, setPriceDropdownOpen] = useState(false)
	const priceDropdownRef = useRef(null)
	const [favorites, setFavorites] = useState([])
	const [selectedProperty, setSelectedProperty] = useState(null)
	const [liveProperties, setLiveProperties] = useState(null)
	const [loadingProperties, setLoadingProperties] = useState(true)

	// Load real, approved listings from the database on mount.
	useEffect(() => {
		let active = true

		const load = async () => {
			const rows = await getFeaturedProperties({ limit: 24 })
			if (!active) return
			// DB-only: a failed fetch (null) or an empty table both yield an empty grid.
			setLiveProperties(Array.isArray(rows) ? rows.map(mapDbProperty) : [])
			setLoadingProperties(false)
		}

		load()
		return () => {
			active = false
		}
	}, [])

	const properties = useMemo(() => liveProperties || [], [liveProperties])

	const provinceOptions = useMemo(() => {
		const provinces = Array.from(
			new Set(properties.map((prop) => prop.province).filter(Boolean))
		).sort()
		return ['All SA', ...provinces]
	}, [properties])

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (priceDropdownRef.current && !priceDropdownRef.current.contains(e.target)) {
				setPriceDropdownOpen(false)
			}
		}
		if (priceDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [priceDropdownOpen])

	// Close the property modal on Escape and lock background scroll while open.
	useEffect(() => {
		if (!selectedProperty) return
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setSelectedProperty(null)
		}
		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [selectedProperty])

	const toggleFavorite = (id) => {
		setFavorites((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
		)
	}

	const filteredProperties = properties.filter((prop) => {
		const matchesCategory =
			activeCategory === 'All Listings' || prop.category === activeCategory
		
		const matchesProvince =
			activeProvince === 'All SA' || prop.province === activeProvince

		const matchesSearch =
			!searchQuery ||
			prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			prop.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
			prop.near.toLowerCase().includes(searchQuery.toLowerCase()) ||
			prop.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

		let matchesPrice = true
		if (priceFilter === 'under3k') matchesPrice = prop.numericPrice <= 3000
		else if (priceFilter === 'under5k') matchesPrice = prop.numericPrice <= 5000
		else if (priceFilter === 'under8k') matchesPrice = prop.numericPrice <= 8000
		else if (priceFilter === 'under12k') matchesPrice = prop.numericPrice <= 12000

		return matchesCategory && matchesProvince && matchesSearch && matchesPrice
	})

	const handleSearchScroll = () => {
		const el = document.getElementById('residencies')
		if (el) el.scrollIntoView({ behavior: 'smooth' })
	}

	return (
		<div
			id="landing"
			className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased scroll-smooth selection:bg-[#006194] selection:text-white"
		>
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-[#006194] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
			>
				Skip to content
			</a>
			<Navbar />

			{/* ===================== HERO SECTION ===================== */}
			<section id="main" className="relative overflow-hidden scroll-mt-24 pt-32 pb-20 md:pt-40 md:pb-28 px-6 lg:px-12 bg-gradient-to-b from-[#cce5ff]/30 via-[#faf8ff] to-[#faf8ff]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
					
					{/* Left Column: Messaging & Search Dock */}
					<div className="lg:col-span-7 flex flex-col gap-6">
						<div className="inline-flex items-center gap-2 bg-[#85f8c4]/50 text-[#005137] px-3.5 py-1 rounded-full text-xs font-semibold w-max border border-[#68dba9]/40 shadow-sm">
							<span className="material-symbols-outlined text-[18px]">verified</span>
							One Application. Human-Reviewed Listings.
						</div>

						<h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#131b2e] tracking-tight leading-[1.12]">
							Find rooms & cottages from reviewed landlords
						</h1>

						<p className="font-['Plus_Jakarta_Sans'] text-base sm:text-lg text-[#3f4850] max-w-2xl leading-relaxed">
							Landlords who submit ID and proof-of-ownership documents for our team to review, for students, young professionals, and urban renters across Mzansi.
						</p>

						{/* Interactive Search Dock */}
						<div className="mt-2 bg-white p-4 lg:p-6 rounded-2xl shadow-[0_24px_60px_-28px_rgba(0,97,148,0.45)] border border-[#dae2fd]/60 flex flex-col gap-4">
							{/* Category Buttons */}
							<div className="flex flex-wrap gap-2 border-b border-[#bfc7d2]/30 pb-4">
								{CATEGORIES.map((cat) => (
									<button
										key={cat}
										onClick={() => setActiveCategory(cat)}
										className={`px-4 py-2 rounded-lg text-sm font-['Space_Grotesk'] font-semibold transition-all ${
											activeCategory === cat
												? 'bg-[#006194] text-white shadow-md'
												: 'bg-[#eaedff] hover:bg-[#e2e7ff] text-[#131b2e]'
										}`}
									>
										{cat}
									</button>
								))}
							</div>

							{/* Input Controls */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold tracking-wider text-[#3f4850] uppercase">
										Location
									</label>
									<div className="flex items-center gap-2 bg-[#faf8ff] px-3 py-2.5 rounded-lg border border-[#bfc7d2]/50 focus-within:border-[#006194] transition-colors">
										<span className="material-symbols-outlined text-[#707881] text-[20px]">location_on</span>
										<input
											type="text"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder="Suburb, City or University"
											className="bg-transparent w-full text-sm focus:outline-none text-[#131b2e] placeholder-[#707881]"
										/>
										{searchQuery && (
											<button
												onClick={() => setSearchQuery('')}
												className="text-xs text-slate-400 hover:text-slate-700"
											>
												<HiX size={14} />
											</button>
										)}
									</div>
								</div>

								<div className="flex flex-col gap-1 relative" ref={priceDropdownRef}>
									<label className="text-[11px] font-bold tracking-wider text-[#3f4850] uppercase">
										Max Budget
									</label>
									<button
										type="button"
										onClick={() => setPriceDropdownOpen((prev) => !prev)}
										aria-expanded={priceDropdownOpen}
										aria-haspopup="listbox"
										className={`flex items-center justify-between gap-2 bg-[#faf8ff] px-3.5 py-2.5 rounded-lg border transition-all text-left outline-none ${
											priceDropdownOpen
												? 'border-[#006194] ring-2 ring-[#006194]/20 bg-white shadow-sm'
												: 'border-[#bfc7d2]/50 hover:border-[#006194]'
										}`}
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="material-symbols-outlined text-[#006194] text-[20px] flex-shrink-0">payments</span>
											<span className="text-sm font-medium text-[#131b2e] truncate">
												{PRICE_OPTIONS.find((opt) => opt.value === priceFilter)?.label || 'Any Price'}
											</span>
										</div>
										<HiChevronDown
											className={`w-4 h-4 text-[#707881] transition-transform duration-200 flex-shrink-0 ${
												priceDropdownOpen ? 'rotate-180 text-[#006194]' : ''
											}`}
										/>
									</button>

									{/* Custom Animated Floating Dropdown Menu */}
									<AnimatePresence>
										{priceDropdownOpen && (
											<motion.div
												initial={{ opacity: 0, y: -6, scale: 0.98 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: -6, scale: 0.98 }}
												transition={{ duration: 0.15, ease: 'easeOut' }}
												className="absolute top-[calc(100%+6px)] left-0 w-full min-w-[220px] bg-white border border-[#dae2fd] rounded-xl shadow-2xl shadow-black/10 p-1.5 z-50 overflow-hidden"
											>
												{PRICE_OPTIONS.map((opt) => {
													const isSelected = priceFilter === opt.value
													return (
														<button
															key={opt.value}
															type="button"
															onClick={() => {
																setPriceFilter(opt.value)
																setPriceDropdownOpen(false)
															}}
															className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-all text-left ${
																isSelected
																	? 'bg-[#cce5ff] text-[#006194] font-bold'
																	: 'text-[#3f4850] hover:bg-[#f2f3ff] hover:text-[#131b2e]'
															}`}
														>
															<span>{opt.label}</span>
															{isSelected && <HiCheck className="w-4 h-4 text-[#006194] flex-shrink-0 ml-2" />}
														</button>
													)
												})}
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								<div className="flex items-end">
									<button
										onClick={handleSearchScroll}
										className="w-full bg-[#006194] hover:bg-[#004b73] text-white font-['Space_Grotesk'] font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
									>
										<span className="material-symbols-outlined text-[20px]">search</span>
										Search Digs
									</button>
								</div>
							</div>

							{/* Popular Locations */}
							<div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
								<span className="text-[#707881] font-medium text-[11px]">Popular:</span>
								{QUICK_LOCATIONS.map((loc) => (
									<button
										key={loc}
										onClick={() => setSearchQuery(loc.split(' ')[0])}
										className="bg-[#eaedff] px-2.5 py-1 rounded-md text-[#3f4850] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors text-[11px] font-medium"
									>
										{loc}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Right Column: Hero Visual Asset */}
					<div className="lg:col-span-5 relative">
						<div className="relative rounded-2xl overflow-hidden shadow-[0_40px_90px_-35px_rgba(0,97,148,0.55)] bg-[#eaedff] aspect-[4/5] border border-[#dae2fd]">
							<img
								src="/hero-loft.jpg"
								alt="Modern light-filled student loft apartment in Braamfontein"
								className="w-full h-full object-cover"
								onError={(e) => {
									e.target.src = 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=85&w=1600&auto=format&fit=crop'
								}}
							/>

							{/* Reviewed Listing Floating Badge */}
							<div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_18px_40px_-18px_rgba(0,97,148,0.45)] border border-[#bfc7d2]/30 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-[#85f8c4]/50 flex items-center justify-center text-[#005137]">
										<span className="material-symbols-outlined text-[20px]">shield_locked</span>
									</div>
									<div>
										<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#131b2e]">Reviewed Listing</h4>
										<p className="text-xs text-[#3f4850]">Ownership documents submitted by landlord</p>
									</div>
								</div>
								<span className="bg-[#006c4a] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
									Documents on File
								</span>
							</div>
						</div>
					</div>

				</div>
			</section>

			{/* ===================== TRUST STATS STRIP ===================== */}
			<section className="px-6 lg:px-12 relative z-10 -mt-8 md:-mt-12">
				<div className="max-w-7xl mx-auto bg-white rounded-3xl border border-[#dae2fd]/70 shadow-[0_30px_70px_-40px_rgba(0,97,148,0.55)] px-6 py-7 sm:px-10 sm:py-9 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
					{TRUST_STATS.map((stat) => (
						<div key={stat.label} className="flex flex-col">
							<span aria-hidden="true" className="h-1 w-9 rounded-full bg-gradient-to-r from-[#006194] to-[#85f8c4] mb-3" />
							<span className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#006194] tracking-tight tabular-nums">
								{stat.value}
							</span>
							<span className="text-sm font-semibold text-[#131b2e] mt-1">{stat.label}</span>
							<span className="text-[11px] text-[#3f4850] mt-0.5">{stat.detail}</span>
						</div>
					))}
				</div>
			</section>

			{/* ===================== PROPERTIES GRID ===================== */}
			<section id="residencies" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-24">
				<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
					<div>
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							Live Inventory
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							Featured Reviewed Properties
						</h2>
					</div>

					{/* Province Filter Pills */}
					<div className="flex flex-wrap gap-2">
						{provinceOptions.map((prov) => (
							<button
								key={prov}
								onClick={() => setActiveProvince(prov)}
								className={`px-4 py-2 rounded-lg text-xs font-['Space_Grotesk'] font-bold transition-all ${
									activeProvince === prov
										? 'bg-[#eaedff] text-[#131b2e] shadow-sm'
										: 'bg-white text-[#3f4850] hover:text-[#131b2e] border border-[#dae2fd]/60'
								}`}
							>
								{prov}
							</button>
						))}
					</div>
				</div>

				{/* Property Cards */}
				{loadingProperties && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="bg-[#f2f3ff] rounded-2xl overflow-hidden border border-[#dae2fd]/60 animate-pulse"
							>
								<div className="aspect-[16/10] bg-[#dae2fd]" />
								<div className="p-6 space-y-3">
									<div className="h-3 w-1/3 rounded bg-[#dae2fd]" />
									<div className="h-5 w-2/3 rounded bg-[#dae2fd]" />
									<div className="h-6 w-1/2 rounded bg-[#dae2fd]" />
								</div>
							</div>
						))}
					</div>
				)}

				{!loadingProperties && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{filteredProperties.map((prop) => (
						<div
							key={prop.id}
							className="bg-[#f2f3ff] rounded-2xl overflow-hidden shadow-[0_12px_34px_-22px_rgba(0,97,148,0.35)] hover:shadow-[0_28px_60px_-26px_rgba(0,97,148,0.5)] transition-all duration-300 flex flex-col group border border-[#dae2fd]/60"
						>
							<div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
								<img
									src={prop.image}
									alt={prop.title}
									className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
									onError={(e) => {
										e.target.src = prop.fallbackImage
									}}
								/>

								<div className="absolute top-3 left-3 bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
									<span className="material-symbols-outlined text-[14px]">verified</span>
									{prop.status}
								</div>

								<button
									onClick={() => toggleFavorite(prop.id)}
									aria-pressed={favorites.includes(prop.id)}
									className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#131b2e] hover:bg-white shadow-sm transition-transform active:scale-90"
									aria-label="Save property"
								>
									<HiHeart
										className={`w-4 h-4 ${
											favorites.includes(prop.id)
												? 'text-rose-500 fill-rose-500'
												: 'text-slate-400'
										}`}
									/>
								</button>
							</div>

							<div className="p-6 flex flex-col flex-grow justify-between gap-4">
								<div>
									<div className="text-xs font-bold text-[#006194] uppercase mb-1 tracking-wide">
										{prop.area}
									</div>
									<h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] tracking-tight line-clamp-1">
										{prop.title}
									</h3>
									<div className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mt-2">
										{prop.price}{' '}
										<span className="text-xs font-normal text-[#3f4850]">
											/ month
										</span>
									</div>
								</div>

								<div className="flex flex-wrap gap-1.5 pt-2">
									{prop.tags.map((tag) => (
										<span
											key={tag}
											className="bg-[#eaedff] px-2 py-1 rounded text-xs text-[#3f4850] font-medium"
										>
											{tag}
										</span>
									))}
								</div>

								<div className="pt-4 flex items-center gap-3 border-t border-[#dae2fd]/80">
									<button
										onClick={() => navigate('/signup')}
										className="flex-1 bg-[#006194] hover:bg-[#004b73] text-white py-2.5 rounded-lg text-xs font-['Space_Grotesk'] font-bold transition-all text-center shadow-sm"
									>
										Start Application
									</button>
									<button
										onClick={() => setSelectedProperty(prop)}
										className="px-4 py-2.5 bg-[#eaedff] hover:bg-[#e2e7ff] text-[#131b2e] rounded-lg text-xs font-['Space_Grotesk'] font-bold transition-all"
									>
										Details
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
				)}

				{!loadingProperties && filteredProperties.length === 0 && (
					<div className="text-center py-16 bg-[#f2f3ff] rounded-2xl border border-[#dae2fd]">
						<p className="text-sm text-[#3f4850]">No properties found matching your filter criteria.</p>
						<button
							onClick={() => {
								setActiveCategory('All Listings')
								setActiveProvince('All SA')
								setSearchQuery('')
								setPriceFilter('any')
							}}
							className="mt-3 px-4 py-2 text-xs font-bold text-[#006194] bg-[#cce5ff] rounded-lg"
						>
							Reset Filters
						</button>
					</div>
				)}
			</section>

			{/* ===================== TRUST ECOSYSTEM BENTO GRID ===================== */}
			<section id="ecosystem" className="py-20 px-6 lg:px-12 bg-[#f2f3ff]/50 border-y border-[#dae2fd]/60 scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="text-center max-w-2xl mx-auto mb-16">
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							The Place4U Guarantee
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							Built for South African Realities
						</h2>
						<p className="text-sm sm:text-base text-[#3f4850] mt-2 font-normal leading-relaxed">
							Reducing scams, deposit exploitation, and grey-market housing risks through reviewed listings and a clear, documented process.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-12 gap-6 [&>*:nth-child(1)]:md:col-span-7 [&>*:nth-child(2)]:md:col-span-5 [&>*:nth-child(3)]:md:col-span-12">
						{/* Bento Item 1 */}
						<div className="bg-white p-8 rounded-2xl shadow-[0_16px_40px_-28px_rgba(0,97,148,0.4)] hover:shadow-[0_26px_55px_-30px_rgba(0,97,148,0.5)] transition-shadow flex flex-col justify-between border border-[#bfc7d2]/20">
							<div>
								<div className="w-12 h-12 rounded-xl bg-[#cce5ff]/50 flex items-center justify-center text-[#006194] mb-6">
									<span className="material-symbols-outlined text-[24px]">gavel</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									Ownership Document Review
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									Landlords upload proof of ownership and ID, which our team reviews before a listing goes live.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 flex items-center justify-between text-xs font-bold text-[#006194]">
								<span>Human-Reviewed Documents</span>
								<span className="material-symbols-outlined text-[18px]">check_circle</span>
							</div>
						</div>

						{/* Bento Item 2 */}
						<div className="bg-white p-8 rounded-2xl shadow-[0_16px_40px_-28px_rgba(0,97,148,0.4)] hover:shadow-[0_26px_55px_-30px_rgba(0,97,148,0.5)] transition-shadow flex flex-col justify-between border border-[#bfc7d2]/20">
							<div>
								<div className="w-12 h-12 rounded-xl bg-[#85f8c4]/50 flex items-center justify-center text-[#005137] mb-6">
									<span className="material-symbols-outlined text-[24px]">home_work</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									Township Backroom Dignity
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									Elevating backyard cottages and township rentals into quality listings with documented details and fair lease terms.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 flex items-center justify-between text-xs font-bold text-[#006c4a]">
								<span>Empowering Local Landlords</span>
								<span className="material-symbols-outlined text-[18px]">verified</span>
							</div>
						</div>

						{/* Bento Item 3 */}
						<div className="bg-white p-8 rounded-2xl shadow-[0_16px_40px_-28px_rgba(0,97,148,0.4)] hover:shadow-[0_26px_55px_-30px_rgba(0,97,148,0.5)] transition-shadow flex flex-col md:flex-row md:items-center md:gap-10 border border-[#bfc7d2]/20">
							<div className="md:flex-1 md:max-w-2xl">
								<div className="w-12 h-12 rounded-xl bg-[#cce5ff]/50 flex items-center justify-center text-[#006194] mb-6">
									<span className="material-symbols-outlined text-[24px]">block</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									One Transparent Fee — No Gouging
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									No R250 credit-check charges for phantom flats. Your single assistance fee covers vetting and introductions, with no per-listing charges and no hidden extras.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 md:mt-0 md:pt-0 md:border-t-0 md:border-l md:pl-10 flex items-center gap-2 md:flex-col md:items-start md:gap-2 text-xs font-bold text-[#006194] shrink-0">
								<span className="material-symbols-outlined text-[20px]">shield</span>
								<span>One Fee, Fully Disclosed</span>
							</div>
						</div>
					</div>

					{/* Direct WhatsApp Desk Banner */}
					<div id="whatsapp-desk" className="mt-8 scroll-mt-28 bg-gradient-to-r from-[#006194] to-[#007bb9] rounded-2xl p-8 lg:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_30px_70px_-30px_rgba(0,97,148,0.7)]">
						<div className="flex flex-col gap-3 max-w-xl">
							<div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold w-max">
								<span className="material-symbols-outlined text-[18px]">chat</span> Direct Support
							</div>
							<h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
								Need help finding digs right now? Chat with our SA WhatsApp Desk.
							</h3>
							<p className="text-sm text-white/90 leading-relaxed">
								Our support team in Joburg, Cape Town, and Durban is on hand to answer your questions and help you through the process.
							</p>
						</div>

						<a
							href="https://wa.me/27712345678?text=Hello%20Place4U%20Desk%2C%20I%20need%20help%20with%20a%20listing"
							target="_blank"
							rel="noopener noreferrer"
							className="bg-white text-[#131b2e] hover:bg-[#faf8ff] font-['Space_Grotesk'] font-bold text-sm px-8 py-4 rounded-xl shadow-lg transition-all flex items-center gap-3 whitespace-nowrap active:scale-95"
						>
							<span className="material-symbols-outlined text-[#006194]">forum</span>
							Open WhatsApp Desk
						</a>
					</div>
				</div>
			</section>

			{/* ===================== MEMBER TESTIMONIALS ===================== */}
			<section id="stories" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-24">
				<div className="text-center max-w-2xl mx-auto mb-12">
					<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
						Member Stories
					</span>
					<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
						Trusted by Students & Landlords Across Mzansi
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 [&>*:nth-child(1)]:md:col-span-7 [&>*:nth-child(2)]:md:col-span-5 [&>*:nth-child(3)]:md:col-span-12">
					{TESTIMONIALS.map((t, idx) => (
						<div
							key={idx}
							className={`p-8 rounded-2xl flex flex-col justify-between border transition-shadow ${idx === 0
								? 'bg-[#eaedff] border-[#006194]/25 shadow-[0_28px_65px_-34px_rgba(0,97,148,0.6)]'
								: 'bg-[#f2f3ff] border-[#bfc7d2]/20 shadow-[0_12px_34px_-24px_rgba(0,97,148,0.35)] hover:shadow-[0_22px_50px_-28px_rgba(0,97,148,0.45)]'}${idx === 2 ? ' md:items-center md:text-center' : ''}`}
						>
							<p className={`text-[#3f4850] italic leading-relaxed text-sm sm:text-base mb-6 ${idx === 2 ? 'md:text-lg md:max-w-3xl' : ''}`}>
								"{t.quote}"
							</p>
							<div className={`flex items-center gap-4 pt-4 border-t border-[#dae2fd]${idx === 2 ? ' justify-center' : ''}`}>
								<div className={`w-12 h-12 rounded-full ${t.bgClass} text-white flex items-center justify-center font-['Space_Grotesk'] font-bold text-base shadow-sm`}>
									{t.initials}
								</div>
								<div>
									<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#131b2e]">
										{t.name}
									</h4>
									<p className="text-xs text-[#3f4850]">{t.role}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ===================== ABOUT US / FOUNDER ===================== */}
			<section id="about" className="py-20 px-6 lg:px-12 bg-white border-t border-[#dae2fd]/60 scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="text-center max-w-2xl mx-auto mb-16">
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							About Us
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							Built by someone who lived the problem
						</h2>
						<p className="text-sm sm:text-base text-[#3f4850] mt-2 leading-relaxed">
							Place4U exists because renting in South Africa should not cost you your savings or your peace of mind.
						</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
						{/* Founder Portrait */}
						<div className="lg:col-span-5">
							<div className="relative rounded-3xl overflow-hidden shadow-[0_40px_90px_-35px_rgba(0,97,148,0.55)] bg-[#eaedff] aspect-[4/5] border border-[#dae2fd]">
								<img
									src="/Founder.png"
									alt="Jacob Molomo, Founder of Place4U"
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=85&w=1200&auto=format&fit=crop'
									}}
								/>
								<div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-[0_18px_40px_-18px_rgba(0,97,148,0.45)] border border-[#bfc7d2]/30">
									<h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e]">
										Jacob Molomo
									</h3>
									<p className="text-xs text-[#006194] font-semibold uppercase tracking-wide">
										Founder & Chief Executive
									</p>
									<a
										href="https://www.linkedin.com/in/jacob-molomo-002428242/"
										target="_blank"
										rel="noopener noreferrer"
										className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#004182] px-3.5 py-2 rounded-lg transition-all"
									>
										<FaLinkedinIn size={13} />
										Connect on LinkedIn
									</a>
								</div>
							</div>
						</div>

						{/* Story & Values */}
						<div className="lg:col-span-7 flex flex-col gap-6">
							<div className="p-7 sm:p-8 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
								<div className="flex items-center gap-3 mb-4">
									<div className="w-11 h-11 rounded-xl bg-[#cce5ff]/60 flex items-center justify-center text-[#006194]">
										<FaQuoteLeft size={16} />
									</div>
									<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
										Our Story
									</span>
								</div>
								<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed">
									Place4U was founded in <strong className="text-[#131b2e]">2026</strong> out of a frustration that every South African renter knows too well. Watching friends and family hunt for student digs and backrooms, only to meet "agents" with no mandate, listings that did not exist, and deposits that vanished with a blocked number. The turning point came when a close friend paid a R4,500 deposit on a Braamfontein flat that turned out to be a stolen photograph and a phantom landlord.
								</p>
								<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-4">
									That month, Jacob started building the fix: a marketplace where every listing is tied to an owner who has submitted proof-of-ownership and ID documents for review before a tenant ever pays a cent. What began as a handful of reviewed cottages in Johannesburg has grown into a national trust layer for student accommodation, township backrooms, and urban apartments. We are not just a listing site — we are the document-review desk between a hopeful tenant and an honest landlord.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="p-6 rounded-2xl bg-[#eaedff] border border-[#dae2fd]">
									<span className="material-symbols-outlined text-[#006194] text-[26px]">diversity_3</span>
									<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#131b2e] mt-3 mb-1">
										Why We Started
									</h4>
									<p className="text-sm text-[#3f4850] leading-relaxed">
										To end the deposit scam economy and give every renter the same protection money should not have to buy.
									</p>
								</div>
								<div className="p-6 rounded-2xl bg-[#85f8c4]/25 border border-[#68dba9]/40">
									<span className="material-symbols-outlined text-[#005137] text-[26px]">flag</span>
									<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#131b2e] mt-3 mb-1">
										Our Mission
									</h4>
									<p className="text-sm text-[#3f4850] leading-relaxed">
										Bring dignity, transparency, and documented safety to housing across Mzansi — from Soweto backrooms to Cape Town lofts.
									</p>
								</div>
							</div>

							<div className="p-7 sm:p-8 rounded-2xl bg-[#131b2e] text-white">
								<p className="text-sm sm:text-base text-white/90 leading-relaxed italic">
									"Renting a home in South Africa should feel like an opportunity, not a gamble. We built Place4U so that no student, professional, or family ever has to hand over a deposit to someone whose ownership documents we have not reviewed."
								</p>
								<p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#85f8c4]">
									— Jacob Molomo, Founder
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ===================== HOW IT WORKS / TENANT PASSPORT FLOW ===================== */}
			<section id="how-it-works" className="py-20 px-6 lg:px-12 bg-white border-t border-[#dae2fd]/60 scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="text-center max-w-2xl mx-auto mb-16">
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							How It Works
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							How Your Digital Tenant Passport Works
						</h2>
						<p className="text-sm sm:text-base text-[#3f4850] mt-2 leading-relaxed">
							Submit one application and pay a single vetting fee — then we review your details, search the market and introduce you to reviewed housing.
						</p>
					</div>

					<div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 before:hidden md:before:block before:content-[''] before:absolute before:top-7 before:left-[16%] before:right-[16%] before:h-px before:bg-gradient-to-r before:from-[#cce5ff] before:via-[#006194]/30 before:to-[#85f8c4]">
						<div className="relative flex flex-col items-center text-center">
							<div className="relative z-10 w-14 h-14 rounded-full bg-[#cce5ff] text-[#006194] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6 ring-4 ring-white">
								01
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Build Your Passport</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								Tell us once who you are and what you need — budget, preferred areas and move date — and upload your ID, proof of income or enrolment. No repeat forms for every place.
							</p>
						</div>

						<div className="relative flex flex-col items-center text-center">
							<div className="relative z-10 w-14 h-14 rounded-full bg-[#85f8c4] text-[#005137] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6 ring-4 ring-white">
								02
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Pay the One-Time Vetting Fee</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								A single, non-refundable assistance fee covers application checks, document collection and review, and coordination — with no per-listing charges.
							</p>
						</div>

						<div className="relative flex flex-col items-center text-center">
							<div className="relative z-10 w-14 h-14 rounded-full bg-[#cce5ff] text-[#006194] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6 ring-4 ring-white">
								03
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Get Matched & Introduced</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								We identify suitable reviewed housing and make a warm introduction to the landlord or the agent representing them. You take it from there and sign your lease directly with the owner.
							</p>
						</div>
					</div>

					<p className="text-xs text-[#3f4850] mt-12 max-w-2xl mx-auto text-center leading-relaxed">
						Place4U is a technology and relocation-assistance platform, not an estate agency or property practitioner. The assistance fee covers application support, screening and introductions only and is non-refundable; placement is not guaranteed, and all leases are entered into directly between landlords and tenants.
					</p>
				</div>
			</section>

			{/* ===================== DUAL CALL TO ACTION ===================== */}
			<section className="py-20 px-6 lg:px-12 bg-[#faf8ff]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="p-8 sm:p-12 rounded-3xl bg-[#eaedff] border border-[#dae2fd] flex flex-col justify-between">
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[#006194] block mb-2">
								For Students & Renters
							</span>
							<h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#131b2e] tracking-tight mb-3">
								Ready to find your next digs?
							</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed mb-8">
								Build your tenant passport with one application, pay the one-time vetting fee, and get introduced to documented cottages and student rooms near your campus or workplace.
							</p>
						</div>

						<button
							onClick={() => navigate('/signup')}
							className="w-fit bg-[#006194] hover:bg-[#004b73] text-white font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
						>
							<span>Start My Application</span>
							<HiArrowRight className="w-4 h-4" />
						</button>
					</div>

					<div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#dae2fd] shadow-sm flex flex-col justify-between">
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[#006c4a] block mb-2">
								For Property Owners
							</span>
							<h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#131b2e] tracking-tight mb-3">
								Have a room, cottage or flat to let?
							</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed mb-8">
								Fill your vacancy with pre-screened tenants. Free listing, zero scam inquiries, and direct WhatsApp scheduling.
							</p>
						</div>

						<button
							onClick={() => navigate('/signup')}
							className="w-fit bg-[#eaedff] hover:bg-[#e2e7ff] text-[#131b2e] font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl border border-[#bfc7d2]/40 transition-all flex items-center gap-2"
						>
							<span>List Your Property</span>
							<HiArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</section>

			{/* ===================== PROPERTY DETAIL MODAL ===================== */}
			<AnimatePresence>
				{selectedProperty && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
						onClick={() => setSelectedProperty(null)}
						role="dialog"
						aria-modal="true"
						aria-label={selectedProperty.title}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#dae2fd]"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="relative h-56 bg-slate-100">
								<img
									src={selectedProperty.image}
									alt={selectedProperty.title}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.src = selectedProperty.fallbackImage
									}}
								/>
								<button
									onClick={() => setSelectedProperty(null)}
									aria-label="Close"
									className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 text-[#131b2e] flex items-center justify-center shadow-md hover:bg-white"
								>
									<HiX size={18} />
								</button>
								<div className="absolute bottom-4 left-4 bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
									<span className="material-symbols-outlined text-[16px]">verified</span>
									{selectedProperty.verificationType}
								</div>
							</div>

							<div className="p-6">
								<div className="text-xs font-bold text-[#006194] uppercase tracking-wide">
									{selectedProperty.area}
								</div>
								<h3 className="font-['Space_Grotesk'] text-2xl font-bold text-[#131b2e] mt-1">
									{selectedProperty.title}
								</h3>
								<p className="text-xs text-[#006c4a] font-medium mt-1 flex items-center gap-1">
									<span className="material-symbols-outlined text-[15px]">location_on</span>
									{selectedProperty.near}
								</p>

								<div className="font-['Space_Grotesk'] text-2xl font-bold text-[#131b2e] my-3">
									{selectedProperty.price}{' '}
									<span className="text-xs font-normal text-[#3f4850]">
										/ month
									</span>
								</div>

								<div className="flex flex-wrap gap-2 my-4">
									{selectedProperty.tags.map((tag) => (
										<span
											key={tag}
											className="bg-[#eaedff] px-2.5 py-1 rounded-lg text-xs font-medium text-[#3f4850]"
										>
											{tag}
										</span>
									))}
								</div>

								<div className="p-4 bg-[#f2f3ff] rounded-xl border border-[#dae2fd] text-xs text-[#3f4850] space-y-1 mb-6">
									<p><strong>Landlord:</strong> {selectedProperty.verifiedLandlord}</p>
									<p><strong>Ownership:</strong> Documents submitted by landlord (reviewed)</p>
									<p><strong>Deposit & Lease:</strong> Agreed and signed directly with the landlord</p>
								</div>

								<div className="flex items-center gap-3">
									<button
										onClick={() => {
											setSelectedProperty(null)
											navigate('/signup')
										}}
										className="flex-1 bg-[#006194] hover:bg-[#004b73] text-white py-3 rounded-xl font-['Space_Grotesk'] font-bold text-sm shadow-md"
									>
										Start Application
									</button>
									<a
										href={`https://wa.me/27712345678?text=Hello%2C%20I%20am%20interested%20in%20${encodeURIComponent(selectedProperty.title)}%20(${selectedProperty.area})`}
										target="_blank"
										rel="noopener noreferrer"
										className="px-4 py-3 bg-[#85f8c4]/60 hover:bg-[#85f8c4] text-[#005137] rounded-xl font-['Space_Grotesk'] font-bold text-sm flex items-center gap-1.5"
									>
										<FaWhatsapp size={16} />
										WhatsApp
									</a>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ===================== FOOTER ===================== */}
			<Footer theme="light" />
		</div>
	)
}

export default Landing
