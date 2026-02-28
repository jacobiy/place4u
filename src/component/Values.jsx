// Value.jsx
import React from 'react'
import { motion } from 'framer-motion'
import {
	HiShieldCheck,
	HiHeart,
	HiTrendingUp,
	HiUserGroup,
	HiOfficeBuilding,
	HiBadgeCheck,
	HiSparkles
} from 'react-icons/hi'
import {
	FaHandshake,
	FaBalanceScale,
	FaAccessibleIcon,
	FaUsers
} from 'react-icons/fa'
import { MdSecurity, MdSpeed, MdSupportAgent } from 'react-icons/md'

const Value = () => {
	const values = [
		{
			icon: <HiShieldCheck className="w-6 h-6 text-blue-500" />,
			title: 'Trust & Safety',
			description:
				'We verify both tenants and landlords to create a safe, trustworthy matching environment. Your security is our priority.'
		},
		{
			icon: <FaBalanceScale className="w-6 h-6 text-blue-500" />,
			title: 'Fair Access',
			description:
				'We believe everyone deserves access to suitable housing, whether in formal estates or informal backroom rentals.'
		},
		{
			icon: <HiHeart className="w-6 h-6 text-blue-500" />,
			title: 'Tenant-Centric',
			description:
				"Your housing journey matters. We're here to reduce stress and simplify your search for the perfect home."
		},
		{
			icon: <HiBadgeCheck className="w-6 h-6 text-blue-500" />,
			title: 'Pre-Screening',
			description:
				'We do the hard work of verifying tenants so landlords receive only qualified, serious applicants.'
		},
		{
			icon: <FaHandshake className="w-6 h-6 text-blue-500" />,
			title: 'Integrity',
			description:
				"We're transparent about our role: assistance only, no hidden fees, no false promises of guaranteed placement."
		},
		{
			icon: <HiOfficeBuilding className="w-6 h-6 text-blue-500" />,
			title: 'Market Inclusion',
			description:
				'We bridge the gap between formal agency listings and informal rentals, giving you more options.'
		}
	]

	return (
		<section
			id="value"
			className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 px-4 sm:px-6 lg:px-8"
		>
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
						Our{' '}
						<span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
							Values
						</span>
					</h2>
					<p className="text-gray-400 text-lg max-w-2xl mx-auto">
						The principles that guide us in helping you find the
						perfect place to call home
					</p>
					<div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mt-6 rounded-full" />
				</motion.div>

				{/* Values Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{values.map((value, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							viewport={{ once: true }}
							whileHover={{ scale: 1.05 }}
							className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6
									 border border-gray-700 hover:border-blue-500/50
									 transition-all duration-300"
						>
							<div className="flex items-start gap-4">
								<div className="bg-gray-700/50 p-3 rounded-lg shrink-0">
									{value.icon}
								</div>
								<div>
									<h3 className="text-lg font-semibold text-white mb-2">
										{value.title}
									</h3>
									<p className="text-gray-400 text-sm leading-relaxed">
										{value.description}
									</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>

				{/* Stats Banner */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.3 }}
					viewport={{ once: true }}
					className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 
							 rounded-2xl p-8 md:p-12 text-white"
				>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
						<div>
							<div className="text-3xl md:text-4xl font-bold mb-2">
								3,500+
							</div>
							<div className="text-blue-100 text-sm">
								Tenants Assisted
							</div>
						</div>
						<div>
							<div className="text-3xl md:text-4xl font-bold mb-2">
								2,800+
							</div>
							<div className="text-blue-100 text-sm">
								Properties Accessed
							</div>
						</div>
						<div>
							<div className="text-3xl md:text-4xl font-bold mb-2">
								85%
							</div>
							<div className="text-blue-100 text-sm">
								Match Satisfaction
							</div>
						</div>
						<div>
							<div className="text-3xl md:text-4xl font-bold mb-2">
								24h
							</div>
							<div className="text-blue-100 text-sm">
								Response Time
							</div>
						</div>
					</div>
				</motion.div>

				{/* Important Note */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.5 }}
					viewport={{ once: true }}
					className="mt-12 text-center"
				>
					<p className="text-gray-500 text-sm max-w-2xl mx-auto border-t border-gray-800 pt-8">
						<span className="text-blue-400 font-medium">Note:</span>{' '}
						Place4U is a relocation assistance service, not an
						estate agency. We facilitate introductions and provide
						pre-screening, but do not handle leases, payments, or
						guarantee successful placement.
					</p>
				</motion.div>
			</div>
		</section>
	)
}

export default Value
