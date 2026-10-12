// Services.jsx - Lead UI Designer Overhaul for Place4U
import React from 'react'
import { 
	HiDocumentText, 
	HiSearch, 
	HiBadgeCheck, 
	HiShieldCheck, 
	HiUserCircle,
	HiChat
} from 'react-icons/hi'
import { FaHandshake, FaBuilding, FaWhatsapp } from 'react-icons/fa'

const Services = () => {
	const serviceGroups = [
		{
			group: "Discovery & Application",
			description: "Eliminating repetitive application fees and friction across the market",
			items: [
				{
					icon: <HiDocumentText className="w-5 h-5 text-blue-400" />,
					title: "Single Universal Application",
					description: "Build your verified digital profile once with your proof of income, ID, and housing preferences. Apply to multiple landlords without paying repetitive fees."
				},
				{
					icon: <HiSearch className="w-5 h-5 text-blue-400" />,
					title: "Smart Property Matching",
					description: "Match with properties that fit your real budget and commute. From accredited campus studios to suburban cottages and flats."
				},
				{
					icon: <FaBuilding className="w-5 h-5 text-blue-400" />,
					title: "Informal Market Inclusion",
					description: "Access verified township backrooms, garden cottages, and granny flats that traditional agency portals completely ignore."
				}
			]
		},
		{
			group: "Safety & Verification",
			description: "Protecting tenants and property owners from real estate fraud",
			items: [
				{
					icon: <HiShieldCheck className="w-5 h-5 text-emerald-400" />,
					title: "Landlord Title Deed Verification",
					description: "We verify property ownership records and national identity before any listing goes live. Never fall for ghost landlords again."
				},
				{
					icon: <HiBadgeCheck className="w-5 h-5 text-emerald-400" />,
					title: "Tenant Pre-Screening",
					description: "Landlords receive qualified, pre-vetted applicants with verified employment or student funding status, speeding up approval."
				},
				{
					icon: <HiUserCircle className="w-5 h-5 text-emerald-400" />,
					title: "Real-Time Application Status",
					description: "Track exactly where your application is in the review pipeline with instant notification when landlords accept."
				}
			]
		},
		{
			group: "Frictionless Move-In",
			description: "Direct communication and local South African support",
			items: [
				{
					icon: <FaWhatsapp className="w-5 h-5 text-green-400" />,
					title: "WhatsApp Viewing Desk",
					description: "Coordinate viewings directly through WhatsApp without awkward cold calls or endless email threads."
				},
				{
					icon: <FaHandshake className="w-5 h-5 text-amber-400" />,
					title: "Standardized Lease Terms",
					description: "Transparent, fair rental agreements compliant with South African rental housing laws. Clear deposit refund protocols."
				},
				{
					icon: <HiChat className="w-5 h-5 text-blue-400" />,
					title: "Dedicated Document Support",
					description: "Need help organizing bank statements or student funding letters? Our local support team assists you step by step."
				}
			]
		}
	]

	return (
		<section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-slate-950">
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<div className="max-w-3xl mb-16">
					<span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
						Comprehensive Ecosystem
					</span>
					<h2 className="font-serif-display text-3xl sm:text-4xl text-white font-normal mt-2">
						Built for the Real South African Rental Market
					</h2>
					<p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed font-light">
						Whether you're a student looking for a safe room near campus, a professional seeking an apartment,
						or a homeowner letting a cottage, Place4U provides end-to-end trust.
					</p>
				</div>

				{/* Grouped Services */}
				<div className="space-y-12">
					{serviceGroups.map((group, groupIdx) => (
						<div key={groupIdx} className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-white/[0.06] pb-3 gap-1">
								<h3 className="text-lg font-semibold text-white tracking-tight">
									{group.group}
								</h3>
								<span className="text-xs text-slate-400">
									{group.description}
								</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
								{group.items.map((service, idx) => (
									<div
										key={idx}
										className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-white/[0.16] hover:bg-white/[0.035] transition-all flex flex-col justify-between group"
									>
										<div>
											<div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
												{service.icon}
											</div>
											<h4 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors mb-2">
												{service.title}
											</h4>
											<p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
												{service.description}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export default Services