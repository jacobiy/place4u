// Values.jsx - Lead UI Designer Overhaul for Place4U
import React from 'react'
import {
	HiShieldCheck,
	HiHeart,
	HiBadgeCheck,
	HiLockClosed
} from 'react-icons/hi'
import { FaBalanceScale, FaHandshake } from 'react-icons/fa'

const Values = () => {
	const values = [
		{
			icon: <HiShieldCheck className="w-6 h-6 text-emerald-400" />,
			tag: "Security",
			title: 'Absolute Scam Eradication',
			description:
				'Every listing requires verifiable landlord identification and property deed correlation. We eliminate ghost listings and fake payment requests before you ever view a property.'
		},
		{
			icon: <FaBalanceScale className="w-6 h-6 text-blue-400" />,
			tag: "Inclusion",
			title: 'Fair Housing Market Dignity',
			description:
				'Township backrooms, student digs, and suburban granny flats deserve the same verified digital standards, high-resolution photography, and safety guarantees as luxury high-rise developments.'
		},
		{
			icon: <FaHandshake className="w-6 h-6 text-amber-400" />,
			tag: "Fairness",
			title: 'Zero Upfront Application Gouging',
			description:
				'Searching for housing shouldn’t bankrupt you. We reject predatory application fee stacking where renters pay dozens of agents just to get a call back.'
		},
		{
			icon: <HiLockClosed className="w-6 h-6 text-purple-400" />,
			tag: "Privacy",
			title: 'Strict POPIA Compliance',
			description:
				'Your financial statements, ID copies, and personal data are encrypted and shared strictly with landlords you explicitly authorize. We never sell contact leads.'
		}
	]

	return (
		<section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-slate-900/30">
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<div className="max-w-3xl mb-16">
					<span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
						Our Guiding Charter
					</span>
					<h2 className="font-serif-display text-3xl sm:text-4xl text-white font-normal mt-2">
						Principles That Protect Every Tenant & Property Owner
					</h2>
					<p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed font-light">
						Real estate technology should foster trust, transparency, and accessible shelter,
						not exploitation. Here is our unwavering operational code.
					</p>
				</div>

				{/* Values 2x2 Editorial Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{values.map((item, index) => (
						<div
							key={index}
							className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.035] transition-all flex flex-col justify-between group"
						>
							<div>
								<div className="flex items-center justify-between mb-5">
									<div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:scale-105 transition-transform">
										{item.icon}
									</div>
									<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
										{item.tag}
									</span>
								</div>

								<h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
									{item.title}
								</h3>

								<p className="text-slate-400 text-sm leading-relaxed">
									{item.description}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Architectural Trust Commitments Banner */}
				<div className="mt-16 rounded-2xl bg-slate-900/90 border border-white/[0.1] p-8 md:p-10">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
						<div className="sm:px-4 first:pl-0">
							<span className="text-2xl font-bold text-white tracking-tight">100%</span>
							<p className="text-xs text-slate-300 mt-1 font-medium">Deed-Checked Landlords</p>
							<p className="text-[11px] text-slate-400 mt-0.5">Physical and records verified</p>
						</div>

						<div className="pt-6 sm:pt-0 sm:px-4">
							<span className="text-2xl font-bold text-white tracking-tight">R 0.00</span>
							<p className="text-xs text-slate-300 mt-1 font-medium">To Build Digital Profile</p>
							<p className="text-[11px] text-slate-400 mt-0.5">No hidden application charges</p>
						</div>

						<div className="pt-6 sm:pt-0 sm:px-4">
							<span className="text-2xl font-bold text-white tracking-tight">WhatsApp</span>
							<p className="text-xs text-slate-300 mt-1 font-medium">Direct Viewing Desk</p>
							<p className="text-[11px] text-slate-400 mt-0.5">Instant scheduling & updates</p>
						</div>

						<div className="pt-6 sm:pt-0 sm:px-4">
							<span className="text-2xl font-bold text-white tracking-tight">POPIA</span>
							<p className="text-xs text-slate-300 mt-1 font-medium">Encrypted Compliance</p>
							<p className="text-[11px] text-slate-400 mt-0.5">Your personal data stays secure</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export default Values
