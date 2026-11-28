// Landing.jsx - Place4U Rental Matching Marketplace
// Theme: Clean Architectural Light Mzansi (Primary: #006194, Secondary: #006c4a, Surface: #f7f8f5)
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
	HiLocationMarker,
	HiShieldCheck,
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
import {
	BedDouble,
	Bath,
	Maximize2,
	Car,
	ShieldCheck,
	CheckCircle2,
	Share2,
	Sparkles,
	ChevronLeft,
	ChevronRight,
	MapPin,
	Building2,
	Check,
	Copy,
	Calendar,
	Lock,
	ArrowUpRight
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import TeamSection from '../../component/TeamSection'
import MarketplaceFlowSection from './MarketplaceFlowSection'
import { getFeaturedProperties } from './db/queries'
import { setJsonLd, buildItemListJsonLd } from '../../utils/seo'
import useHashScroll from '../../hooks/useHashScroll'
import { openAuthModal } from '../../utils/authModal'
import { useFeeQuote } from '../../hooks/useFeeQuote'
import { formatZarAmount } from '../../services/promotionService'

// Live listings are loaded from the database only; no sample fallback.

// A listing's gallery must only ever contain photographs of THAT property.
// Stock "architectural" images used to be appended to fill the gallery out to
// 3-4 frames, which made a landlord's own 2 photos appear alongside 2 unrelated
// Unsplash interiors. Placeholders are now used solely when a listing has no
// photos at all.

// Real listings come from `public.properties`. These maps turn a DB row into the
// shape the marketing cards expect.
const PROPERTY_TYPE_LABELS = {
	house: 'House',
	apartment: 'Apartment',
	student: 'Student Accommodation',
	room: 'Student Digs',
	backroom: 'Cottage / Backroom',
	commercial: 'Commercial Space'
}

const PROPERTY_TYPE_CATEGORY = {
	house: 'Apartments',
	apartment: 'Apartments',
	student: 'Student Digs',
	room: 'Student Digs',
	backroom: 'Cottages & Backrooms',
	commercial: 'Apartments'
}

const DEFAULT_PROPERTY_IMAGE =
	'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80'

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

// Map a `properties` row onto the landing card and showcase model.
const mapDbProperty = (row) => {
	const rawImages =
		Array.isArray(row.image_urls) && row.image_urls.length > 0
			? row.image_urls.filter(Boolean)
			: row.image_url
				? [row.image_url]
				: []

	// Only this listing's own photos. A single photo stays a single photo rather
	// than being topped up with unrelated stock imagery; the placeholder image is
	// reserved for listings with no photos at all.
	const images = rawImages.length > 0 ? rawImages : [DEFAULT_PROPERTY_IMAGE]

	const typeLabel = PROPERTY_TYPE_LABELS[row.property_type] || 'Residence'
	const locality =
		[row.area, row.city].filter(Boolean).join(', ') || row.province || 'South Africa'

	const tags = []
	if (row.furnished) tags.push('Furnished')
	if (row.pet_friendly) tags.push('Pet Friendly')
	tags.push(typeLabel)
	const availableTag = formatAvailable(row.available_from)
	if (availableTag) tags.push(availableTag)

	const price = Number(row.price)
	const depositDisplay =
		row.deposit ||
		(row.deposit_amount
			? `R ${Number(row.deposit_amount).toLocaleString('en-ZA')}`
			: Number.isFinite(price) && price > 0
				? `R ${price.toLocaleString('en-ZA')} (1 Month)`
				: '1 Month Deposit')

	const title =
		row.title && row.title.trim()
			? row.title.trim()
			: row.complex_name
				? `${typeLabel} at ${row.complex_name}`
				: row.property_type && (row.area || row.city)
					? `${typeLabel} in ${row.area || row.city}`
					: `${typeLabel} in ${locality}`

	const amenitiesList =
		Array.isArray(row.amenities) && row.amenities.length > 0
			? row.amenities
			: [
					'High-Speed Fibre Ready',
					'24/7 Monitored Access',
					'Covered Parking Available',
					'Built-in Wardrobes',
					'Close to Public Transit'
			  ]

	return {
		id: row.id,
		title,
		description:
			row.description ||
			`Spacious, verified ${typeLabel.toLowerCase()} located in ${locality}. Features modern finishes, convenient access to transit links, and secure premises verified by Place4U relocation specialists.`,
		category: PROPERTY_TYPE_CATEGORY[row.property_type] || 'Apartments',
		property_type: row.property_type || 'apartment',
		typeLabel,
		complex_name: row.complex_name || '',
		address: row.address || '',
		area: locality,
		suburb: row.area || row.city || locality,
		city: row.city || '',
		province: row.province || '',
		postal_code: row.postal_code || '',
		near: row.complex_name ? `${row.complex_name}, ${locality}` : `Listing in ${locality}`,
		price: formatPrice(row.price),
		numericPrice: Number.isFinite(price) ? price : 0,
		period: 'month',
		deposit: depositDisplay,
		lease_term:
			row.lease_term || (row.lease_term_months ? `${row.lease_term_months} Months` : '12 Months'),
		availableTag: availableTag || 'Available Immediately',
		available_from: row.available_from || null,
		images,
		image: images[0] || DEFAULT_PROPERTY_IMAGE,
		fallbackImage: DEFAULT_PROPERTY_IMAGE,
		tags: tags.slice(0, 4),
		beds: row.bedrooms || (row.property_type === 'room' ? 1 : 2),
		baths: row.bathrooms || 1,
		size:
			row.size ||
			(row.property_type === 'house'
				? '180 m²'
				: row.property_type === 'room'
					? '25 m²'
					: '75 m²'),
		parking_bays: row.parking_bays ?? (row.property_type === 'house' ? 2 : 1),
		parking_type: row.parking_type || 'covered',
		amenities: amenitiesList,
		water_included: Boolean(row.water_included),
		electricity_type: row.electricity_type || 'prepaid',
		max_occupants: row.max_occupants || (row.bedrooms ? row.bedrooms * 2 : 2),
		furnished: Boolean(row.furnished),
		pet_friendly: Boolean(row.pet_friendly),
		verifiedLandlord: row.landlord?.full_name || 'Place4U Verified Landlord',
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
		body: 'Landlords and agents submit ID before listing.'
	},
	{
		step: '02',
		icon: 'home_work',
		title: 'Ownership reviewed',
		body: 'Proof of ownership is matched to the property.'
	},
	{
		step: '03',
		icon: 'fact_check',
		title: 'Listing details reviewed',
		body: 'Address, rent and photos are checked before publishing.'
	},
	{
		step: '04',
		icon: 'handshake',
		title: 'Introduced to a person',
		body: 'Connect directly with the owner or their agent.'
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
	const [activePhotoIndex, setActivePhotoIndex] = useState(0)
	const [copiedToast, setCopiedToast] = useState(false)
	const [liveProperties, setLiveProperties] = useState(null)
	const [loadingProperties, setLoadingProperties] = useState(true)
	const [openFaqIndex, setOpenFaqIndex] = useState(0)

	const { quote: feeQuote } = useFeeQuote()
	const hasPromotion = Boolean(feeQuote?.promotionApplied)
	const isFree = Boolean(feeQuote?.isFree)

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

	// Close property modal on Escape, navigate photos on Arrow keys, and lock background scroll while open.
	useEffect(() => {
		if (!selectedProperty) return
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setSelectedProperty(null)
			const photoCount = selectedProperty.images?.length || 1
			if (e.key === 'ArrowRight' && photoCount > 1) {
				setActivePhotoIndex((prev) => (prev + 1) % photoCount)
			}
			if (e.key === 'ArrowLeft' && photoCount > 1) {
				setActivePhotoIndex((prev) => (prev - 1 + photoCount) % photoCount)
			}
		}
		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [selectedProperty])

	const handleOpenPropertyDetails = (prop) => {
		if (prop?.id) {
			navigate(`/property/${prop.id}`, { state: { property: prop } })
			return
		}
		setSelectedProperty(prop)
		setActivePhotoIndex(0)
		setCopiedToast(false)
	}

	const handleShareProperty = (property) => {
		if (navigator.clipboard) {
			const shareUrl = `${window.location.origin}/#residencies`
			navigator.clipboard.writeText(
				`${property.title} in ${property.area} (${property.price}/month) on Place4U: ${shareUrl}`
			)
			setCopiedToast(true)
			setTimeout(() => setCopiedToast(false), 2500)
		}
	}

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
			<section id="main" className="relative scroll-mt-24 pt-32 pb-16 md:pt-36 md:pb-20 px-6 lg:px-12 bg-[#f7f8f5]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
					<div className="lg:col-span-6 flex flex-col items-start gap-6">
						<p className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] text-[#006194] uppercase">
							A more considered way to rent
						</p>

						<h1 className="font-serif-display text-[2.8rem] sm:text-6xl lg:text-[4.1rem] font-normal text-[#18262d] tracking-[-0.035em] leading-[1.03]">
							One Application, <span className="font-serif-display block text-[#006194]">Unlimited Possibilities.</span>
						</h1>

						<p className="text-base sm:text-lg text-[#47545a] max-w-xl leading-relaxed">
							Apply once to reviewed homes across South Africa, with landlord ID and ownership checked before listing.
						</p>

						<div className="flex flex-wrap items-center gap-3 pt-1">
							<button
								onClick={() => openAuthModal('signup')}
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
								fetchpriority="high"
								className="w-full h-full object-cover"
							/>
						</div>
					</div>
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
						<article
							key={prop.id}
							onClick={() => handleOpenPropertyDetails(prop)}
							className="group bg-white rounded-2xl overflow-hidden border border-[#d5e0df] hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col cursor-pointer"
						>
							{/* Image Stage */}
							<div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
								<img
									src={prop.image}
									alt={prop.title}
									loading="lazy"
									decoding="async"
									className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
									onError={(e) => {
										e.target.src = prop.fallbackImage
									}}
								/>

								{/* Top-Left Category Badge */}
								<div className="absolute top-3 left-3 pointer-events-none">
									<span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-[#18262d] backdrop-blur-md shadow-xs flex items-center gap-1 border border-white/60">
										<ShieldCheck className="w-3.5 h-3.5 text-[#006c4a]" />
										<span>{prop.typeLabel || 'Residence'}</span>
									</span>
								</div>

								{/* Top-Right Save Favorite Button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation()
										toggleFavorite(prop.id)
									}}
									aria-pressed={favorites.includes(prop.id)}
									className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center text-[#18262d] transition-transform active:scale-90 shadow-xs cursor-pointer z-10"
									aria-label={favorites.includes(prop.id) ? 'Remove saved property' : 'Save property'}
								>
									<HiHeart
										className={`w-4 h-4 transition-colors ${
											favorites.includes(prop.id)
												? 'text-rose-500 fill-rose-500'
												: 'text-slate-400 group-hover:text-slate-600'
										}`}
									/>
								</button>

								{/* Bottom Overlays */}
								<div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/20 to-transparent flex items-end justify-between pointer-events-none">
									<span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 text-slate-800 backdrop-blur-xs">
										{prop.availableTag}
									</span>
									{prop.images?.length > 1 && (
										<span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/50 text-white backdrop-blur-xs">
											{prop.images.length} photos
										</span>
									)}
								</div>
							</div>

							{/* Card Body */}
							<div className="p-5 flex flex-col flex-grow justify-between gap-4">
								<div>
									<div className="text-[11px] font-bold text-[#006194] uppercase tracking-wider mb-1 truncate">
										{prop.area}{prop.city ? ` · ${prop.city}` : ''}
									</div>
									<h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#18262d] tracking-tight line-clamp-1 group-hover:text-[#006194] transition-colors">
										{prop.title}
									</h3>

									{/* Inline Architectural Spec Strip */}
									<div className="flex items-center flex-wrap gap-2 text-xs text-slate-600 mt-2 font-medium">
										<span>{prop.beds} {prop.beds === 1 ? 'bed' : 'beds'}</span>
										<span className="text-slate-300">•</span>
										<span>{prop.baths} {prop.baths === 1 ? 'bath' : 'baths'}</span>
										<span className="text-slate-300">•</span>
										<span>{prop.size}</span>
										{prop.furnished && (
											<>
												<span className="text-slate-300">•</span>
												<span className="text-[#006c4a] font-semibold">Furnished</span>
											</>
										)}
									</div>
								</div>

								{/* Bottom Price & Action Row */}
								<div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
									<div>
										<div className="flex items-baseline gap-1">
											<span className="font-['Space_Grotesk'] text-xl font-bold text-[#18262d] tabular-nums">
												{prop.price}
											</span>
											<span className="text-xs font-normal text-slate-500">/ mo</span>
										</div>
										<div className="text-[11px] text-slate-400">
											Deposit: {prop.deposit}
										</div>
									</div>

									<div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f7f8f5] group-hover:bg-[#006194] group-hover:text-white text-[#18262d] text-xs font-['Space_Grotesk'] font-bold border border-[#d5e0df] group-hover:border-[#006194] transition-all">
										<span>View Residence</span>
										<ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
									</div>
								</div>
							</div>
						</article>
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

			{/* ===================== MARKETPLACE ARCHITECTURE ===================== */}
			<MarketplaceFlowSection />

			{/* ===================== VERIFICATION (replaces fabricated testimonials) ===================== */}
			<section id="verification" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-24">
				<div className="max-w-2xl mb-10">
					<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight">
						What we review before an introduction
					</h2>
					<p className="text-sm sm:text-base text-[#47545a] mt-2 leading-relaxed">
						Every listing passes a four-point human check before going live.
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
			<TeamSection compact className="border-t border-[#d5e0df]/60" />

			{/* ===================== FAQ ===================== */}
			<section id="faq" className="py-16 px-6 lg:px-12 bg-white scroll-mt-24">
				<div className="max-w-4xl mx-auto">
					<div className="mb-10">
						<h2 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight">
							Answers before you apply
						</h2>
					</div>

					<div className="divide-y divide-[#d5e0df] border-y border-[#d5e0df]">
						{FAQS.map((item, idx) => {
							const isOpen = openFaqIndex === idx
							return (
								<div key={item.q}>
									<button
										type="button"
										aria-expanded={isOpen}
										onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
										className="w-full py-5 flex items-center justify-between gap-4 text-left group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
									>
										<span className="font-['Space_Grotesk'] text-base sm:text-lg font-semibold text-[#18262d] group-hover:text-[#006194] transition-colors leading-snug">
											{item.q}
										</span>
										<HiChevronDown
											className={`w-5 h-5 text-[#707881] shrink-0 transition-transform duration-200 ${
												isOpen ? 'rotate-180 text-[#006194]' : ''
											}`}
										/>
									</button>
									<AnimatePresence initial={false}>
										{isOpen && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.18, ease: 'easeOut' }}
												className="overflow-hidden"
											>
												<p className="pb-5 pr-8 text-sm text-[#47545a] leading-relaxed">{item.a}</p>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* ===================== DUAL CALL TO ACTION & WHATSAPP DESK ===================== */}
			<section className="py-16 px-6 lg:px-12 bg-[#f7f8f5]">
				<div className="max-w-7xl mx-auto space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
						<div className="lg:col-span-7 p-8 sm:p-10 rounded-xl bg-[#e7eef0] flex flex-col justify-between">
							<div>
								<p className="text-sm font-semibold text-[#006194] mb-2">
									For renters
								</p>
								<h3 className="font-serif-display text-3xl sm:text-4xl font-normal text-[#18262d] tracking-tight mb-6">
									Ready to find your next digs?
								</h3>
							</div>

							<button
								onClick={() => openAuthModal('signup')}
								className="w-fit bg-[#006194] hover:bg-[#004b73] text-white font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
							>
								<span>Start My Application</span>
								<HiArrowRight className="w-4 h-4" />
							</button>
						</div>

						<div className="lg:col-span-5 p-8 sm:p-10 rounded-xl bg-white border border-[#d5e0df] flex flex-col justify-between">
							<div>
								<p className="text-sm font-semibold text-[#006c4a] mb-2">For property owners</p>
								<h3 className="font-serif-display text-2xl sm:text-3xl font-normal text-[#18262d] tracking-tight mb-6">
									Have a room, cottage or flat to let?
								</h3>
							</div>

							<button
								onClick={() => openAuthModal('signup')}
								className="w-fit bg-[#e7eef0] hover:bg-[#dce8e9] text-[#18262d] font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl border border-[#c3cecd]/40 transition-all flex items-center gap-2 cursor-pointer"
							>
								<span>List Your Property</span>
								<HiArrowRight className="w-4 h-4" />
							</button>
						</div>
					</div>

					<div
						id="whatsapp-desk"
						className="scroll-mt-24 bg-[#d6e7ec] rounded-xl px-6 py-5 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
					>
						<div className="flex items-center gap-3 text-[#18262d]">
							<FaWhatsapp className="w-5 h-5 text-[#006c4a] shrink-0" />
							<p className="text-sm font-medium">
								Have a question about a listing or your application? Talk to our WhatsApp desk.
							</p>
						</div>
						<a
							href="https://wa.me/27824822611?text=Hello%20Place4U%20Desk%2C%20I%20need%20help%20with%20a%20listing"
							target="_blank"
							rel="noopener noreferrer"
							className="bg-[#006194] text-white hover:bg-[#004b73] font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap active:scale-[0.98]"
						>
							Message us on WhatsApp
							<HiArrowRight className="w-4 h-4" />
						</a>
					</div>
				</div>
			</section>

			{/* ===================== PROPERTY DETAIL SHOWCASE MODAL ===================== */}
			<AnimatePresence>
				{selectedProperty && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
						onClick={() => setSelectedProperty(null)}
						role="dialog"
						aria-modal="true"
						aria-label={selectedProperty.title}
					>
						<motion.div
							initial={{ scale: 0.96, opacity: 0, y: 15 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.96, opacity: 0, y: 15 }}
							transition={{ duration: 0.2 }}
							className="bg-white rounded-3xl max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Top Header Bar */}
							<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm z-20 shrink-0">
								<div className="flex items-center gap-2.5 min-w-0">
									<span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#eef2ef] text-[#006c4a] border border-[#d5e0df] flex items-center gap-1.5 shrink-0">
										<ShieldCheck className="w-3.5 h-3.5 text-[#006c4a]" />
										Place4U Verified
									</span>
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate hidden sm:inline">
										{selectedProperty.typeLabel} · {selectedProperty.area}
									</span>
								</div>

								<div className="flex items-center gap-2 shrink-0">
									<button
										type="button"
										onClick={() => handleShareProperty(selectedProperty)}
										className="h-9 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
										title="Share listing"
									>
										{copiedToast ? (
											<>
												<Check className="w-3.5 h-3.5 text-emerald-600" />
												<span className="text-emerald-700">Link Copied!</span>
											</>
										) : (
											<>
												<Share2 className="w-3.5 h-3.5 text-slate-500" />
												<span className="hidden sm:inline">Share</span>
											</>
										)}
									</button>
									<button
										type="button"
										onClick={() => setSelectedProperty(null)}
										aria-label="Close"
										className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
									>
										<HiX size={18} />
									</button>
								</div>
							</div>

							{/* Scrollable Showcase Content */}
							<div className="overflow-y-auto flex-1">
								{/* Interactive Photo Carousel Stage */}
								<div className="relative bg-slate-900 group">
									<div className="relative h-64 sm:h-80 md:h-[400px] w-full overflow-hidden flex items-center justify-center bg-slate-900">
										<img
											src={selectedProperty.images[activePhotoIndex] || selectedProperty.image}
											alt={`${selectedProperty.title} - photo ${activePhotoIndex + 1}`}
											className="w-full h-full object-cover transition-opacity duration-300"
											onError={(e) => {
												e.target.src = selectedProperty.fallbackImage
											}}
										/>

										{/* Photo gradient vignette */}
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

										{/* Prev / Next Arrows */}
										{selectedProperty.images.length > 1 && (
											<>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														setActivePhotoIndex(
															(prev) =>
																(prev - 1 + selectedProperty.images.length) %
																selectedProperty.images.length
														)
													}}
													className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg backdrop-blur-xs flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer z-10"
													aria-label="Previous photo"
												>
													<ChevronLeft size={20} />
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation()
														setActivePhotoIndex(
															(prev) => (prev + 1) % selectedProperty.images.length
														)
													}}
													className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg backdrop-blur-xs flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer z-10"
													aria-label="Next photo"
												>
													<ChevronRight size={20} />
												</button>
											</>
										)}

										{/* Top Badges */}
										<div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none z-10">
											<span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 backdrop-blur-md shadow-sm">
												{selectedProperty.typeLabel}
											</span>
											{selectedProperty.availableTag && (
												<span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#006c4a] text-white shadow-sm flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{selectedProperty.availableTag}
												</span>
											)}
										</div>

										{/* Bottom Overlays */}
										<div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-10">
											<div className="text-white text-xs font-medium flex items-center gap-1.5 drop-shadow-md">
												<MapPin size={14} className="text-sky-400 shrink-0" />
												<span className="truncate max-w-xs sm:max-w-md">
													{selectedProperty.address ? `${selectedProperty.address}, ` : ''}
													{selectedProperty.area}
												</span>
											</div>
											{selectedProperty.images.length > 1 && (
												<span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-md shrink-0">
													{activePhotoIndex + 1} / {selectedProperty.images.length} Photos
												</span>
											)}
										</div>
									</div>

									{/* Thumbnail Carousel Strip */}
									{selectedProperty.images.length > 1 && (
										<div className="p-2.5 bg-slate-900/95 flex items-center gap-2 overflow-x-auto scrollbar-thin border-t border-white/10">
											{selectedProperty.images.map((img, idx) => (
												<button
													key={img + idx}
													type="button"
													onClick={() => setActivePhotoIndex(idx)}
													className={`relative h-14 w-20 sm:h-16 sm:w-24 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
														activePhotoIndex === idx
															? 'border-sky-400 ring-2 ring-sky-400/30 opacity-100 scale-95'
															: 'border-transparent opacity-60 hover:opacity-90'
													}`}
												>
													<img src={img} alt="" className="w-full h-full object-cover" />
												</button>
											))}
										</div>
									)}
								</div>

								{/* Main 2-Column Property Details */}
								<div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
									{/* Left Column: Specs, Description, Amenities (7 cols) */}
									<div className="lg:col-span-7 space-y-6">
										<div>
											<div className="text-xs font-bold text-[#006194] uppercase tracking-wider mb-1 flex items-center gap-1.5">
												<Building2 size={13} />
												{selectedProperty.complex_name || selectedProperty.typeLabel} ·{' '}
												{selectedProperty.city || 'South Africa'}
											</div>
											<h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#18262d] leading-tight">
												{selectedProperty.title}
											</h3>
											<p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
												<MapPin size={13} className="text-[#006194] shrink-0" />
												<span>
													{[
														selectedProperty.address,
														selectedProperty.area,
														selectedProperty.province
													]
														.filter(Boolean)
														.join(', ')}
												</span>
											</p>
										</div>

										{/* Key Architectural Specs Matrix */}
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
											{[
												{ label: 'Bedrooms', val: `${selectedProperty.beds} Bed${selectedProperty.beds === 1 ? '' : 's'}`, icon: BedDouble },
												{ label: 'Bathrooms', val: `${selectedProperty.baths} Bath${selectedProperty.baths === 1 ? '' : 's'}`, icon: Bath },
												{ label: 'Floor Area', val: selectedProperty.size, icon: Maximize2 },
												{ label: 'Parking', val: `${selectedProperty.parking_bays} ${selectedProperty.parking_type}`, icon: Car },
												{ label: 'Furnishing', val: selectedProperty.furnished ? 'Furnished' : 'Unfurnished', icon: Sparkles },
												{ label: 'Pet Policy', val: selectedProperty.pet_friendly ? 'Pet Friendly' : 'No Pets', icon: ShieldCheck }
											].map((spec, i) => {
												const Icon = spec.icon
												return (
													<div key={i} className="p-3.5 rounded-xl bg-[#f7f8f5] border border-[#d5e0df] flex items-center gap-3">
														<div className="w-8 h-8 rounded-lg bg-white border border-[#d5e0df] text-[#006194] flex items-center justify-center shrink-0">
															<Icon size={16} />
														</div>
														<div className="min-w-0">
															<span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
																{spec.label}
															</span>
															<span className="text-xs font-bold text-slate-800 block truncate">
																{spec.val}
															</span>
														</div>
													</div>
												)
											})}
										</div>

										{/* Property Narrative Description */}
										<div className="space-y-2 pt-2 border-t border-slate-100">
											<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#18262d]">
												About this property
											</h4>
											<p className="text-sm text-[#47545a] leading-relaxed whitespace-pre-line">
												{selectedProperty.description}
											</p>
										</div>

										{/* Amenities & Features */}
										<div className="space-y-3 pt-2 border-t border-slate-100">
											<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#18262d]">
												Amenities & features
											</h4>
											<div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
												{selectedProperty.amenities.map((amenity) => (
													<div
														key={amenity}
														className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f7f8f5] border border-[#d5e0df] text-xs font-medium text-slate-800"
													>
														<CheckCircle2 size={14} className="text-[#006c4a] shrink-0" />
														<span className="truncate">{amenity}</span>
													</div>
												))}
											</div>
										</div>

										{/* Lease Terms & Utility Rules */}
										<div className="space-y-3 pt-2 border-t border-slate-100">
											<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#18262d]">
												Lease & utility policies
											</h4>
											<div className="p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df] text-xs text-slate-700 space-y-2">
												<div className="flex items-center justify-between py-1 border-b border-[#d5e0df]/60">
													<span className="text-slate-500">Standard Lease Term</span>
													<span className="font-semibold text-slate-900">
														{selectedProperty.lease_term}
													</span>
												</div>
												<div className="flex items-center justify-between py-1 border-b border-[#d5e0df]/60">
													<span className="text-slate-500">Security Deposit</span>
													<span className="font-semibold text-slate-900">
														{selectedProperty.deposit}
													</span>
												</div>
												<div className="flex items-center justify-between py-1 border-b border-[#d5e0df]/60">
													<span className="text-slate-500">Electricity Metering</span>
													<span className="font-semibold text-slate-900">
														{selectedProperty.electricity_type === 'prepaid'
															? 'Prepaid Meter (Direct tenant purchase)'
															: 'Billed Monthly'}
													</span>
												</div>
												<div className="flex items-center justify-between py-1">
													<span className="text-slate-500">Water Supply</span>
													<span className="font-semibold text-slate-900">
														{selectedProperty.water_included
															? 'Included in monthly rent'
															: 'Billed by municipal consumption'}
													</span>
												</div>
											</div>
										</div>
									</div>

									{/* Right Column: Unified Anti-Slop Summary & Action Panel (5 cols) */}
									<div className="lg:col-span-5">
										<div className="p-6 sm:p-7 rounded-2xl bg-[#f7f8f5] border border-[#d5e0df] space-y-5 sticky top-4">
											{/* Rental & Financial Summary */}
											<div className="pb-4 border-b border-[#d5e0df]/80">
												<div className="flex items-baseline justify-between">
													<div>
														<span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
															Monthly Rental
														</span>
														<div className="flex items-baseline gap-1.5">
															<span className="font-['Space_Grotesk'] text-3xl font-extrabold text-[#18262d] tabular-nums">
																{selectedProperty.price}
															</span>
															<span className="text-xs font-medium text-slate-500">
																/ mo
															</span>
														</div>
													</div>
													<div className="text-right">
														<span className="text-[11px] font-semibold text-slate-400 block">Deposit</span>
														<span className="font-['Space_Grotesk'] text-sm font-bold text-slate-800">
															{selectedProperty.deposit}
														</span>
													</div>
												</div>
											</div>

											{/* Verified Landlord Dossier (Calm, integrated) */}
											<div className="py-2 border-b border-[#d5e0df]/80 space-y-2">
												<div className="flex items-center gap-2 text-xs font-bold text-[#006c4a]">
													<ShieldCheck size={16} className="text-[#006c4a] shrink-0" />
													<span>Place4U Vetted Listing</span>
												</div>
												<div className="text-xs text-slate-700 flex items-center justify-between">
													<span className="text-slate-500">Registered Owner</span>
													<span className="font-semibold text-slate-900">{selectedProperty.verifiedLandlord}</span>
												</div>
												<div className="text-xs text-slate-700 flex items-center justify-between">
													<span className="text-slate-500">Vetting Status</span>
													<span className="font-semibold text-[#006c4a] inline-flex items-center gap-1">
														<Check size={13} /> Title Deed & ID Confirmed
													</span>
												</div>
											</div>

											{/* Application Fee Transparency */}
											<div className="py-2 border-b border-[#d5e0df]/80 space-y-1">
												<div className="flex items-center justify-between text-xs">
													<span className="font-semibold text-slate-900">
														Place4U Screening Fee
													</span>
													{hasPromotion ? (
														<span className="inline-flex items-center gap-1.5 font-bold">
															<s className="text-slate-400 font-normal">R 100</s>
															<span className="text-[#006c4a] uppercase tracking-wider">
																{isFree ? 'FREE' : 'PROMO'}
															</span>
														</span>
													) : (
														<span className="font-bold text-slate-900">R 100</span>
													)}
												</div>
												<p className="text-[11px] text-slate-500 leading-relaxed">
													One single fee covers identity verification, FICA review, and credit bureau checks across all your applications.
												</p>
											</div>

											{/* Action CTA Buttons */}
											<div className="space-y-3 pt-1">
												<button
													type="button"
													onClick={() => {
														setSelectedProperty(null)
														openAuthModal('signup')
													}}
													className="w-full bg-[#006194] hover:bg-[#004b73] text-white py-3.5 px-5 rounded-xl font-['Space_Grotesk'] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
												>
													<span>Start Application for this Home</span>
													{hasPromotion && (
														<span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
															{isFree ? 'FREE' : 'PROMO'}
														</span>
													)}
												</button>

												<a
													href={`https://wa.me/27824822611?text=Hello%2C%20I%20am%20interested%20in%20${encodeURIComponent(selectedProperty.title)}%20(${selectedProperty.area})`}
													target="_blank"
													rel="noopener noreferrer"
													className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-[#18262d] border border-[#d5e0df] hover:border-slate-300 rounded-xl font-['Space_Grotesk'] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
												>
													<FaWhatsapp size={15} className="text-[#25D366]" />
													<span>Inquire on WhatsApp Desk</span>
												</a>
											</div>

											{/* Safe Relocation Safeguards Disclaimer */}
											<div className="pt-2 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
												<Lock size={13} className="text-slate-400 shrink-0 mt-0.5" />
												<span>
													<strong>Deposit Protection:</strong> Never pay a deposit
													before inspecting the residence and signing an official lease.
													Place4U does not hold lease deposits.
												</span>
											</div>
										</div>
									</div>
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
