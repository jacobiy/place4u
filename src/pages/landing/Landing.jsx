// Landing.jsx - Place4U Rental Matching Marketplace
// Theme: Clean Architectural Light Mzansi (Primary: #006194, Secondary: #006c4a, Surface: #f7f8f5)
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
	FaComments
} from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import TeamSection from '../../component/TeamSection'
import { getFeaturedProperties } from './db/queries'
import { setJsonLd, buildItemListJsonLd } from '../../utils/seo'
import useHashScroll from '../../hooks/useHashScroll'

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


// Verification steps + FAQ replace the old testimonial cards.
//
// Why: the previous section attributed invented quotes to named people
// ("Thabo Mokoena, Wits University Student"). Publishing fabricated
// endorsements is actionable under the Consumer Protection Act (s41 prohibits
// false or misleading representations) and would also breach the ASA Code on
// testimonials. Nothing below is a claim about a specific customer - every
// line describes a process the platform actually runs, which is both safer and
// more persuasive.
const VERIFICATION_STEPS = [
	{
		step: '01',
		icon: 'badge',
		title: 'Identity checked',
		body: 'Landlords and agents submit identity documents for review before listing a property.'
	},
	{
		step: '02',
		icon: 'home_work',
		title: 'Ownership reviewed',
		body: 'Proof of ownership is reviewed against the property being advertised.'
	},
	{
		step: '03',
		icon: 'fact_check',
		title: 'Listing details reviewed',
		body: 'Address, rent and photos are reviewed before a listing goes live.'
	},
	{
		step: '04',
		icon: 'handshake',
		title: 'Introduced to a person',
		body: 'You are introduced to the owner or the agent representing them, so you know who to speak with.'
	}
]

const FAQS = [
	{
		q: 'Does Place4U own or manage the properties?',
		a: 'No. Place4U is a technology and relocation assistance platform, not an estate agency or property practitioner. We do not own, manage, or take responsibility for any property, and your lease is signed directly with the landlord.'
	},
	{
		q: 'What does the small application fee cover?',
		a: 'Application checks, document collection and review, and the coordination of introductions. It is charged once per application, not per property, and the amount is shown before you pay.'
	},
	{
		q: 'How do you know a listing is real?',
		a: 'A listing only goes live after the owner has submitted identity and proof of ownership documents for review. We check the documents against the property being advertised and remove listings that fail review.'
	},
	{
		q: 'Do you hold my deposit or rental payments?',
		a: 'No. Never pay a deposit through Place4U or to anyone who cannot show you the property and a signed lease. Deposits and rent are paid directly to the landlord under your lease.'
	},
	{
		q: 'Will I definitely find a place?',
		a: 'No, and no honest platform can promise that. Placement depends on your budget, area and timing. What we commit to is reviewing every listing and giving your application a named person to follow it.'
	},
	{
		q: 'Who do I speak to if something goes wrong?',
		a: 'Our WhatsApp desk is the fastest route. If a listing does not match what was advertised, report it and we will review the listing.'
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

	// The navbar and footer link to landing sections as "/#residencies" etc. from
	// other public pages (e.g. /about). React Router does not scroll to a hash,
	// so this makes those links land on the right section.
	useHashScroll()

	// Structured data for the grid that is actually on screen. Re-created when
	// the inventory (or a filter-independent fetch) changes, and removed when the
	// grid is empty, so the markup never describes listings a visitor cannot see.
	useEffect(() => {
		setJsonLd('featured-listings', buildItemListJsonLd(properties))
		return () => setJsonLd('featured-listings', null)
	}, [properties])

	// FAQPage structured data. Built from the exact same FAQS array that renders
	// the section below, so the markup can never drift from the visible copy -
	// Google requires the answer text to match what the user can actually read.
	useEffect(() => {
		setJsonLd('landing-faq', {
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: FAQS.map((item) => ({
				'@type': 'Question',
				name: item.q,
				acceptedAnswer: { '@type': 'Answer', text: item.a }
			}))
		})
		return () => setJsonLd('landing-faq', null)
	}, [])

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
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	const handleResultsScroll = () => {
		const el = document.getElementById('property-results')
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	return (
		<div
			id="landing"
			className="min-h-screen bg-[#f7f8f5] text-[#18262d] font-sans antialiased scroll-smooth selection:bg-[#006194] selection:text-white"
		>
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-[#006194] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
			>
				Skip to content
			</a>
			<Navbar />

			{/* ===================== HERO SECTION ===================== */}
			<section id="main" className="relative scroll-mt-24 pt-28 pb-16 md:pt-32 md:pb-20 px-6 lg:px-12 bg-[#f7f8f5]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
					<div className="lg:col-span-6 flex flex-col items-start gap-6">
						<p className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] text-[#006194] uppercase">
							A more considered way to rent
						</p>

						<h1 className="font-serif-display text-[2.8rem] sm:text-6xl lg:text-[4.1rem] font-normal text-[#18262d] tracking-[-0.035em] leading-[1.03]">
							One Application, <span className="font-serif-display block text-[#006194]">Unlimited Possibilities.</span>
						</h1>

						<p className="text-base sm:text-lg text-[#47545a] max-w-xl leading-relaxed">
							One application connects you to reviewed homes and the people behind them. Landlord identity and ownership documents are reviewed before a listing goes live.
						</p>

						<div className="flex flex-wrap items-center gap-3 pt-1">
							<button
								onClick={() => navigate('/signup')}
								className="inline-flex items-center justify-center gap-2 bg-[#006194] hover:bg-[#004b73] text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
							>
								Start an application
								<HiArrowRight className="w-4 h-4" />
							</button>
							<button
								onClick={handleSearchScroll}
								className="inline-flex items-center justify-center text-[#28434e] hover:text-[#006194] font-semibold text-sm px-3 py-3 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
							>
								Browse reviewed homes
								<HiArrowRight className="w-4 h-4 ml-1" />
							</button>
						</div>
					</div>

					<div className="lg:col-span-6 relative lg:pl-5">
						<div className="overflow-hidden rounded-[1.25rem] bg-[#e7eef0] aspect-[5/4] lg:aspect-[4/5] max-h-[600px]">
							<img
								src="/hero-loft.jpg"
								alt="Sunlit loft interior with city buildings visible through tall windows"
								fetchPriority="high"
								className="w-full h-full object-cover"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* ===================== HOW IT WORKS / TENANT PASSPORT FLOW ===================== */}
			<section id="how-it-works" className="py-20 px-6 lg:px-12 bg-white scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="max-w-2xl mb-12">
						<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] mt-1 tracking-tight">
							One application. Three clear steps.
						</h2>
						<p className="text-sm sm:text-base text-[#47545a] mt-2 leading-relaxed">
							Submit one application, then we review your details and look for reviewed housing that fits.
						</p>
					</div>

					<ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<li className="pt-5 border-t border-[#c3cecd]">
							<p className="text-xs font-semibold tracking-[0.12em] text-[#006194]">01</p>
							<h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#18262d] mt-3 mb-2">Tell us what you need</h3>
							<p className="text-sm text-[#47545a] leading-relaxed">Share your budget, preferred areas and move date. Upload your ID and supporting documents once.</p>
						</li>
						<li className="pt-5 border-t border-[#c3cecd]">
							<p className="text-xs font-semibold tracking-[0.12em] text-[#006194]">02</p>
							<h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#18262d] mt-3 mb-2">We review your application</h3>
							<p className="text-sm text-[#47545a] leading-relaxed">A small assistance fee covers application checks, document review and introductions. It is fully refundable if no placement is made.</p>
						</li>
						<li className="pt-5 border-t border-[#c3cecd]">
							<p className="text-xs font-semibold tracking-[0.12em] text-[#006194]">03</p>
							<h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#18262d] mt-3 mb-2">Meet the landlord or agent</h3>
							<p className="text-sm text-[#47545a] leading-relaxed">We make an introduction when there is a suitable fit. Any lease is signed directly with the landlord.</p>
						</li>
					</ol>

					<p className="text-xs text-[#47545a] mt-12 max-w-2xl mx-auto text-center leading-relaxed">
					Place4U is a technology and relocation assistance platform, not an estate agency or property practitioner. A small fee covers application support, screening and introductions only. It is fully refundable if no placement is made. Placement is not guaranteed, and leases are signed directly between landlords and tenants.
					</p>
				</div>
			</section>

			{/* ===================== PROPERTIES GRID ===================== */}
				<section id="residencies" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-24">
				<div className="max-w-2xl mb-9">
					<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight">
						Reviewed homes, in real places
					</h2>
					<p className="text-sm sm:text-base text-[#47545a] mt-3 leading-relaxed">
						Browse current listings, then start one application when you find a fit.
					</p>
				</div>

				<div className="border-y border-[#d5e0df] py-5 mb-8">
					<div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filter by property type">
						{CATEGORIES.map((cat) => (
							<button
								key={cat}
								type="button"
								aria-pressed={activeCategory === cat}
								onClick={() => setActiveCategory(cat)}
								className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194] ${
									activeCategory === cat
										? 'bg-[#006194] text-white'
										: 'bg-[#e7eef0] text-[#28434e] hover:bg-[#dce8e9]'
								}`}
							>
								{cat}
							</button>
						))}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="listing-location" className="text-xs font-semibold text-[#47545a]">Location</label>
							<div className="flex items-center gap-2 bg-white px-3.5 py-3 rounded-lg border border-[#c3cecd] focus-within:border-[#006194] focus-within:ring-2 focus-within:ring-[#006194]/15 transition-colors">
								<span className="material-symbols-outlined text-[#006194] text-[20px]" aria-hidden="true">location_on</span>
								<input
									id="listing-location"
									type="search"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Suburb, city or university"
									className="bg-transparent w-full text-sm focus:outline-none text-[#18262d] placeholder-[#707881]"
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1.5 relative" ref={priceDropdownRef}>
							<span className="text-xs font-semibold text-[#47545a]">Monthly budget</span>
							<button
								type="button"
								onClick={() => setPriceDropdownOpen((prev) => !prev)}
								aria-expanded={priceDropdownOpen}
								aria-haspopup="listbox"
								className={`flex items-center justify-between gap-2 bg-white px-3.5 py-3 rounded-lg border transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-[#006194]/20 ${
									priceDropdownOpen ? 'border-[#006194]' : 'border-[#c3cecd] hover:border-[#006194]'
								}`}
							>
								<span className="text-sm font-medium text-[#18262d] truncate">
									{PRICE_OPTIONS.find((opt) => opt.value === priceFilter)?.label || 'Any price'}
								</span>
								<HiChevronDown className={`w-4 h-4 text-[#707881] transition-transform duration-200 flex-shrink-0 ${priceDropdownOpen ? 'rotate-180' : ''}`} />
							</button>
							<AnimatePresence>
								{priceDropdownOpen && (
									<motion.div
										initial={{ opacity: 0, y: -4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -4 }}
										transition={{ duration: 0.12, ease: 'easeOut' }}
										className="absolute top-[calc(100%+6px)] left-0 w-full min-w-[220px] bg-white border border-[#d5e0df] rounded-lg shadow-[0_12px_32px_-20px_rgba(24,55,65,0.45)] p-1.5 z-50 overflow-hidden"
										role="listbox"
										aria-label="Monthly budget"
									>
										{PRICE_OPTIONS.map((opt) => {
											const isSelected = priceFilter === opt.value
											return (
												<button
													key={opt.value}
													type="button"
													role="option"
													aria-selected={isSelected}
													onClick={() => {
														setPriceFilter(opt.value)
														setPriceDropdownOpen(false)
													}}
													className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
														isSelected ? 'bg-[#e7eef0] text-[#006194] font-semibold' : 'text-[#47545a] hover:bg-[#f2f5f2]'
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

						<button
							type="button"
							onClick={handleResultsScroll}
							className="inline-flex items-center justify-center gap-2 bg-[#006194] hover:bg-[#004b73] text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
						>
							<HiArrowRight className="w-4 h-4" />
							Show homes
						</button>
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
						<span className="text-[#707881]">Try an area</span>
						{QUICK_LOCATIONS.map((loc) => (
							<button
								key={loc}
								type="button"
								onClick={() => setSearchQuery(loc.split(' ')[0])}
								className="text-[#28434e] underline underline-offset-4 decoration-[#c3cecd] hover:text-[#006194] hover:decoration-[#006194] transition-colors"
							>
								{loc}
							</button>
						))}
					</div>
				</div>

				<div className="flex flex-wrap gap-2 mb-8" aria-label="Filter by province">
					{provinceOptions.map((prov) => (
						<button
							key={prov}
							type="button"
							aria-pressed={activeProvince === prov}
							onClick={() => setActiveProvince(prov)}
							className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors duration-200 ${
								activeProvince === prov ? 'bg-[#dce8e9] text-[#18262d]' : 'bg-transparent text-[#47545a] hover:bg-[#e7eef0]'
							}`}
						>
							{prov}
						</button>
					))}
				</div>

				{/* Property Cards */}
				{loadingProperties && (
									<div id="property-results" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 scroll-mt-28">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="bg-[#eef2ef] rounded-2xl overflow-hidden border border-[#d5e0df]/60 animate-pulse"
							>
								<div className="aspect-[16/10] bg-[#d5e0df]" />
								<div className="p-6 space-y-3">
									<div className="h-3 w-1/3 rounded bg-[#d5e0df]" />
									<div className="h-5 w-2/3 rounded bg-[#d5e0df]" />
									<div className="h-6 w-1/2 rounded bg-[#d5e0df]" />
								</div>
							</div>
						))}
					</div>
				)}

				{!loadingProperties && (
					<div id="property-results" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 scroll-mt-28">
					{filteredProperties.map((prop) => (
						<div
							key={prop.id}
							className="bg-white rounded-xl overflow-hidden transition-[border-color,transform] duration-200 flex flex-col group border border-[#d5e0df] hover:border-[#86c1cc] hover:-translate-y-1"
						>
							<div className="relative aspect-[16/10] overflow-hidden bg-[#e7eef0]">
								<img
									src={prop.image}
									alt={prop.title}
									loading="lazy"
									decoding="async"
									className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-300"
									onError={(e) => {
										e.target.src = prop.fallbackImage
									}}
								/>

								<button
									onClick={() => toggleFavorite(prop.id)}
									aria-pressed={favorites.includes(prop.id)}
									className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-[#18262d] hover:bg-white transition-transform active:scale-90"
									aria-label={favorites.includes(prop.id) ? 'Remove saved property' : 'Save property'}
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
									<div className="text-xs font-semibold text-[#006194] mb-1">
										{prop.area}
									</div>
									<h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#18262d] tracking-tight line-clamp-1">
										{prop.title}
									</h3>
									<p className="text-xs text-[#5d6d72] mt-1 inline-flex items-center gap-1.5">
										<HiShieldCheck className="w-3.5 h-3.5 text-[#006c4a]" />
										{prop.status}
									</p>
									<div className="font-['Space_Grotesk'] text-xl font-bold text-[#18262d] mt-2">
										{prop.price}{' '}
										<span className="text-xs font-normal text-[#47545a]">
											/ month
										</span>
									</div>
								</div>

								<div className="flex flex-wrap gap-1.5 pt-2">
									{prop.tags.map((tag) => (
										<span
											key={tag}
											className="bg-[#eef2ef] px-2.5 py-1 rounded-md text-xs text-[#47545a] font-medium"
										>
											{tag}
										</span>
									))}
								</div>

								<div className="pt-4 flex items-center gap-3 border-t border-[#d5e0df]">
									<button
										onClick={() => navigate('/signup')}
										className="flex-1 bg-[#006194] hover:bg-[#004b73] text-white py-2.5 rounded-lg text-xs font-['Space_Grotesk'] font-bold transition-all text-center shadow-sm"
									>
										Start Application
									</button>
									<button
										onClick={() => setSelectedProperty(prop)}
										className="px-4 py-2.5 bg-[#e7eef0] hover:bg-[#dce8e9] text-[#18262d] rounded-lg text-xs font-['Space_Grotesk'] font-bold transition-all"
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
					<div className="py-12 px-6 bg-white rounded-xl border border-[#d5e0df]">
						<h3 className="font-serif-display text-2xl text-[#18262d]">
							{properties.length === 0 ? 'No reviewed homes are available just yet.' : 'No homes match these filters.'}
						</h3>
						<p className="text-sm text-[#47545a] mt-2 max-w-lg">
							{properties.length === 0
								? 'New listings will appear here after they pass review. You can still start an application and tell us what you need.'
								: 'Try another area or clear your filters to see all current reviewed listings.'}
						</p>
						{properties.length > 0 && <button
							onClick={() => {
								setActiveCategory('All Listings')
								setActiveProvince('All SA')
								setSearchQuery('')
								setPriceFilter('any')
							}}
							className="mt-5 px-4 py-2.5 text-sm font-semibold text-[#006194] bg-[#e7eef0] hover:bg-[#dce8e9] rounded-lg transition-colors"
						>
							Reset filters
						</button>}
					</div>
				)}
			</section>

			{/* ===================== VERIFICATION (replaces fabricated testimonials) ===================== */}
			<section id="verification" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-24">
				<div className="max-w-2xl mb-12">
					<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight">
						What we review before an introduction
					</h2>
					<p className="text-sm sm:text-base text-[#47545a] mt-2 leading-relaxed">
						A listing goes through a human review before it appears in the matching process.
					</p>
				</div>

				<ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-7 gap-y-8">
					{VERIFICATION_STEPS.map((s) => (
						<li
							key={s.step}
							className="pt-5 border-t border-[#c3cecd]"
						>
							<p className="text-xs font-semibold tracking-[0.12em] text-[#006194]">{s.step}</p>
							<h3 className="font-['Space_Grotesk'] text-base font-semibold text-[#18262d] mt-3 mb-1.5">
								{s.title}
							</h3>
							<p className="text-sm text-[#47545a] leading-relaxed">{s.body}</p>
						</li>
					))}
				</ol>

				<div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-y border-[#b7d5c9]">
					<div className="flex items-start gap-3">
						<HiShieldCheck className="w-5 h-5 text-[#006c4a] flex-shrink-0 mt-0.5" />
						<p className="text-sm text-[#47545a] leading-relaxed">
							<strong className="text-[#18262d]">We never hold rent or deposits.</strong>{' '}
							Pay these directly to the landlord after viewing the property and signing a lease.
						</p>
					</div>
					<Link
						to="/compliance"
						className="flex-shrink-0 text-xs font-bold uppercase tracking-wider text-[#005137] hover:text-[#006c4a] underline underline-offset-4 decoration-[#b7d5c9]"
					>
						Read our compliance notice
					</Link>
				</div>
			</section>

			{/* ===================== LEADERSHIP / TEAM ===================== */}
			<TeamSection className="border-t border-[#d5e0df]/60" />

			{/* ===================== FAQ ===================== */}
			<section id="faq" className="py-20 px-6 lg:px-12 bg-white scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="max-w-2xl mb-12">
						<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight">
							Answers before you apply
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
						{FAQS.map((item) => (
							<article key={item.q} className="pt-4 border-t border-[#d5e0df]">
								<h3 className="font-['Space_Grotesk'] text-base sm:text-lg font-semibold text-[#18262d] leading-snug">
									{item.q}
								</h3>
								<p className="text-sm text-[#47545a] leading-relaxed mt-2">{item.a}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* ===================== DUAL CALL TO ACTION ===================== */}
			<section className="py-20 px-6 lg:px-12 bg-[#f7f8f5]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
					<div className="lg:col-span-7 p-8 sm:p-10 rounded-xl bg-[#e7eef0] flex flex-col justify-between">
						<div>
							<p className="text-sm font-semibold text-[#006194] mb-3">
								For renters
							</p>
							<h3 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight mb-3">
								Ready to find your next digs?
							</h3>
							<p className="text-sm text-[#47545a] leading-relaxed mb-8">
								Tell us what you are looking for in one application. We will review your details and look for a suitable introduction.
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

					<div className="lg:col-span-5 p-8 sm:p-10 rounded-xl bg-white border border-[#d5e0df] flex flex-col justify-between">
						<div>
							<p className="text-sm font-semibold text-[#006c4a] mb-3">For property owners</p>
							<h3 className="font-serif-display text-2xl sm:text-3xl font-normal text-[#18262d] tracking-tight mb-3">
								Have a room, cottage or flat to let?
							</h3>
							<p className="text-sm text-[#47545a] leading-relaxed mb-8">
								Submit your property for review and connect with renters looking for a place like yours.
							</p>
						</div>

						<button
							onClick={() => navigate('/signup')}
							className="w-fit bg-[#e7eef0] hover:bg-[#dce8e9] text-[#18262d] font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl border border-[#c3cecd]/40 transition-all flex items-center gap-2"
						>
							<span>List Your Property</span>
							<HiArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</section>

			{/* ===================== WHATSAPP SUPPORT ===================== */}
			<section id="whatsapp-desk" className="px-6 lg:px-12 py-8 bg-white scroll-mt-24">
				<div className="max-w-7xl mx-auto">
					<div className="bg-[#d6e7ec] rounded-xl p-8 lg:p-10 text-[#18262d] flex flex-col md:flex-row items-center justify-between gap-8">
						<div className="flex flex-col gap-3 max-w-xl">
							<div className="inline-flex items-center gap-2 text-xs font-semibold w-max text-[#006194]">
								<span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp support
							</div>
							<h3 className="font-serif-display text-2xl sm:text-3xl font-normal text-[#18262d] tracking-tight leading-snug">
								Have a question about a listing or your application?
							</h3>
							<p className="text-sm text-[#47545a] leading-relaxed">
								Talk to the Place4U team about the next step.
							</p>
						</div>

						<a
							href="https://wa.me/27824822611?text=Hello%20Place4U%20Desk%2C%20I%20need%20help%20with%20a%20listing"
							target="_blank"
							rel="noopener noreferrer"
							className="bg-[#006194] text-white hover:bg-[#004b73] font-semibold text-sm px-6 py-3.5 rounded-lg transition-colors flex items-center gap-3 whitespace-nowrap active:scale-[0.98]"
						>
							<span className="material-symbols-outlined text-[#006194]">forum</span>
							Message us on WhatsApp
						</a>
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
							className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d5e0df]"
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
									className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 text-[#18262d] flex items-center justify-center shadow-md hover:bg-white"
								>
									<HiX size={18} />
								</button>
							</div>

							<div className="p-6">
								<div className="text-xs font-bold text-[#006194] uppercase tracking-wide">
									{selectedProperty.area}
								</div>
								<h3 className="font-['Space_Grotesk'] text-2xl font-bold text-[#18262d] mt-1">
									{selectedProperty.title}
								</h3>
								<p className="text-xs text-[#5d6d72] mt-1 inline-flex items-center gap-1.5">
									<HiShieldCheck className="w-3.5 h-3.5 text-[#006c4a]" />
									{selectedProperty.verificationType}
								</p>
								<p className="text-xs text-[#006c4a] font-medium mt-1 flex items-center gap-1">
									<span className="material-symbols-outlined text-[15px]">location_on</span>
									{selectedProperty.near}
								</p>

								<div className="font-['Space_Grotesk'] text-2xl font-bold text-[#18262d] my-3">
									{selectedProperty.price}{' '}
									<span className="text-xs font-normal text-[#47545a]">
										/ month
									</span>
								</div>

								<div className="flex flex-wrap gap-2 my-4">
									{selectedProperty.tags.map((tag) => (
										<span
											key={tag}
											className="bg-[#e7eef0] px-2.5 py-1 rounded-lg text-xs font-medium text-[#47545a]"
										>
											{tag}
										</span>
									))}
								</div>

								<div className="p-4 bg-[#eef2ef] rounded-xl border border-[#d5e0df] text-xs text-[#47545a] space-y-1 mb-6">
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
										href={`https://wa.me/27824822611?text=Hello%2C%20I%20am%20interested%20in%20${encodeURIComponent(selectedProperty.title)}%20(${selectedProperty.area})`}
										target="_blank"
										rel="noopener noreferrer"
										className="px-4 py-3 bg-[#cfe6dd]/60 hover:bg-[#cfe6dd] text-[#005137] rounded-xl font-['Space_Grotesk'] font-bold text-sm flex items-center gap-1.5"
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
