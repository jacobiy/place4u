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
	FaTwitter,
	FaInstagram,
	FaLinkedinIn,
	FaWhatsapp
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { openConsentPreferences } from '../utils/privacyConsent'

const Footer = ({ theme = 'dark' }) => {
	const currentYear = new Date().getFullYear()
	const isLight = theme === 'light'

	const quickLinks = [
		{ name: 'Featured Spaces', href: '#residencies' },
		{ name: 'Tenant Passport', href: '#how-it-works' },
		{ name: 'Scam Shield', href: '#ecosystem' },
		{ name: 'WhatsApp Desk', href: '#whatsapp-desk' },
		{ name: 'Tenant Portal', href: '/login' },
		{ name: 'Landlord Portal', href: '/login' }
	]

	const legalLinks = [
		{ name: 'Cookie Preferences', action: () => openConsentPreferences() },
		{ name: 'POPIA Compliance Notice', to: '/compliance' },
		{ name: 'Privacy Policy', to: '/privacy' },
		{ name: 'Terms of Service', to: '/terms' },
		{ name: 'Dispute Resolution Guidelines', to: '/dispute-resolution' }
	]

	const contactInfo = [
		{
			icon: <HiLocationMarker className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: 'Office 205, The Zone, 184 Oxford Road, Rosebank, Johannesburg, 2196'
		},
		{
			icon: <HiMail className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: 'support@place4u.co.za'
		},
		{
			icon: <HiPhone className={`w-4 h-4 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />,
			text: '+27 (0) 11 234 5678'
		},
		{
			icon: <FaWhatsapp className={`w-4 h-4 ${isLight ? 'text-[#006c4a]' : 'text-green-400'}`} />,
			text: '+27 (0) 71 234 5678 (WhatsApp Support Desk)'
		}
	]

	const socialLinks = [
		{ icon: <HiMail />, href: 'mailto:support@place4u.co.za', label: 'Email' },
		{ icon: <FaTwitter />, href: '#', label: 'Twitter' },
		{ icon: <FaInstagram />, href: '#', label: 'Instagram' },
		{ icon: <FaLinkedinIn />, href: '#', label: 'LinkedIn' },
		{ icon: <FaWhatsapp />, href: '#', label: 'WhatsApp' }
	]

	return (
		<footer
			className={`border-t pt-16 pb-12 transition-colors ${
				isLight
					? 'bg-[#f2f3ff] text-[#3f4850] border-[#dae2fd]'
					: 'bg-slate-950 text-slate-300 border-white/[0.08]'
			}`}
		>
			<div className="max-w-7xl mx-auto px-6 lg:px-12">
				{/* Top 4-Column Grid */}
				<div
					className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b ${
						isLight ? 'border-[#dae2fd]' : 'border-white/[0.06]'
					}`}
				>
					{/* Brand & Purpose Column */}
					<div className="lg:col-span-4 space-y-4">
						<div className="flex items-center gap-3">
							<div
								className={`w-9 h-9 rounded-xl flex items-center justify-center p-1.5 ${
									isLight
										? 'bg-[#cce5ff] border border-[#93ccff]'
										: 'bg-blue-600/10 border border-blue-500/30'
								}`}
							>
								<img
									src="/logo.png"
									alt="Place4U"
									className="w-full h-full object-contain"
								/>
							</div>
							<div>
								<span className={`text-xl font-bold tracking-tight font-['Space_Grotesk'] ${isLight ? 'text-[#131b2e]' : 'text-white'}`}>
									Place4U
								</span>
								<p className={`text-[10px] uppercase font-semibold tracking-wider ${isLight ? 'text-[#707881]' : 'text-slate-400'}`}>
									Matched, Not Searched
								</p>
							</div>
						</div>

						<p className={`text-xs leading-relaxed font-normal ${isLight ? 'text-[#3f4850]' : 'text-slate-400'}`}>
							South Africa’s rental matching network. We reduce marketplace fraud by connecting reviewed student accommodation, backyard cottages, and modern urban apartments with pre-screened tenants.
						</p>

						{/* Legal Disclaimer Box */}
						<div
							className={`p-3.5 rounded-xl border ${
								isLight
									? 'bg-white border-[#dae2fd] text-[#3f4850]'
									: 'bg-white/[0.02] border-white/[0.06] text-slate-400'
							}`}
						>
							<div className="flex items-start gap-2.5">
								<HiInformationCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? 'text-[#006194]' : 'text-blue-400'}`} />
								<p className="text-[11px] leading-relaxed">
									<strong className={isLight ? 'text-[#131b2e]' : 'text-slate-200'}>Matching &amp; Document-Review Platform:</strong> Place4U is a technology platform connecting pre-screened parties. We collect and review landlord identity and ownership documents to reduce scams.
								</p>
							</div>
						</div>

						{/* POPIA & Trust Badge */}
						<Link
							to="/compliance"
							className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg w-fit transition-colors ${
								isLight
									? 'text-[#005137] bg-[#85f8c4]/50 border border-[#68dba9]'
									: 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 hover:bg-emerald-950/70'
							}`}
						>
							<HiShieldCheck className="w-4 h-4 text-[#006c4a]" />
							<span>POPIA Compliant · South Africa</span>
						</Link>
					</div>

					{/* Quick Links Column */}
					<div className="lg:col-span-2 space-y-3">
						<h3 className={`text-xs font-bold uppercase tracking-wider font-['Space_Grotesk'] ${isLight ? 'text-[#131b2e]' : 'text-slate-200'}`}>
							Explore
						</h3>
						<ul className="space-y-2.5">
							{quickLinks.map((link) => (
								<li key={link.name}>
									<a
										href={link.href}
										className={`text-xs transition-colors ${
											isLight ? 'text-[#3f4850] hover:text-[#006194]' : 'text-slate-400 hover:text-white'
										}`}
									>
										{link.name}
									</a>
								</li>
							))}
						</ul>
					</div>

					{/* Legal & Compliance Column */}
					<div className="lg:col-span-2 space-y-3">
						<h3 className={`text-xs font-bold uppercase tracking-wider font-['Space_Grotesk'] ${isLight ? 'text-[#131b2e]' : 'text-slate-200'}`}>
							Compliance
						</h3>
						<ul className="space-y-2.5">
							{legalLinks.map((link) => (
								<li key={link.name}>
									{link.action ? (
										<button
											type="button"
											onClick={link.action}
											className={`text-xs transition-colors cursor-pointer text-left block ${
												isLight ? 'text-[#3f4850] hover:text-[#006194]' : 'text-slate-400 hover:text-white'
											}`}
										>
											{link.name}
										</button>
									) : link.to ? (
										<Link
											to={link.to}
											className={`text-xs transition-colors block ${
												isLight ? 'text-[#3f4850] hover:text-[#006194]' : 'text-slate-400 hover:text-white'
											}`}
										>
											{link.name}
										</Link>
									) : (
										<a
											href={link.href || '#'}
											className={`text-xs transition-colors block ${
												isLight ? 'text-[#3f4850] hover:text-[#006194]' : 'text-slate-400 hover:text-white'
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
					<div className="lg:col-span-4 space-y-3">
						<h3 className={`text-xs font-bold uppercase tracking-wider font-['Space_Grotesk'] ${isLight ? 'text-[#131b2e]' : 'text-slate-200'}`}>
							Johannesburg Head Office
						</h3>
						<ul className="space-y-3">
							{contactInfo.map((item, index) => (
								<li key={index} className={`flex items-start gap-2.5 text-xs ${isLight ? 'text-[#3f4850]' : 'text-slate-400'}`}>
									<span className="mt-0.5 flex-shrink-0">{item.icon}</span>
									<span className="leading-relaxed">{item.text}</span>
								</li>
							))}
						</ul>

						{/* Social Media Channels */}
						<div className="pt-2">
							<div className="flex items-center gap-2">
								{socialLinks.map((item, index) => (
									<a
										key={index}
										href={item.href}
										aria-label={item.label}
										className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs ${
											isLight
												? 'bg-white border border-[#bfc7d2]/40 text-[#3f4850] hover:text-[#006194] hover:border-[#006194]'
												: 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white'
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
				<div className={`pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 ${isLight ? 'text-[#707881]' : 'text-slate-500'}`}>
					<p>© {currentYear} Place4U Housing Marketplace. South Africa. All rights reserved.</p>
					<div className="flex items-center gap-4">
						<span>Johannesburg</span>
						<span>•</span>
						<span>Pretoria</span>
						<span>•</span>
						<span>Cape Town</span>
						<span>•</span>
						<span>Durban</span>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
