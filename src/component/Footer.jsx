// Footer.jsx - Place4U with Adaptive Light/Dark Theme Support
import React from 'react'
import {
	HiLocationMarker,
	HiMail,
	HiPhone,
	HiShieldCheck,
	HiInformationCircle
} from 'react-icons/hi'
import {
	FaLinkedinIn,
	FaWhatsapp
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { openConsentNotice } from '../utils/privacyConsent'
import { openAuthModal } from '../utils/authModal'

const Footer = ({ theme = 'dark' }) => {
	const currentYear = new Date().getFullYear()
	const isLight = theme === 'light'

	// `to` values are router paths. The landing-page anchors are prefixed with
	// "/" because the footer is shared by every public page - a bare "#id" only
	// works when you are already on the landing page, and the landing page's
	// useHashScroll handles the scroll after the route change.
	const quickLinks = [
		{ name: 'Featured Spaces', to: '/#residencies' },
		{ name: 'Tenant Passport', to: '/#how-it-works' },
		{ name: 'What we review', to: '/#verification' },
		{ name: 'WhatsApp Desk', to: '/#whatsapp-desk' },
		// About Us lives here rather than in the navbar: it is a standalone page
		// (/about) now, not a landing-page anchor, and the header is reserved for
		// the tenant/landlord funnel.
		{ name: 'About Us', to: '/about' },
		{ name: 'Tenant Portal', action: () => openAuthModal('login') },
		{ name: 'Landlord Portal', action: () => openAuthModal('login') }
	]

	const legalLinks = [
		{ name: 'Cookie Notice', action: () => openConsentNotice() },
		{ name: 'POPIA Compliance Notice', to: '/compliance' },
		{ name: 'Privacy Policy', to: '/privacy' },
		{ name: 'Terms of Service', to: '/terms' },
		{ name: 'Dispute Resolution Guidelines', to: '/dispute-resolution' }
	]

	const contactInfo = [
		{
			icon: <HiLocationMarker className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: 'Coming Soon'
		},
		{
			icon: <HiMail className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: 'support@place4u.xyz'
		},
		{
			icon: <HiPhone className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: '082 482 2611'
		},
		{
			icon: <FaWhatsapp className={`w-4 h-4 ${isLight ? 'text-[#006c4a]' : 'text-green-400'}`} />,
			text: '082 482 2611 (WhatsApp Support Desk)'
		}
	]

	// Only channels that actually exist. Placeholder social links (a "#" href or
	// an account that has not been created) are worse than none: they 404 or dead
	// end for visitors and they tell search engines about profiles that are not
	// ours. Add Twitter / Instagram here AND to the Organization `sameAs` in
	// index.html only once the accounts are live.
	const socialLinks = [
		{ icon: <HiMail />, href: 'mailto:support@place4u.xyz', label: 'Email' },
		{ icon: <FaLinkedinIn />, href: 'https://www.linkedin.com/in/jacob-molomo-002428242/', label: 'Founder on LinkedIn' },
		{ icon: <FaWhatsapp />, href: 'https://wa.me/27824822611', label: 'WhatsApp' }
	]

	return (
		<footer
			className={`border-t transition-colors ${
				isLight
					? 'bg-[#eef2ef] text-[#18262d] border-[#cbd8d3]'
					: 'bg-slate-950 text-slate-300 border-white/[0.08]'
			}`}
		>
			<div className="max-w-7xl mx-auto px-6 lg:px-12">
				<div
					className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-10 gap-y-12 py-14 lg:py-16 border-b ${
						isLight ? 'border-[#cbd8d3]' : 'border-white/[0.08]'
					}`}
				>
					{/* Brand & Purpose Column */}
					<div className="lg:col-span-5">
						{/* Brand mark links home so every page (legal pages included) has a
						    crawlable path back to the landing page, not just the navbar. */}
						<Link to="/" className="inline-flex items-center gap-3" aria-label="Place4U home">
							<div
								className={`w-12 h-12 rounded-xl flex items-center justify-center p-1.5 border ${
									isLight
										? 'bg-white border-[#d5e0df]'
										: 'bg-white/[0.06] border-white/[0.12]'
								}`}
							>
								<img
									src="/logo.png"
									alt="Place4U"
									className={`w-full h-full object-contain ${isLight ? 'brightness-0' : ''}`}
								/>
							</div>
							<div>
								<span className={`text-xl font-bold tracking-tight font-['Space_Grotesk'] ${isLight ? 'text-[#131b2e]' : 'text-white'}`}>
									Place4U
								</span>
								<p className={`text-[10px] uppercase font-semibold tracking-[0.16em] mt-0.5 ${isLight ? 'text-[#63747a]' : 'text-slate-400'}`}>
									Matched, Not Searched
								</p>
							</div>
						</Link>

						<p className={`mt-6 max-w-md text-sm leading-relaxed ${isLight ? 'text-[#4d6066]' : 'text-slate-400'}`}>
							South Africa’s rental matching network. We connect renters with reviewed student accommodation, backyard cottages and urban apartments.
						</p>

						<div className={`mt-7 max-w-md border-t pt-5 ${isLight ? 'border-[#cbd8d3]' : 'border-white/[0.08]'}`}>
							<div className="flex items-start gap-2.5">
								<HiInformationCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? 'text-[#006194]' : 'text-blue-300'}`} />
								<p className={`text-xs leading-relaxed ${isLight ? 'text-[#63747a]' : 'text-slate-400'}`}>
									<strong className={isLight ? 'text-[#28434e]' : 'text-slate-200'}>Matching and document review platform.</strong>{' '}
									Place4U connects renters and property owners, and reviews landlord identity and ownership documents.
								</p>
							</div>
						</div>

						{/* POPIA & Trust Badge */}
						<Link
							to="/compliance"
							className={`mt-5 inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit border transition-colors ${
								isLight
									? 'text-[#005137] bg-[#e1ece6] border-[#c3d9cb] hover:bg-[#d7e8df]'
									: 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 hover:bg-emerald-950/70'
							}`}
						>
							<HiShieldCheck className={`w-4 h-4 ${isLight ? 'text-[#006c4a]' : 'text-emerald-400'}`} />
							<span>POPIA compliance</span>
						</Link>
					</div>

					{/* Quick Links Column */}
					<div className="lg:col-span-2">
						<h3 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? 'text-[#63747a]' : 'text-slate-400'}`}>
							Explore
						</h3>
						<ul className="space-y-3">
							{quickLinks.map((link) => (
								<li key={link.name}>
									{link.action ? (
										<button
											type="button"
											onClick={link.action}
											className={`text-sm transition-colors cursor-pointer text-left block ${
												isLight ? 'text-[#40555c] hover:text-[#006194]' : 'text-slate-300 hover:text-white'
											}`}
										>
											{link.name}
										</button>
									) : (
										<Link
											to={link.to}
											className={`text-sm transition-colors ${
												isLight ? 'text-[#40555c] hover:text-[#006194]' : 'text-slate-300 hover:text-white'
											}`}
										>
											{link.name}
										</Link>
									)}
								</li>
							))}
						</ul>
					</div>

					{/* Legal & Compliance Column */}
					<div className="lg:col-span-2">
						<h3 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? 'text-[#63747a]' : 'text-slate-400'}`}>
							Legal and privacy
						</h3>
						<ul className="space-y-3">
							{legalLinks.map((link) => (
								<li key={link.name}>
									{link.action ? (
										<button
											type="button"
											onClick={link.action}
											className={`text-sm transition-colors cursor-pointer text-left block ${
												isLight ? 'text-[#40555c] hover:text-[#006194]' : 'text-slate-300 hover:text-white'
											}`}
										>
											{link.name}
										</button>
									) : link.to ? (
										<Link
											to={link.to}
											className={`text-sm transition-colors block ${
												isLight ? 'text-[#40555c] hover:text-[#006194]' : 'text-slate-300 hover:text-white'
											}`}
										>
											{link.name}
										</Link>
									) : (
										<a
											href={link.href || '#'}
											className={`text-sm transition-colors block ${
												isLight ? 'text-[#40555c] hover:text-[#006194]' : 'text-slate-300 hover:text-white'
											}`}
										>
											{link.name}
										</a>
									)}
								</li>
							))}
						</ul>
					</div>

					{/* Contact Column */}
					<div className="lg:col-span-3">
						<h3 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? 'text-[#63747a]' : 'text-slate-400'}`}>
							Contact
						</h3>
						<ul className="space-y-4">
							{contactInfo.map((item, index) => (
								<li key={index} className={`flex items-start gap-3 text-sm ${isLight ? 'text-[#40555c]' : 'text-slate-300'}`}>
									<span className="mt-0.5 flex-shrink-0">{item.icon}</span>
									<span className="leading-relaxed">{item.text}</span>
								</li>
							))}
						</ul>

						{/* Social Media Channels */}
						<div className="mt-6">
							<div className="flex items-center gap-2">
								{socialLinks.map((item, index) => (
									<a
										key={index}
										href={item.href}
										aria-label={item.label}
										className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
											isLight
												? 'bg-white/70 border-[#cbd8d3] text-[#40555c] hover:bg-[#006194] hover:border-[#006194] hover:text-white'
												: 'bg-white/[0.04] border-white/[0.12] text-slate-300 hover:bg-white/10 hover:text-white'
										}`}
									>
										{item.icon}
									</a>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 text-xs ${isLight ? 'text-[#63747a]' : 'text-slate-500'}`}>
					<p>© {currentYear} Place4U Housing Marketplace. South Africa. All rights reserved.</p>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span>Johannesburg</span>
						<span aria-hidden="true">·</span>
						<span>Pretoria</span>
						<span aria-hidden="true">·</span>
						<span>Cape Town</span>
						<span aria-hidden="true">·</span>
						<span>Durban</span>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
