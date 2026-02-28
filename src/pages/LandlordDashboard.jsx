// pages/LandlordDashboard.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../utils/Supabase'
import { useNavigate } from 'react-router-dom'

const LandlordDashboard = () => {
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [properties, setProperties] = useState([])
	const [matches, setMatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('overview')
	const navigate = useNavigate()

	useEffect(() => {
		fetchLandlordData()
	}, [])

	const fetchLandlordData = async () => {
		try {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				navigate('/login')
				return
			}
			setUser(user)

			// Get landlord profile
			const { data: profileData } = await supabase
				.from('users')
				.select('*')
				.eq('id', user.id)
				.single()
			setProfile(profileData)

			// Get properties
			const { data: propertiesData } = await supabase
				.from('properties')
				.select('*')
				.eq('landlord_id', user.id)
				.order('created_at', { ascending: false })
			setProperties(propertiesData || [])

			// Get matches for properties
			if (propertiesData?.length > 0) {
				const propertyIds = propertiesData.map((p) => p.id)
				const { data: matchesData } = await supabase
					.from('matches')
					.select(
						`
            *,
            applications (
              *,
              users!applications_tenant_id_fkey (*)
            ),
            properties (*)
          `
					)
					.in('property_id', propertyIds)
				setMatches(matchesData || [])
			}
		} catch (error) {
			console.error('Error fetching data:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleLogout = async () => {
		await supabase.auth.signOut()
		navigate('/')
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
			{/* Sidebar */}
			<div className="fixed left-0 top-0 w-64 h-full bg-gray-900/90 border-r border-gray-800 p-6">
				<div className="mb-8">
					<h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
						Place4U
					</h2>
					<p className="text-sm text-gray-500 mt-1">
						Landlord Dashboard
					</p>
				</div>

				{/* User Profile Summary */}
				<div className="bg-gray-800/50 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
							{profile?.full_name?.charAt(0) || 'L'}
						</div>
						<div>
							<p className="text-white font-medium">
								{profile?.full_name}
							</p>
							<p className="text-xs text-gray-400">
								{profile?.email}
							</p>
						</div>
					</div>
				</div>

				{/* Navigation */}
				<nav className="space-y-2">
					<button
						onClick={() => setActiveTab('overview')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'overview'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">📊</span>
						<span>Overview</span>
					</button>
					<button
						onClick={() => setActiveTab('properties')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'properties'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">🏢</span>
						<span>My Properties</span>
					</button>
					<button
						onClick={() => setActiveTab('matches')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'matches'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">🤝</span>
						<span>Tenant Matches</span>
					</button>
					<button
						onClick={() => setActiveTab('profile')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'profile'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">👤</span>
						<span>Profile</span>
					</button>
				</nav>

				{/* Add Property Button */}
				<button className="absolute bottom-20 left-6 right-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
					<span className="text-lg">➕</span>
					<span>Add Property</span>
				</button>

				{/* Logout */}
				<button
					onClick={handleLogout}
					className="absolute bottom-6 left-6 right-6 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-3 rounded-lg transition-all duration-200"
				>
					<span className="mr-2">🚪</span>
					Logout
				</button>
			</div>

			{/* Main Content */}
			<div className="ml-64 p-8">
				{activeTab === 'overview' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							Welcome back, {profile?.full_name?.split(' ')[0]}!
						</h1>

						{/* Stats Cards */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">🏢</div>
								<p className="text-3xl font-bold text-white">
									{properties.length}
								</p>
								<p className="text-gray-400">
									Total Properties
								</p>
							</div>
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">🤝</div>
								<p className="text-3xl font-bold text-white">
									{matches.length}
								</p>
								<p className="text-gray-400">Pending Matches</p>
							</div>
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">👥</div>
								<p className="text-3xl font-bold text-white">
									{
										matches.filter(
											(m) => m.status === 'accepted'
										).length
									}
								</p>
								<p className="text-gray-400">
									Accepted Tenants
								</p>
							</div>
						</div>

						{/* Recent Properties */}
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<h2 className="text-xl font-semibold text-white mb-4">
								Your Properties
							</h2>
							{properties.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{properties.slice(0, 2).map((property) => (
										<div
											key={property.id}
											className="p-4 bg-gray-700/30 rounded-lg"
										>
											<h3 className="text-white font-semibold mb-2">
												{property.property_type}
											</h3>
											<p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
												<span>📍</span>
												{property.area}, {property.city}
											</p>
											<p className="text-blue-400 font-semibold mb-2">
												R{property.price}/month
											</p>
											<div className="flex gap-4 text-sm text-gray-400">
												<span>
													🛏️ {property.bedrooms} beds
												</span>
												<span>
													🚿 {property.bathrooms}{' '}
													baths
												</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-8">
									No properties listed yet. Click "Add
									Property" to get started!
								</p>
							)}
						</div>
					</motion.div>
				)}

				{/* Properties Tab */}
				{activeTab === 'properties' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							My Properties
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							{properties.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{properties.map((property) => (
										<div
											key={property.id}
											className="p-4 bg-gray-700/30 rounded-lg"
										>
											<h3 className="text-white font-semibold mb-2">
												{property.property_type}
											</h3>
											<p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
												<span>📍</span>
												{property.area}, {property.city}
											</p>
											<p className="text-blue-400 font-semibold mb-2">
												R{property.price}/month
											</p>
											<div className="flex gap-4 text-sm text-gray-400 mb-3">
												<span>
													🛏️ {property.bedrooms} beds
												</span>
												<span>
													🚿 {property.bathrooms}{' '}
													baths
												</span>
											</div>
											<div className="flex gap-2">
												<button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors">
													Edit
												</button>
												<button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition-colors">
													View
												</button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-12">
									You haven't listed any properties yet.
								</p>
							)}
						</div>
					</motion.div>
				)}

				{/* Matches Tab */}
				{activeTab === 'matches' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							Tenant Matches
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							{matches.length > 0 ? (
								<div className="space-y-4">
									{matches.map((match) => (
										<div
											key={match.id}
											className="p-4 bg-gray-700/30 rounded-lg"
										>
											<div className="flex justify-between items-start mb-3">
												<div>
													<h3 className="text-white font-semibold">
														{
															match.applications
																?.users
																?.full_name
														}
													</h3>
													<p className="text-sm text-gray-400">
														{
															match.applications
																?.users?.email
														}
													</p>
												</div>
												<span className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs">
													Match Score:{' '}
													{match.match_score}%
												</span>
											</div>
											<p className="text-sm text-gray-300 mb-2">
												Interested in:{' '}
												{
													match.properties
														?.property_type
												}{' '}
												in {match.properties?.area}
											</p>
											<div className="flex gap-2 mt-3">
												<button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
													Accept Match
												</button>
												<button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
													View Details
												</button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-12">
									No matches found yet.
								</p>
							)}
						</div>
					</motion.div>
				)}

				{/* Profile Tab */}
				{activeTab === 'profile' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							My Profile
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<div className="space-y-4">
								<div className="flex items-center gap-4 pb-4 border-b border-gray-700">
									<div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
										{profile?.full_name?.charAt(0)}
									</div>
									<div>
										<h2 className="text-2xl font-bold text-white">
											{profile?.full_name}
										</h2>
										<p className="text-gray-400">
											Member since{' '}
											{new Date(
												profile?.created_at
											).toLocaleDateString()}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-sm text-gray-500">
											Email
										</label>
										<p className="text-white flex items-center gap-2">
											<span>📧</span> {profile?.email}
										</p>
									</div>
									<div>
										<label className="text-sm text-gray-500">
											Phone
										</label>
										<p className="text-white flex items-center gap-2">
											<span>📞</span> {profile?.phone}
										</p>
									</div>
									<div>
										<label className="text-sm text-gray-500">
											ID Number
										</label>
										<p className="text-white">
											{profile?.id_number ||
												'Not provided'}
										</p>
									</div>
									<div>
										<label className="text-sm text-gray-500">
											Verification Status
										</label>
										<p
											className={`${
												profile?.is_verified
													? 'text-green-400'
													: 'text-yellow-400'
											}`}
										>
											{profile?.is_verified
												? '✅ Verified'
												: '⏳ Pending Verification'}
										</p>
									</div>
								</div>

								<button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
									Edit Profile
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	)
}

export default LandlordDashboard
