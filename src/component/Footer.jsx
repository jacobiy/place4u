// Footer.jsx
import React from 'react'
import { motion } from 'framer-motion'
import {
	HiLocationMarker,
	HiMail,
	HiPhone,
	HiHeart,
	HiInformationCircle,
	HiShieldCheck
} from 'react-icons/hi'
import {
	FaFacebookF,
	FaTwitter,
	FaInstagram,
	FaLinkedinIn,
	FaWhatsapp
} from 'react-icons/fa'

const Footer = () => {
	const currentYear = new Date().getFullYear()

	const quickLinks = [
		{ name: 'Home', href: '/' },
		{ name: 'How It Works', href: '#how-it-works' },
		{ name: 'For Tenants', href: '#tenants' },
		{ name: 'For Landlords', href: '#landlords' },
		{ name: 'Contact Us', href: '#contact' }
	]

	const legalLinks = [
		{ name: 'Privacy Policy', href: '/privacy' },
		{ name: 'Terms of Service', href: '/terms' },
		{ name: 'POPIA Compliance', href: '/popia' },
		{ name: 'Disclaimer', href: '/disclaimer' }
	]

	const contactInfo = [
		{
			icon: <HiLocationMarker />,
			text: 'Office 205, The Zone, 184 Oxford Road, Rosebank, Johannesburg, 2196'
		},
		{ icon: <HiMail />, text: 'hello@place4u.co.za' },
		{ icon: <HiPhone />, text: '+27 (0) 11 234 5678' },
		{ icon: <FaWhatsapp />, text: '+27 (0) 71 234 5678' }
	]

	const socialLinks = [
		{
			icon: <FaFacebookF />,
			href: 'https://facebook.com/place4usa',
			label: 'Facebook'
		},
		{
			icon: <FaTwitter />,
			href: 'https://twitter.com/place4usa',
			label: 'Twitter'
		},
		{
			icon: <FaInstagram />,
			href: 'https://instagram.com/place4u_sa',
			label: 'Instagram'
		},
		{
			icon: <FaLinkedinIn />,
			href: 'https://linkedin.com/company/place4u',
			label: 'LinkedIn'
		},
		{
			icon: <FaWhatsapp />,
			href: 'https://wa.me/27712345678',
			label: 'WhatsApp'
		}
	]

	return (
		<footer className="bg-gray-900 text-white border-t border-gray-800">
			{/* Main Footer */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
					{/* Company Info */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: true }}
					>
						<h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
							Place4U
						</h2>
						<p className="text-gray-400 mb-4 text-sm leading-relaxed">
							Relocation assistance and tenant-property matching
							platform. We help you find suitable accommodation
							across both formal and informal rental markets.
						</p>

						{/* Important Disclaimer */}
						<div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 mb-4">
							<div className="flex items-start gap-3">
								<HiInformationCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
								<p className="text-xs text-gray-300">
									<strong className="text-blue-400">
										Not an estate agency:
									</strong>{' '}
									We provide assistance services only. We do
									not broker leases, handle payments, or act
									as property practitioners.
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2 text-gray-400 text-sm">
							<span>Made with</span>
							<HiHeart className="text-red-500 animate-pulse" />
							<span>in South Africa</span>
						</div>
					</motion.div>

					{/* Quick Links */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						viewport={{ once: true }}
					>
						<h3 className="text-lg font-semibold mb-6 relative inline-block">
							Quick Links
							<span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
						</h3>
						<ul className="space-y-3">
							{quickLinks.map((link) => (
								<li key={link.name}>
									<a
										href={link.href}
										className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
									>
										<span className="w-1 h-1 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
										{link.name}
									</a>
								</li>
							))}
						</ul>
					</motion.div>

					{/* Legal */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						viewport={{ once: true }}
					>
						<h3 className="text-lg font-semibold mb-6 relative inline-block">
							Legal
							<span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
						</h3>
						<ul className="space-y-3">
							{legalLinks.map((link) => (
								<li key={link.name}>
									<a
										href={link.href}
										className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
									>
										<span className="w-1 h-1 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
										{link.name}
									</a>
								</li>
							))}
						</ul>

						{/* POPIA Badge */}
						<div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
							<HiShieldCheck className="text-green-500" />
							<span>POPIA Compliant</span>
						</div>
					</motion.div>

					{/* Contact Info */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						viewport={{ once: true }}
					>
						<h3 className="text-lg font-semibold mb-6 relative inline-block">
							Contact Us
							<span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
						</h3>
						<ul className="space-y-4">
							{contactInfo.map((item, index) => (
								<li
									key={index}
									className="flex items-start gap-3 text-gray-400 text-sm"
								>
									<span className="text-blue-500 mt-0.5">
										{item.icon}
									</span>
									<span>{item.text}</span>
								</li>
							))}
						</ul>

						{/* Social Links */}
						<div className="mt-8">
							<h4 className="text-sm font-medium text-gray-300 mb-4">
								Follow Us
							</h4>
							<div className="flex items-center gap-3">
								{socialLinks.map((social, index) => (
									<motion.a
										key={index}
										href={social.href}
										target="_blank"
										rel="noopener noreferrer"
										whileHover={{ y: -3 }}
										whileTap={{ scale: 0.95 }}
										className="bg-gray-800 hover:bg-blue-600 w-10 h-10 
												 rounded-lg flex items-center justify-center
												 transition-colors duration-300 group"
										aria-label={social.label}
									>
										<span className="text-gray-400 group-hover:text-white text-sm">
											{social.icon}
										</span>
									</motion.a>
								))}
							</div>
						</div>
					</motion.div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="border-t border-gray-800">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-gray-500 text-sm text-center md:text-left">
							© {currentYear} Place4U (Pty) Ltd. All rights
							reserved.
						</p>
						<div className="flex items-center gap-4 text-xs text-gray-600">
							<span>Assistance fee: R350 (non-refundable)</span>
							<span>|</span>
							<span>No placement guarantee</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
