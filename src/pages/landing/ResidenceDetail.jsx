// ResidenceDetail.jsx - Dedicated Architectural Residence Page
// Theme: Clean Architectural Light Mzansi (Primary: #006194, Secondary: #006c4a, Surface: #f7f8f5)
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
	MapPin,
	BedDouble,
	Bath,
	Maximize2,
	Car,
	ShieldCheck,
	CheckCircle2,
	Share2,
	ChevronLeft,
	ChevronRight,
	Heart,
	Calendar,
	Sparkles,
	Lock,
	ArrowUpRight,
	Check,
	Copy,
	Home,
	Building2,
	FileText,
	Wifi,
	Zap,
	Shield,
	Waves,
	Sun,
	Clock,
	X
} from 'lucide-react'
import { FaWhatsapp, FaShieldAlt } from 'react-icons/fa'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import { getPropertyById, getFeaturedProperties } from './db/queries'
import { openAuthModal } from '../../utils/authModal'
import { useFeeQuote } from '../../hooks/useFeeQuote'
import { formatZarAmount } from '../../services/promotionService'
import { applySeo } from '../../utils/seo'

// A listing's gallery is built ONLY from that listing's own photographs. An
// earlier version topped a short gallery up with stock "architectural" images,
// which showed a landlord's 2 uploads next to 2 unrelated Unsplash interiors.
// Placeholders are reserved for listings with no photos at all.

const DEFAULT_GALLERY = [
	'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
	'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
	'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80',
	'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&auto=format&fit=crop&q=80'
]

export default function ResidenceDetail() {
	const { id } = useParams()
	const navigate = useNavigate()
	const location = useLocation()
	const { quote: feeQuote } = useFeeQuote()

	// If navigated from landing page, initial property is available immediately
	const initialProperty = location.state?.property || null

	const [property, setProperty] = useState(initialProperty)
	const [loading, setLoading] = useState(!initialProperty)
	const [activePhotoIndex, setActivePhotoIndex] = useState(0)
	const [isLightboxOpen, setIsLightboxOpen] = useState(false)
	const [copiedToast, setCopiedToast] = useState(false)
	const [isSaved, setIsSaved] = useState(false)
	const [similarProperties, setSimilarProperties] = useState([])

	// Load / refresh property data
	useEffect(() => {
		let isMounted = true
		window.scrollTo(0, 0)

		const fetchDetails = async () => {
			try {
				const prop = await getPropertyById(id)
				if (isMounted) {
					if (prop) {
						setProperty((prev) => ({ ...(prev || {}), ...prop }))
						applySeo({
							title: `${prop.title} in ${prop.area || 'South Africa'} | Place4U`,
							description: prop.description?.slice(0, 160) || `Verified rental residence in ${prop.area || 'South Africa'} on Place4U.`
						})
					}
				}
			} catch (err) {
				console.error('Failed to load property details:', err)
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		fetchDetails()
		return () => {
			isMounted = false
		}
	}, [id])

	// Check if property is favorited
	useEffect(() => {
		try {
			const savedList = JSON.parse(localStorage.getItem('place4u_saved_properties') || '[]')
			setIsSaved(savedList.includes(id))
		} catch {
			setIsSaved(false)
		}
	}, [id])

	// Load similar residences
	useEffect(() => {
		let isMounted = true
		const fetchSimilar = async () => {
			try {
				const list = await getFeaturedProperties({ limit: 4 })
				if (isMounted && Array.isArray(list)) {
					setSimilarProperties(list.filter((p) => String(p.id) !== String(id)).slice(0, 3))
				}
			} catch {
				// non-critical
			}
		}
		fetchSimilar()
		return () => {
			isMounted = false
		}
	}, [id])

	// Keyboard controls for lightbox
	useEffect(() => {
		const onKeyDown = (e) => {
			if (!isLightboxOpen) return
			if (e.key === 'Escape') setIsLightboxOpen(false)
			if (e.key === 'ArrowRight') nextPhoto()
			if (e.key === 'ArrowLeft') prevPhoto()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	})

	const gallery = useMemo(() => {
		if (!property) return DEFAULT_GALLERY
		const rawImages =
			Array.isArray(property.images) && property.images.length > 0
				? property.images.filter(Boolean)
				: Array.isArray(property.image_urls) && property.image_urls.length > 0
					? property.image_urls.filter(Boolean)
					: property.image_url
						? [property.image_url]
						: property.image
							? [property.image]
							: []

		// Only this listing's real photos. Never append stock imagery to a short
		// gallery — a 2-photo listing shows 2 photos, not 2 photos plus 2 fillers.
		if (rawImages.length > 0) return rawImages
		return [DEFAULT_GALLERY[0]]
	}, [property])

	const nextPhoto = () => setActivePhotoIndex((i) => (i + 1) % gallery.length)
	const prevPhoto = () => setActivePhotoIndex((i) => (i - 1 + gallery.length) % gallery.length)

	const toggleFavorite = () => {
		try {
			const savedList = JSON.parse(localStorage.getItem('place4u_saved_properties') || '[]')
			let nextList
			if (savedList.includes(id)) {
				nextList = savedList.filter((item) => item !== id)
				setIsSaved(false)
			} else {
				nextList = [...savedList, id]
				setIsSaved(true)
			}
			localStorage.setItem('place4u_saved_properties', JSON.stringify(nextList))
		} catch {}
	}

	const handleShare = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(window.location.href)
			setCopiedToast(true)
			setTimeout(() => setCopiedToast(false), 2500)
		}
	}

	const isFree = feeQuote?.isFree

	const beds = property?.bedrooms ?? property?.beds ?? null
	const baths = property?.bathrooms ?? property?.baths ?? null
	const size = property?.size ? (String(property.size).includes('m') ? property.size : `${property.size} m²`) : null
	const parking = property?.parking_bays ? `${property.parking_bays} bay${Number(property.parking_bays) > 1 ? 's' : ''}` : null
	const furnished = property?.furnished ? 'Furnished' : 'Unfurnished'
	const petFriendly = property?.pet_friendly ? 'Pet friendly' : 'No pets'

	if (loading && !property) {
		return (
			<div className="min-h-screen bg-[#f7f8f5] flex flex-col font-sans">
				<Navbar />
				<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-16">
					<div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-8" />
					<div className="h-10 w-2/3 bg-slate-200 rounded animate-pulse mb-4" />
					<div className="h-5 w-1/3 bg-slate-200 rounded animate-pulse mb-8" />
					<div className="h-[420px] sm:h-[500px] w-full bg-slate-200 rounded-2xl animate-pulse mb-8" />
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2 space-y-6">
							<div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
							<div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
						</div>
						<div className="h-80 bg-slate-200 rounded-xl animate-pulse" />
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	if (!property) {
		return (
			<div className="min-h-screen bg-[#f7f8f5] flex flex-col font-sans">
				<Navbar />
				<main className="flex-1 max-w-3xl mx-auto px-4 pt-36 sm:pt-44 pb-20 text-center flex flex-col items-center justify-center">
					<div className="w-16 h-16 rounded-full bg-slate-100 border border-[#d5e0df] flex items-center justify-center text-[#006194] mb-6">
						<Building2 size={32} />
					</div>
					<h1 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#18262d] mb-3">
						Residence Listing Not Found
					</h1>
					<p className="text-slate-600 max-w-md mb-8 text-sm leading-relaxed">
						This property listing may have expired, been leased, or is currently under review by our placement team.
					</p>
					<Link
						to="/#residencies"
						className="inline-flex items-center gap-2 bg-[#006194] text-white px-6 py-3 rounded-xl font-['Space_Grotesk'] font-bold text-sm shadow hover:bg-[#004b73] transition-all"
					>
						<ChevronLeft size={16} />
						<span>Browse Available Residences</span>
					</Link>
				</main>
				<Footer />
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-[#f7f8f5] flex flex-col font-sans text-slate-800">
			<Navbar />

			{/* Notification toast */}
			<AnimatePresence>
				{copiedToast && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="fixed top-28 right-6 z-50 bg-[#18262d] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold"
					>
						<Check size={14} className="text-emerald-400" />
						<span>Direct residence link copied to clipboard</span>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main Page Container: pt-32 sm:pt-40 lg:pt-44 clears the fixed navbar with generous breathing margin */}
			<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 lg:pt-44 pb-20">
				
				{/* Top Navigation Row: Back Button & Actions */}
				<div className="flex items-center justify-between gap-4 mb-6">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="inline-flex items-center gap-2 text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider text-slate-600 hover:text-[#006194] transition-colors cursor-pointer py-2 px-3 rounded-xl hover:bg-slate-200/60 border border-[#d5e0df] bg-white shadow-xs"
					>
						<ChevronLeft size={16} />
						<span>Back to listings</span>
					</button>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleShare}
							className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d5e0df] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
							title="Share listing link"
						>
							<Share2 size={14} className="text-slate-500" />
							<span className="hidden sm:inline">Share</span>
						</button>
						<button
							type="button"
							onClick={toggleFavorite}
							className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
								isSaved
									? 'border-rose-200 bg-rose-50 text-rose-600'
									: 'border-[#d5e0df] bg-white hover:bg-slate-50 text-slate-700'
							}`}
							title="Save to favorites"
						>
							<Heart size={14} className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-500'} />
							<span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
						</button>
					</div>
				</div>

				{/* Title and Location Header */}
				<header className="mb-8">
					<div className="flex flex-wrap items-center gap-2.5 mb-3">
						<span className="px-3 py-1 rounded-lg bg-[#006194]/10 text-[#006194] text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider">
							{property.property_type || 'Residential'}
						</span>
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
							<ShieldCheck size={14} className="text-emerald-600" />
							<span>Verified Ownership Dossier</span>
						</span>
						{property.id && (
							<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-500 bg-white border border-[#d5e0df]">
								REF #{String(property.id).slice(0, 8)}
							</span>
						)}
					</div>

					<h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#18262d] tracking-tight mb-2.5 leading-tight">
						{property.title}
					</h1>

					<div className="flex items-center gap-2 text-slate-600 text-sm sm:text-base">
						<MapPin size={18} className="text-[#006194] shrink-0" />
						<span>
							{property.address ? `${property.address}, ` : ''}{property.area}, {property.city || property.province || 'South Africa'}
						</span>
					</div>
				</header>

				{/* Main Picture & Interactive Architectural Gallery Showcase */}
				<div className="mb-10 sm:mb-12">
					<div className="rounded-2xl overflow-hidden border border-[#d5e0df] bg-white p-2.5 sm:p-3 shadow-xs">
						
						{/* Main Hero Photo */}
						<div
							onClick={() => setIsLightboxOpen(true)}
							className="relative w-full h-[380px] sm:h-[480px] lg:h-[560px] overflow-hidden rounded-xl cursor-pointer group bg-slate-100"
						>
							<img
								src={gallery[activePhotoIndex]}
								alt={property.title}
								className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
							/>
							
							{/* Subtle bottom shadow vignette */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

							{/* Top-left verified pill */}
							<div className="absolute top-4 left-4 flex items-center gap-2">
								<span className="bg-[#18262d]/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-sm">
									<ShieldCheck size={14} className="text-emerald-400" />
									<span>Verified Residence</span>
								</span>
							</div>

							{/* Bottom controls bar */}
							<div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
								<div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg font-mono font-medium border border-white/10">
									Photo {activePhotoIndex + 1} of {gallery.length}
								</div>
								
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation()
										setIsLightboxOpen(true)
									}}
									className="bg-white/95 hover:bg-white text-[#18262d] px-4 py-2 rounded-lg font-['Space_Grotesk'] font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer text-xs"
								>
									<Maximize2 size={13} />
									<span>View Fullscreen ({gallery.length})</span>
								</button>
							</div>

							{/* Previous / Next Arrows on Hero */}
							{gallery.length > 1 && (
								<>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											prevPhoto()
										}}
										className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer shadow-lg active:scale-95"
										aria-label="Previous photo"
									>
										<ChevronLeft size={22} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											nextPhoto()
										}}
										className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer shadow-lg active:scale-95"
										aria-label="Next photo"
									>
										<ChevronRight size={22} />
									</button>
								</>
							)}
						</div>

						{/* Interactive Thumbnail Carousel */}
						{gallery.length > 1 && (
							<div className="flex items-center gap-2.5 sm:gap-3 mt-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
								{gallery.map((img, idx) => (
									<button
										key={idx}
										type="button"
										onClick={() => setActivePhotoIndex(idx)}
										className={`relative w-20 h-14 sm:w-28 sm:h-18 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
											activePhotoIndex === idx
												? 'border-[#006194] shadow-sm ring-2 ring-[#006194]/25 scale-[1.02]'
												: 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
										}`}
									>
										<img src={img} alt={`Residence photo ${idx + 1}`} className="w-full h-full object-cover" />
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Two-Column Layout: Dossier Details & Sticky Application Sidebar */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
					
					{/* Left Column (8 cols): Specifications, Description, Amenities, Vetting Dossier */}
					<div className="lg:col-span-8 space-y-8">
						
						{/* Key Specifications Ribbon */}
						<section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#d5e0df] shadow-xs">
							<h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-4 font-semibold">
								Residence Key Specifications
							</h2>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								<div className="p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
										<BedDouble size={16} className="text-[#006194]" />
										<span>Bedrooms</span>
									</div>
									<p className="font-['Space_Grotesk'] font-bold text-lg text-[#18262d]">
										{beds ? `${beds} Bedroom${Number(beds) > 1 ? 's' : ''}` : 'Studio / Digs'}
									</p>
								</div>

								<div className="p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
										<Bath size={16} className="text-[#006194]" />
										<span>Bathrooms</span>
									</div>
									<p className="font-['Space_Grotesk'] font-bold text-lg text-[#18262d]">
										{baths ? `${baths} Bath${Number(baths) > 1 ? 's' : ''}` : '1 Bath'}
									</p>
								</div>

								<div className="p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
										<Maximize2 size={16} className="text-[#006194]" />
										<span>Floor Space</span>
									</div>
									<p className="font-['Space_Grotesk'] font-bold text-lg text-[#18262d]">
										{size || 'Spacious Unit'}
									</p>
								</div>

								<div className="p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="flex items-center gap-2 text-slate-600 text-xs mb-1.5">
										<Car size={16} className="text-[#006194]" />
										<span>Parking</span>
									</div>
									<p className="font-['Space_Grotesk'] font-bold text-lg text-[#18262d]">
										{parking || 'Street / Arranged'}
									</p>
								</div>
							</div>
						</section>

						{/* Overview & Description */}
						<section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#d5e0df] shadow-xs">
							<h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#18262d] mb-4">
								Architectural Residence Overview
							</h2>
							<div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm sm:text-base space-y-4">
								{property.description ? (
									property.description.split('\n\n').map((paragraph, i) => (
										<p key={i} className="whitespace-pre-line">{paragraph}</p>
									))
								) : (
									<p>
										Welcome to this premium verified rental residence situated in {property.area}. 
										This residence has been verified through Place4U's rigorous ownership and compliance audit, ensuring honest lease terms, verified physical conditions, and direct landlord accountable introductions.
									</p>
								)}
							</div>
						</section>

						{/* Features & Amenities Matrix */}
						<section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#d5e0df] shadow-xs">
							<h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#18262d] mb-6">
								Verified Residence Inclusions & Amenities
							</h2>
							
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="w-10 h-10 rounded-lg bg-white border border-[#d5e0df] flex items-center justify-center text-[#006194]">
										<Home size={18} />
									</div>
									<div>
										<p className="text-xs text-slate-500 font-medium">Furnishing Status</p>
										<p className="font-semibold text-sm text-[#18262d]">{furnished}</p>
									</div>
								</div>

								<div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="w-10 h-10 rounded-lg bg-white border border-[#d5e0df] flex items-center justify-center text-[#006194]">
										<Sun size={18} />
									</div>
									<div>
										<p className="text-xs text-slate-500 font-medium">Pet Policy</p>
										<p className="font-semibold text-sm text-[#18262d]">{petFriendly}</p>
									</div>
								</div>

								<div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="w-10 h-10 rounded-lg bg-white border border-[#d5e0df] flex items-center justify-center text-[#006194]">
										<Waves size={18} />
									</div>
									<div>
										<p className="text-xs text-slate-500 font-medium">Water Supply</p>
										<p className="font-semibold text-sm text-[#18262d]">
											{property.water_included ? 'Included in monthly rental' : 'Billed on meter reading'}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#f7f8f5] border border-[#d5e0df]">
									<div className="w-10 h-10 rounded-lg bg-white border border-[#d5e0df] flex items-center justify-center text-[#006194]">
										<Zap size={18} />
									</div>
									<div>
										<p className="text-xs text-slate-500 font-medium">Electricity Supply</p>
										<p className="font-semibold text-sm text-[#18262d]">
											{property.electricity_type ? String(property.electricity_type) : 'Prepaid Sub-Meter'}
										</p>
									</div>
								</div>
							</div>

							{Array.isArray(property.amenities) && property.amenities.length > 0 && (
								<div className="mt-6 pt-6 border-t border-[#d5e0df]">
									<p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 font-semibold">
										Additional Property Highlights
									</p>
									<div className="flex flex-wrap gap-2">
										{property.amenities.map((item, idx) => (
											<span
												key={idx}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f7f8f5] border border-[#d5e0df] text-xs font-medium text-slate-700"
											>
												<CheckCircle2 size={13} className="text-emerald-600" />
												<span>{item}</span>
											</span>
										))}
									</div>
								</div>
							)}
						</section>

						{/* Place4U Trust & Safety Dossier */}
						<section className="bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/30 rounded-2xl p-6 sm:p-8 border border-emerald-200/80 shadow-xs">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
									<FaShieldAlt size={20} />
								</div>
								<div>
									<h2 className="font-['Space_Grotesk'] text-lg sm:text-xl font-bold text-[#18262d]">
										Place4U Vetted Trust Dossier
									</h2>
									<p className="text-xs text-emerald-800 font-medium">
										Identity verified &bull; Deed of transfer cross-checked &bull; Deposit protection protocol
									</p>
								</div>
							</div>

							<div className="space-y-3.5">
								<div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 border border-emerald-100">
									<CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
									<div>
										<p className="text-xs font-bold text-[#18262d]">Landlord Ownership Verified</p>
										<p className="text-xs text-slate-600 leading-relaxed">
											Title deed and utility statements confirmed before listing activation. No phantom sublets or unverified brokers.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 border border-emerald-100">
									<CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
									<div>
										<p className="text-xs font-bold text-[#18262d]">Single Application Guarantee</p>
										<p className="text-xs text-slate-600 leading-relaxed">
											Your application fee covers credit screening, FICA verification, and matching across unlimited homes in our network.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 border border-emerald-100">
									<CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
									<div>
										<p className="text-xs font-bold text-[#18262d]">Zero Unvetted Cash Demands</p>
										<p className="text-xs text-slate-600 leading-relaxed">
											Never pay keys-money or inspection deposits directly to strangers. All introductions are governed by our compliance team.
										</p>
									</div>
								</div>
							</div>
						</section>

					</div>

					{/* Right Column (4 cols - Sticky Application Sidebar) */}
					<div className="lg:col-span-4 sticky top-32 lg:top-36 space-y-6">
						<div className="bg-white rounded-2xl p-6 border border-[#d5e0df] shadow-md">
							
							{/* Rental Price */}
							<div className="mb-6 pb-6 border-b border-[#d5e0df]">
								<span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
									Monthly Rental
								</span>
								<div className="flex items-baseline gap-1.5">
									<span className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-extrabold text-[#006194] tracking-tight">
										R{Number(property.price || 0).toLocaleString()}
									</span>
									<span className="text-xs font-medium text-slate-500">/ month</span>
								</div>
								
								<div className="flex items-center justify-between text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
									<span>Security Deposit</span>
									<span className="font-semibold text-slate-800">
										{property.deposit || (property.deposit_amount ? `R${Number(property.deposit_amount).toLocaleString()}` : `R${Number(property.price || 0).toLocaleString()}`)}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-slate-600 mt-1.5">
									<span>Available From</span>
									<span className="font-semibold text-slate-800">
										{property.available_from ? new Date(property.available_from).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Immediate Placement'}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-slate-600 mt-1.5">
									<span>Minimum Lease</span>
									<span className="font-semibold text-slate-800">
										{property.lease_term || '12 Months standard'}
									</span>
								</div>
							</div>

							{/* Promotion Notice */}
							<div className="mb-6 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
								<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
									<Sparkles size={14} className="text-emerald-600" />
									<span>{feeQuote?.promotion?.name || 'Verified Tenant Screening'}</span>
								</div>
								<p className="text-[11px] text-emerald-900/80 leading-relaxed">
									{isFree
										? 'Screening fee currently 100% waived. Zero card charge to submit your application.'
										: `Application assistance discounted to ${formatZarAmount(feeQuote?.finalAmount || 100)} (normally ${formatZarAmount(feeQuote?.originalAmount || 100)}). Fully refundable if no match is accepted.`}
								</p>
							</div>

							{/* Call To Actions */}
							<div className="space-y-3">
								<button
									type="button"
									onClick={() => openAuthModal('signup')}
									className="w-full bg-[#006194] hover:bg-[#004b73] text-white py-4 px-5 rounded-xl font-['Space_Grotesk'] font-bold text-sm shadow hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
								>
									<span>Start Application for this Home</span>
									<ArrowUpRight size={16} />
								</button>

								<a
									href={`https://wa.me/27824822611?text=Hello%2C%20I%20am%20interested%20in%20${encodeURIComponent(property.title)}%20(${property.area || property.city})%20on%20Place4U.`}
									target="_blank"
									rel="noopener noreferrer"
									className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-[#18262d] border border-[#d5e0df] hover:border-slate-300 rounded-xl font-['Space_Grotesk'] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
								>
									<FaWhatsapp size={16} className="text-[#25D366]" />
									<span>Inquire on WhatsApp Desk</span>
								</a>
							</div>

							{/* Trust assurances */}
							<div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
								<div className="flex items-center gap-2">
									<Check size={13} className="text-[#006194]" />
									<span>One application connects you across all homes</span>
								</div>
								<div className="flex items-center gap-2">
									<Check size={13} className="text-[#006194]" />
									<span>Direct lease contract with verified landlord</span>
								</div>
								<div className="flex items-center gap-2">
									<Check size={13} className="text-[#006194]" />
									<span>Zero unvetted viewing fees or agent commissions</span>
								</div>
							</div>

						</div>

						{/* Verified Property Owner Card */}
						{property.landlord?.full_name && (
							<div className="bg-white rounded-2xl p-5 border border-[#d5e0df] shadow-xs flex items-center gap-3.5">
								<div className="w-11 h-11 rounded-full bg-[#006194]/10 text-[#006194] font-['Space_Grotesk'] font-bold flex items-center justify-center shrink-0">
									{property.landlord.full_name[0]?.toUpperCase() || 'L'}
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<p className="font-['Space_Grotesk'] font-bold text-sm text-[#18262d] truncate">
											{property.landlord.full_name}
										</p>
										<ShieldCheck size={14} className="text-emerald-600 shrink-0" />
									</div>
									<p className="text-[11px] text-slate-500 font-medium">
										Vetted Property Owner &bull; Place4U Partner
									</p>
								</div>
							</div>
						)}

					</div>

				</div>

				{/* Similar Residences Row */}
				{similarProperties.length > 0 && (
					<section className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-[#d5e0df]">
						<div className="flex items-center justify-between mb-8">
							<div>
								<span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
									Comparable Listings
								</span>
								<h2 className="font-['Space_Grotesk'] text-2xl font-bold text-[#18262d]">
									Other Verified Residences Nearby
								</h2>
							</div>
							<Link
								to="/#residencies"
								className="text-xs font-['Space_Grotesk'] font-bold text-[#006194] hover:underline flex items-center gap-1"
							>
								<span>View All</span>
								<ArrowUpRight size={14} />
							</Link>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{similarProperties.map((prop) => (
								<article
									key={prop.id}
									onClick={() => navigate(`/property/${prop.id}`, { state: { property: prop } })}
									className="group bg-white rounded-2xl border border-[#d5e0df] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer hover:border-[#006194]/30"
								>
									<div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
										<img
											src={
												Array.isArray(prop.images) && prop.images.length > 0
													? prop.images[0]
													: Array.isArray(prop.image_urls) && prop.image_urls.length > 0
														? prop.image_urls[0]
														: prop.image_url || DEFAULT_GALLERY[0]
											}
											alt={prop.title}
											className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
										<div className="absolute top-3 left-3 bg-[#18262d]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-white flex items-center gap-1">
											<ShieldCheck size={12} className="text-emerald-400" />
											<span>{prop.property_type || 'Verified'}</span>
										</div>
									</div>

									<div className="p-5 flex-1 flex flex-col justify-between">
										<div>
											<h3 className="font-['Space_Grotesk'] text-base font-bold text-[#18262d] line-clamp-1 mb-1 group-hover:text-[#006194] transition-colors">
												{prop.title}
											</h3>
											<p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
												<MapPin size={12} className="text-[#006194]" />
												<span>{prop.area}, {prop.city || 'South Africa'}</span>
											</p>
										</div>

										<div className="pt-3 border-t border-slate-100 flex items-center justify-between">
											<span className="font-['Space_Grotesk'] text-base font-bold text-[#006194]">
												R{Number(prop.price || 0).toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">/mo</span>
											</span>
											<span className="inline-flex items-center gap-1 text-xs font-semibold text-[#006194] group-hover:translate-x-0.5 transition-transform">
												<span>View</span>
												<ArrowUpRight size={13} />
											</span>
										</div>
									</div>
								</article>
							))}
						</div>
					</section>
				)}

			</main>

			<Footer />

			{/* Fullscreen Image Lightbox Modal */}
			{isLightboxOpen && (
				<div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-fade-in">
					<div className="flex items-center justify-between text-white pb-4">
						<span className="text-sm font-mono">
							Photo {activePhotoIndex + 1} of {gallery.length} &bull; {property.title}
						</span>
						<button
							type="button"
							onClick={() => setIsLightboxOpen(false)}
							className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
						>
							<X size={20} />
						</button>
					</div>

					<div className="relative flex-1 flex items-center justify-center overflow-hidden">
						<img
							src={gallery[activePhotoIndex]}
							alt={property.title}
							className="max-h-full max-w-full object-contain rounded-lg select-none"
						/>

						{gallery.length > 1 && (
							<>
								<button
									type="button"
									onClick={prevPhoto}
									className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer"
								>
									<ChevronLeft size={24} />
								</button>
								<button
									type="button"
									onClick={nextPhoto}
									className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer"
								>
									<ChevronRight size={24} />
								</button>
							</>
						)}
					</div>

					{/* Thumbnail strip in lightbox */}
					<div className="flex items-center justify-center gap-2 pt-4 overflow-x-auto max-w-full">
						{gallery.map((img, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => setActivePhotoIndex(idx)}
								className={`w-16 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
									activePhotoIndex === idx ? 'border-[#006194] scale-105' : 'border-transparent opacity-50 hover:opacity-100'
								}`}
							>
								<img src={img} alt="" className="w-full h-full object-cover" />
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
