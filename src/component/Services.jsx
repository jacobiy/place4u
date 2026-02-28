// Services.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { 
	HiHome, 
	HiShieldCheck, 
	HiDocumentText, 
	HiUserGroup, 
	HiSearch,
	HiUserCircle,
	HiOfficeBuilding,
	HiBadgeCheck,
	HiChat
} from 'react-icons/hi'
import { 
	FaHandshake, 
	FaFileSignature,
	FaWhatsapp,
	FaBuilding
} from 'react-icons/fa'
import { MdSupportAgent, MdOutlineRealEstateAgent } from 'react-icons/md'

const Services = () => {
	const services = [
		{
			icon: <HiDocumentText className="w-8 h-8 text-blue-500" />,
			title: "Single Application Process",
			description: "Submit one comprehensive application with your preferences, documents, and requirements. No more repetitive forms for different landlords."
		},
		{
			icon: <HiSearch className="w-8 h-8 text-blue-500" />,
			title: "Property Matching",
			description: "We search across both formal agency listings and informal rentals (backrooms, rooms, granny flats) to find options that match your criteria."
		},
		{
			icon: <HiBadgeCheck className="w-8 h-8 text-blue-500" />,
			title: "Tenant Pre-Screening",
			description: "We verify your documents and financial information so landlords receive qualified, serious applicants - increasing your chances of acceptance."
		},
		{
			icon: <HiShieldCheck className="w-8 h-8 text-blue-500" />,
			title: "Landlord Verification",
			description: "We verify property ownership and landlord credentials to protect you from scams and untrustworthy rentals."
		},
		{
			icon: <FaHandshake className="w-8 h-8 text-blue-500" />,
			title: "Introduction Facilitation",
			description: "We connect you with interested landlords and coordinate initial viewings. No cold calls or awkward first contacts."
		},
		{
			icon: <HiUserCircle className="w-8 h-8 text-blue-500" />,
			title: "Application Tracking",
			description: "Track your application status in real-time. Know when your documents are verified, when matches are found, and when landlords respond."
		},
		{
			icon: <FaBuilding className="w-8 h-8 text-blue-500" />,
			title: "Informal Rental Access",
			description: "Access backrooms, rooms, and informal rental units that never appear on traditional property portals or agency listings."
		},
		{
			icon: <HiChat className="w-8 h-8 text-blue-500" />,
			title: "Document Assistance",
			description: "Need help with documents? We guide you on what's needed and help you prepare a complete application package."
		},
		{
			icon: <FaWhatsapp className="w-8 h-8 text-blue-500" />,
			title: "WhatsApp Support",
			description: "Get updates and communicate with our team via WhatsApp - convenient and accessible for everyone."
		}
	]

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.2
			}
		}
	}

	const itemVariants = {
		hidden: { y: 50, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: {
				duration: 0.6,
				type: "spring"
			}
		}
	}

	return (
		<section id="services" className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 px-4 sm:px-6 lg:px-8">
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
						Our <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Services</span>
					</h2>
					<p className="text-gray-400 text-lg max-w-2xl mx-auto">
						We simplify your housing search with a single application and access to properties across both formal and informal markets
					</p>
					<div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mt-6 rounded-full" />
				</motion.div>

				{/* Services Grid */}
				<motion.div 
					variants={containerVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
				>
					{services.map((service, index) => (
						<motion.div
							key={index}
							variants={itemVariants}
							whileHover={{ 
								y: -10,
								boxShadow: "0 20px 40px -15px rgba(59, 130, 246, 0.3)"
							}}
							className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 
									 border border-gray-700 hover:border-blue-500/50 
									 transition-all duration-300 group"
						>
							<div className="bg-gray-700/50 w-16 h-16 rounded-xl 
										flex items-center justify-center mb-6
										group-hover:bg-gradient-to-r from-blue-500 to-blue-600 
										transition-all duration-300">
								<div className="group-hover:text-white transition-colors duration-300">
									{service.icon}
								</div>
							</div>
							
							<h3 className="text-xl font-semibold text-white mb-3">
								{service.title}
							</h3>
							
							<p className="text-gray-400 leading-relaxed">
								{service.description}
							</p>
							
							<div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
								<a 
									href="#contact" 
									className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-2"
								>
									Learn More 
									<span className="text-lg">→</span>
								</a>
							</div>
						</motion.div>
					))}
				</motion.div>

				{/* Service Fee Note */}
				<motion.div 
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					viewport={{ once: true }}
					className="mt-12 bg-blue-900/20 border border-blue-800/30 rounded-xl p-6 max-w-3xl mx-auto text-center"
				>
					<h3 className="text-lg font-semibold text-white mb-2">Simple, Transparent Fee</h3>
					<p className="text-gray-300">
						One-time assistance fee of <span className="text-blue-400 font-bold">R350</span> (non-refundable) covers application processing, 
						document verification, and matching services. No hidden costs, no commissions.
					</p>
					<p className="text-xs text-gray-500 mt-4">
						*Fee does not guarantee successful placement. We provide assistance only.
					</p>
				</motion.div>
			</div>
		</section>
	)
}

export default Services