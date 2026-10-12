// Landing.jsx - Place4U Verified Housing Marketplace
// Theme: Clean Architectural Light Mzansi (Primary: #006194, Secondary: #006c4a, Surface: #faf8ff)
import React, { useState, useRef, useEffect } from 'react'
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
import { useNavigate } from 'react-router-dom'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

// Authentic verified rental spaces across South African metros
const FEATURED_PROPERTIES = [
	{
		id: 'prop-1',
		title: 'The Ridge Student Lofts',
		category: 'Student Digs',
		area: 'Braamfontein, Johannesburg',
		province: 'Gauteng',
		near: '3 mins walk to Wits University',
		price: 'R 3,850',
		numericPrice: 3850,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBh2azQnkPr_VXv52V-zvUIyqhEuUd-u_l-uOI1QCBURYkD-GUCfUXymv5IHekU7rPvI2SqSMuW-l95wIALFB_MgBB5hQlyxf9_JiC42zWb1GR6nVEaNT820k8A3g_DHW6C8BOReanUjsE22YfP5j4o3LPdcudyZaPOZl1QPxqZ8jVYdiYD0tmquzZaCpMEy2dNlo39VccEZty3umWmvr3llquUad6KoM8V7_PKhGPb5uN0hYWCBj_A',
		fallbackImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&auto=format&fit=crop&q=80',
		tags: ['Fast Fibre', 'Solar Backup', 'Water Included'],
		beds: 1,
		baths: 1,
		verifiedLandlord: 'Sipho Ndlovu',
		verificationType: 'Deed Verified Landlord',
		status: 'Deed Verified'
	},
	{
		id: 'prop-2',
		title: 'Oak Lane Garden Cottage',
		category: 'Cottages & Backrooms',
		area: 'Rosebank, Cape Town',
		province: 'Western Cape',
		near: 'Close to UCT Shuttle & Metro Rail',
		price: 'R 7,200',
		numericPrice: 7200,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRO4AhobyiVFdNqvZn9DLFWlno0fzZpHjGvt2fGfNoKmvMZXCj1D-oYdiP8UgE0-Gk7JFhIlDIHcRKxXFyPajz6zorVauGP2fUUp6ZX8nAo97o-QimBP2D1qagHxG27pNJA0dMajkIH4EWDNLeAqk6mdmKwbr5hTmugQ30BYG5Y9jfBrPik76ODX5GBir7AbygQQ7fNQlH0REDtkoIIEb8Fy2X7Z4XyNz79jFn9JhUxpxbw4lEE1xe',
		fallbackImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&auto=format&fit=crop&q=80',
		tags: ['Pet Friendly', 'Inverter', 'Uncapped WiFi'],
		beds: 1,
		baths: 1,
		verifiedLandlord: 'Prof. David van der Merwe',
		verificationType: 'Title Deed Verified',
		status: 'Deed Verified'
	},
	{
		id: 'prop-3',
		title: 'Vilakazi Executive Suite',
		category: 'Cottages & Backrooms',
		area: 'Orlando West, Soweto',
		province: 'Gauteng',
		near: 'Near Vilakazi Precinct & Metrorail',
		price: 'R 3,200',
		numericPrice: 3200,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpTteJjrxA02ngsgFJBrNWuwmL6jDacyx4Y8hWvKOBLg4BZn81gPjYIqXReRTOSXd8ACoIHbqgQTye0BUFE_HxUsVHPqF0-VdEl-n2qcIq5sTivLcoarv1PuIkPtp6AZB2Z6lIESYuYSVObAM_rd3kbBtsW9WsTe4sGzCDThV8n6tAfdQx90HxfJtBjUhCgVbSIRM1vl_x9OWO-6-zR0La1S3UR0MBTqwudnOhZmAomyY5QkjVjqZ6',
		fallbackImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80',
		tags: ['Prepaid Meter', 'Secure Parking', 'Solar Geyser'],
		beds: 1,
		baths: 1,
		verifiedLandlord: 'Thabo Mthembu',
		verificationType: 'Municipal Title Checked',
		status: 'Deed Verified'
	},
	{
		id: 'prop-4',
		title: 'Campus View Studio',
		category: 'Student Digs',
		area: 'Hatfield, Pretoria',
		province: 'Gauteng',
		near: 'Walking distance to University of Pretoria',
		price: 'R 4,500',
		numericPrice: 4500,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMgP6Xj4Gm4LFKcnkFIxptxGxR7yRznnZJxGdSTqZTyYRJYz9WtF1DrctnGcjG0dfwT_Rpmbr5eNsmNqmsDsG1tDuTViWxfBmF999eZCEoOv_Nuh5AB08tdEZXYgivjoHiXwlyZ94vOKbc_p2Zm9uGwECD_L20cnJg04x9GKp_Ci0WrEANtKLIzZe0jnOq6cDI_S3Nwxh3d3ZA6DMt1Kj5w11ITQwT_Acxq4R6lnZeMb4NWo23ntTL',
		fallbackImage: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=900&auto=format&fit=crop&q=80',
		tags: ['Walking to UP', 'Backup Power', 'Laundry Room'],
		beds: 1,
		baths: 1,
		verifiedLandlord: 'Hatfield Student Stays',
		verificationType: 'NSFAS & Deed Accredited',
		status: 'Deed Verified'
	},
	{
		id: 'prop-5',
		title: 'Eikestad Student Manor',
		category: 'Student Digs',
		area: 'Stellenbosch Central',
		province: 'Western Cape',
		near: '5 mins to Stellenbosch University',
		price: 'R 5,100',
		numericPrice: 5100,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBB-ILrB7rHcL-gIlu1Iwdy66r2yPsM50WmebxkeLz1t5pgx1oFRkARp0U45Fd_R403GWj-mAcwR-2WIGqSgAOb9LCpPvwfVaHfK8Clsn3tu-nemZJTRQgShVs7EnWIbfdHIzKbaKfMsek86hoV300FPtvWDEJ5PUfgNSVRRxcVtVFgw9hhC_TMMqsHFm8786qCfxsobU2Drcdinly1t0oYwk3Vcjjp6ftIoLnSnZvRwLaYWs1pdKW3',
		fallbackImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&auto=format&fit=crop&q=80',
		tags: ['Uncapped Fibre', 'Solar UPS', 'Braai Area'],
		beds: 1,
		baths: 1,
		verifiedLandlord: 'Eikestad Living Assets',
		verificationType: 'Deed Verified Landlord',
		status: 'Deed Verified'
	},
	{
		id: 'prop-6',
		title: 'Kloof Street Loft',
		category: 'Apartments',
		area: 'Gardens, Cape Town',
		province: 'Western Cape',
		near: 'Walking distance to Kloof Street cafes',
		price: 'R 9,500',
		numericPrice: 9500,
		period: 'month',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDb3yCAn7cWxPZaDNjoWUEX7IJz2DVCWx9iB8ynrWpWuB67VWBBd7IUhvfgBQ7AjVmW2vTccqlix7fJp-sTuaX120Yvaoxb6EZ9MWHLJb1ESvLalOCEDZQ0SMbH4uHGmxHdrqTl4U8NqmS5QNFMg4QRldi4MwA4Lg2tAKmtTRvVJo2bBmVIHyN_57lYlo9SnQ_bfDi3B405S1peJMgK9E2Tqh608jv1sKYWrocXVQLg8UYfmUO0b2D4',
		fallbackImage: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=900&auto=format&fit=crop&q=80',
		tags: ['Solar Backup', 'Mountain View', '24h Security'],
		beds: 2,
		baths: 1,
		verifiedLandlord: 'Claire Beaumont',
		verificationType: 'Deed Verified Landlord',
		status: 'Deed Verified'
	}
]

const QUICK_LOCATIONS = [
	'Braamfontein',
	'Rosebank',
	'Hatfield PTA',
	'Orlando Soweto',
	'Stellenbosch',
	'Gardens CPT'
]

const CATEGORIES = [
	'All Verified',
	'Student Digs',
	'Cottages & Backrooms',
	'Apartments'
]

const PROVINCES = ['All SA', 'Gauteng', 'Western Cape', 'KZN']

const PRICE_OPTIONS = [
	{ value: 'any', label: 'Any Price' },
	{ value: 'under3k', label: 'Under R 3,000 / mo' },
	{ value: 'under5k', label: 'Under R 5,000 / mo' },
	{ value: 'under8k', label: 'Under R 8,000 / mo' },
	{ value: 'under12k', label: 'Under R 12,000 / mo' }
]

const TESTIMONIALS = [
	{
		name: 'Thabo Mokoena',
		role: 'Wits University Student',
		quote: 'As a Wits student moving from Polokwane, my parents were terrified of Braamfontein scams. Place4U showed us the actual title deed. Found my digs in 2 days!',
		initials: 'TM',
		bgClass: 'bg-[#006194]'
	},
	{
		name: 'Prof. David van der Merwe',
		role: 'Property Owner, CPT',
		quote: 'Listing my garden cottage in Rosebank was seamless. The verification team checked my municipal rates bill and municipal deed. Quality tenants only!',
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
	const [activeCategory, setActiveCategory] = useState('All Verified')
	const [activeProvince, setActiveProvince] = useState('All SA')
	const [searchQuery, setSearchQuery] = useState('')
	const [priceFilter, setPriceFilter] = useState('any')
	const [priceDropdownOpen, setPriceDropdownOpen] = useState(false)
	const priceDropdownRef = useRef(null)
	const [favorites, setFavorites] = useState(['prop-1'])
	const [selectedProperty, setSelectedProperty] = useState(null)

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

	const toggleFavorite = (id) => {
		setFavorites((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
		)
	}

	const filteredProperties = FEATURED_PROPERTIES.filter((prop) => {
		const matchesCategory =
			activeCategory === 'All Verified' || prop.category === activeCategory
		
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
		<div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194] selection:text-white">
			<Navbar />

			{/* ===================== HERO SECTION ===================== */}
			<section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28 px-6 lg:px-12 bg-gradient-to-b from-[#cce5ff]/30 via-[#faf8ff] to-[#faf8ff]">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
					
					{/* Left Column: Messaging & Search Dock */}
					<div className="lg:col-span-7 flex flex-col gap-6">
						<div className="inline-flex items-center gap-2 bg-[#85f8c4]/50 text-[#005137] px-3.5 py-1 rounded-full text-xs font-semibold w-max border border-[#68dba9]/40 shadow-sm">
							<span className="material-symbols-outlined text-[18px]">verified</span>
							South Africa's Trusted Housing Ecosystem
						</div>

						<h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#131b2e] tracking-tight leading-[1.12]">
							Rent verified rooms & cottages without deposit risk
						</h1>

						<p className="font-['Plus_Jakarta_Sans'] text-base sm:text-lg text-[#3f4850] max-w-2xl leading-relaxed">
							Pre-screened landlords, municipal deed checks, and absolute peace of mind for students, young professionals, and urban renters across Mzansi.
						</p>

						{/* Interactive Search Dock */}
						<div className="mt-2 bg-white p-4 lg:p-6 rounded-2xl shadow-xl border border-[#dae2fd]/60 flex flex-col gap-4">
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
						<div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#eaedff] aspect-[4/5] border border-[#dae2fd]">
							<img
								src="/hero-loft.jpg"
								alt="Modern light-filled verified student loft apartment in Braamfontein"
								className="w-full h-full object-cover"
								onError={(e) => {
									e.target.src = 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=85&w=1600&auto=format&fit=crop'
								}}
							/>

							{/* Deed Verified Floating Badge */}
							<div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-[#bfc7d2]/30 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-[#85f8c4]/50 flex items-center justify-center text-[#005137]">
										<span className="material-symbols-outlined text-[20px]">shield_locked</span>
									</div>
									<div>
										<h4 className="font-['Space_Grotesk'] text-base font-bold text-[#131b2e]">Deed Verified</h4>
										<p className="text-xs text-[#3f4850]">Title deed matched to landlord ID</p>
									</div>
								</div>
								<span className="bg-[#006c4a] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
									100% Secure
								</span>
							</div>
						</div>
					</div>

				</div>
			</section>

			{/* ===================== PROPERTIES GRID ===================== */}
			<section id="residencies" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
				<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
					<div>
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							Live Inventory
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							Featured Verified Properties
						</h2>
					</div>

					{/* Province Filter Pills */}
					<div className="flex flex-wrap gap-2">
						{PROVINCES.map((prov) => (
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{filteredProperties.map((prop) => (
						<div
							key={prop.id}
							className="bg-[#f2f3ff] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group border border-[#dae2fd]/60"
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
									className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#131b2e] hover:bg-white shadow-sm transition-transform active:scale-90"
									aria-label="Save Property"
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
										Instant Apply
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

				{filteredProperties.length === 0 && (
					<div className="text-center py-16 bg-[#f2f3ff] rounded-2xl border border-[#dae2fd]">
						<p className="text-sm text-[#3f4850]">No verified properties found matching your filter criteria.</p>
						<button
							onClick={() => {
								setActiveCategory('All Verified')
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
			<section id="ecosystem" className="py-20 px-6 lg:px-12 bg-[#f2f3ff]/50 border-y border-[#dae2fd]/60">
				<div className="max-w-7xl mx-auto">
					<div className="text-center max-w-2xl mx-auto mb-16">
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							The Place4U Guarantee
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							Built for South African Realities
						</h2>
						<p className="text-sm sm:text-base text-[#3f4850] mt-2 font-normal leading-relaxed">
							Eliminating scams, deposit exploitation, and grey-market housing risks through verifiable technological infrastructure.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Bento Item 1 */}
						<div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between border border-[#bfc7d2]/20">
							<div>
								<div className="w-12 h-12 rounded-xl bg-[#cce5ff]/50 flex items-center justify-center text-[#006194] mb-6">
									<span className="material-symbols-outlined text-[24px]">gavel</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									Title Deed Correlation
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									Every listing is cross-referenced with the South African Deeds Office registry. We verify ownership before any tenant steps foot inside.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 flex items-center justify-between text-xs font-bold text-[#006194]">
								<span>Deeds Office API Connected</span>
								<span className="material-symbols-outlined text-[18px]">check_circle</span>
							</div>
						</div>

						{/* Bento Item 2 */}
						<div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between border border-[#bfc7d2]/20">
							<div>
								<div className="w-12 h-12 rounded-xl bg-[#85f8c4]/50 flex items-center justify-center text-[#005137] mb-6">
									<span className="material-symbols-outlined text-[24px]">home_work</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									Township Backroom Dignity
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									Elevating backyard cottages and township rentals into institutional-grade listings with verified safety standards and fair lease terms.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 flex items-center justify-between text-xs font-bold text-[#006c4a]">
								<span>Empowering Local Landlords</span>
								<span className="material-symbols-outlined text-[18px]">verified</span>
							</div>
						</div>

						{/* Bento Item 3 */}
						<div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between border border-[#bfc7d2]/20">
							<div>
								<div className="w-12 h-12 rounded-xl bg-[#cce5ff]/50 flex items-center justify-center text-[#006194] mb-6">
									<span className="material-symbols-outlined text-[24px]">block</span>
								</div>
								<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2 tracking-tight">
									Zero Application Fee Gouging
								</h3>
								<p className="text-sm text-[#3f4850] leading-relaxed">
									No more paying R250 credit check fees to shady agents for phantom flats. All applications through Place4U are 100% transparent and free.
								</p>
							</div>
							<div className="mt-8 pt-6 border-t border-[#bfc7d2]/30 flex items-center justify-between text-xs font-bold text-[#006194]">
								<span>Zero Upfront Scam Risk</span>
								<span className="material-symbols-outlined text-[18px]">shield</span>
							</div>
						</div>
					</div>

					{/* Direct WhatsApp Desk Banner */}
					<div id="whatsapp-desk" className="mt-8 bg-gradient-to-r from-[#006194] to-[#007bb9] rounded-2xl p-8 lg:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
						<div className="flex flex-col gap-3 max-w-xl">
							<div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold w-max">
								<span className="material-symbols-outlined text-[18px]">chat</span> Direct Support
							</div>
							<h3 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
								Need help finding digs right now? Chat with our SA WhatsApp Desk.
							</h3>
							<p className="text-sm text-white/90 leading-relaxed">
								Our human support agents in Joburg, Cape Town, and Durban are ready to verify landlords on demand.
							</p>
						</div>

						<a
							href="https://wa.me/27712345678?text=Hello%20Place4U%20Desk%2C%20I%20need%20help%20verifying%20a%20property"
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
			<section id="stories" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
				<div className="text-center max-w-2xl mx-auto mb-12">
					<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
						Verified Stories
					</span>
					<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
						Trusted by Students & Landlords Across Mzansi
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{TESTIMONIALS.map((t, idx) => (
						<div
							key={idx}
							className="bg-[#f2f3ff] p-8 rounded-2xl flex flex-col justify-between border border-[#bfc7d2]/20 shadow-sm"
						>
							<p className="text-sm sm:text-base text-[#3f4850] italic mb-6 leading-relaxed">
								"{t.quote}"
							</p>
							<div className="flex items-center gap-4 pt-4 border-t border-[#dae2fd]">
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

			{/* ===================== HOW IT WORKS / TENANT PASSPORT FLOW ===================== */}
			<section id="how-it-works" className="py-20 px-6 lg:px-12 bg-white border-t border-[#dae2fd]/60">
				<div className="max-w-7xl mx-auto">
					<div className="text-center max-w-2xl mx-auto mb-16">
						<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
							Move-in Journey
						</span>
						<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#131b2e] mt-1 tracking-tight">
							How Your Digital Tenant Passport Works
						</h2>
						<p className="text-sm sm:text-base text-[#3f4850] mt-2 leading-relaxed">
							Create your verified profile once and apply to hundreds of accredited digs with zero fees.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="p-8 rounded-2xl bg-[#faf8ff] border border-[#dae2fd] relative">
							<div className="w-12 h-12 rounded-xl bg-[#cce5ff] text-[#006194] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6">
								01
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Build Your Passport</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								Upload your ID, student enrollment or proof of income once into an encrypted, POPIA-compliant vault.
							</p>
						</div>

						<div className="p-8 rounded-2xl bg-[#faf8ff] border border-[#dae2fd] relative">
							<div className="w-12 h-12 rounded-xl bg-[#85f8c4]/60 text-[#005137] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6">
								02
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Instant Pre-Approval</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								Landlords see a verified trust score without charging you R200+ processing charges for every listing.
							</p>
						</div>

						<div className="p-8 rounded-2xl bg-[#faf8ff] border border-[#dae2fd] relative">
							<div className="w-12 h-12 rounded-xl bg-[#cce5ff] text-[#006194] font-['Space_Grotesk'] font-bold text-lg flex items-center justify-center mb-6">
								03
							</div>
							<h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#131b2e] mb-2">Safe Move-In & Keys</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed">
								Schedule viewings over WhatsApp and sign fair lease agreements with absolute deposit security.
							</p>
						</div>
					</div>
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
								Ready to find your verified digs?
							</h3>
							<p className="text-sm text-[#3f4850] leading-relaxed mb-8">
								Build your tenant passport for R0 and browse deed-checked cottages and student rooms near your campus or workplace.
							</p>
						</div>

						<button
							onClick={() => navigate('/signup')}
							className="w-fit bg-[#006194] hover:bg-[#004b73] text-white font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
						>
							<span>Get Matched Free</span>
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
								Fill your vacancy with ID-verified, pre-screened tenants. Free listing, zero scam inquiries, and direct WhatsApp scheduling.
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
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#dae2fd]"
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
								<p className="text-xs text-[#006c4a] font-medium mt-1">
									📍 {selectedProperty.near}
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
									<p><strong>Deed Status:</strong> Authenticated against Municipal Registry</p>
									<p><strong>Deposit Protection:</strong> Escrow-backed, no upfront viewing fees</p>
								</div>

								<div className="flex items-center gap-3">
									<button
										onClick={() => {
											setSelectedProperty(null)
											navigate('/signup')
										}}
										className="flex-1 bg-[#006194] hover:bg-[#004b73] text-white py-3 rounded-xl font-['Space_Grotesk'] font-bold text-sm shadow-md"
									>
										Apply with Passport
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
