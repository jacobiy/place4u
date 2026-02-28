// pages/TenantDashboard.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../utils/Supabase'
import { useNavigate } from 'react-router-dom'

const TenantDashboard = () => {
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [applications, setApplications] = useState([])
	const [matches, setMatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('overview')
	const navigate = useNavigate()

	useEffect(() => {
		fetchUserData()
	}, [])

	const fetchUserData = async () => {
		try {
			// Get current user
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				navigate('/login')
				return
			}
			setUser(user)

			// Get tenant profile
			const { data: profileData } = await supabase
				.from('users')
				.select('*')
				.eq('id', user.id)
				.single()
			setProfile(profileData)

			// Get applications
			const { data: applicationsData } = await supabase
				.from('applications')
				.select('*')
				.eq('tenant_id', user.id)
				.order('submitted_at', { ascending: false })
			setApplications(applicationsData || [])

			// Get matches
			const { data: matchesData } = await supabase
				.from('matches')
				.select(
					`
          *,
          properties (*)
        `
				)
				.eq('application_id', applicationsData?.[0]?.id)
			setMatches(matchesData || [])
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

	const getStatusColor = (status) => {
		switch (status) {
			case 'submitted':
				return 'text-yellow-400 bg-yellow-400/10'
			case 'under_review':
				return 'text-blue-400 bg-blue-400/10'
			case 'matches_found':
				return 'text-green-400 bg-green-400/10'
			case 'completed':
				return 'text-purple-400 bg-purple-400/10'
			default:
				return 'text-gray-400 bg-gray-400/10'
		}
	}

	const getStatusEmoji = (status) => {
		switch (status) {
			case 'submitted':
				return '📝'
			case 'under_review':
				return '🔍'
			case 'matches_found':
				return '✅'
			case 'completed':
				return '🎉'
			default:
				return '⏳'
		}
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
						Tenant Dashboard
					</p>
				</div>

				{/* User Profile Summary */}
				<div className="bg-gray-800/50 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
							{profile?.full_name?.charAt(0) || 'T'}
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
						onClick={() => setActiveTab('applications')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'applications'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">📄</span>
						<span>Applications</span>
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
						<span className="text-lg">👁️</span>
						<span>Matches</span>
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
								<div className="text-3xl mb-3">📄</div>
								<p className="text-3xl font-bold text-white">
									{applications.length}
								</p>
								<p className="text-gray-400">
									Total Applications
								</p>
							</div>
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">👁️</div>
								<p className="text-3xl font-bold text-white">
									{matches.length}
								</p>
								<p className="text-gray-400">Active Matches</p>
							</div>
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">⏳</div>
								<p className="text-3xl font-bold text-white">
									{
										applications.filter(
											(a) => a.status === 'under_review'
										).length
									}
								</p>
								<p className="text-gray-400">Under Review</p>
							</div>
						</div>

						{/* Recent Applications */}
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<h2 className="text-xl font-semibold text-white mb-4">
								Recent Applications
							</h2>
							{applications.length > 0 ? (
								<div className="space-y-4">
									{applications.slice(0, 3).map((app) => (
										<div
											key={app.id}
											className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
										>
											<div>
												<p className="text-white font-medium">
													Application #
													{app.id.slice(0, 8)}
												</p>
												<p className="text-sm text-gray-400">
													Submitted:{' '}
													{new Date(
														app.submitted_at
													).toLocaleDateString()}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<span
													className={`px-3 py-1 rounded-full text-xs ${getStatusColor(
														app.status
													)}`}
												>
													{getStatusEmoji(app.status)}{' '}
													{app.status.replace(
														'_',
														' '
													)}
												</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-8">
									No applications yet.{' '}
									<button className="text-blue-400 hover:underline">
										Start your search
									</button>
								</p>
							)}
						</div>
					</motion.div>
				)}

				{activeTab === 'applications' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							My Applications
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							{applications.length > 0 ? (
								<div className="space-y-4">
									{applications.map((app) => (
										<div
											key={app.id}
											className="p-4 bg-gray-700/30 rounded-lg"
										>
											<div className="flex justify-between items-start mb-3">
												<div>
													<h3 className="text-white font-semibold">
														Application #
														{app.id.slice(0, 8)}
													</h3>
													<p className="text-sm text-gray-400">
														Budget: R
														{app.min_budget} - R
														{app.max_budget}
													</p>
												</div>
												<span
													className={`px-3 py-1 rounded-full text-xs ${getStatusColor(
														app.status
													)}`}
												>
													{getStatusEmoji(app.status)}{' '}
													{app.status.replace(
														'_',
														' '
													)}
												</span>
											</div>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<p className="text-gray-400">
													<span className="mr-1">
														📅
													</span>{' '}
													Move-in:{' '}
													{new Date(
														app.move_in_date
													).toLocaleDateString()}
												</p>
												<p className="text-gray-400">
													<span className="mr-1">
														📍
													</span>{' '}
													Areas:{' '}
													{app.preferred_areas?.join(
														', '
													)}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-12">
									No applications found. Start your housing
									search today!
								</p>
							)}
						</div>
					</motion.div>
				)}

				{activeTab === 'matches' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							Property Matches
						</h1>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{matches.length > 0 ? (
								matches.map((match) => (
									<div
										key={match.id}
										className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
									>
										<div className="flex justify-between items-start mb-4">
											<h3 className="text-white font-semibold">
												🏢{' '}
												{
													match.properties
														?.property_type
												}
											</h3>
											<span className="bg-green-400/10 text-green-400 px-3 py-1 rounded-full text-xs">
												⭐ {match.match_score}% Match
											</span>
										</div>
										<p className="text-gray-300 mb-2 flex items-center gap-1">
											<span>📍</span>{' '}
											{match.properties?.address}
										</p>
										<p className="text-blue-400 font-semibold mb-4">
											💰 R{match.properties?.price}/month
										</p>
										<div className="flex gap-4 text-sm text-gray-400 mb-4">
											<span>
												🛏️ {match.properties?.bedrooms}{' '}
												beds
											</span>
											<span>
												🚿 {match.properties?.bathrooms}{' '}
												baths
											</span>
											{match.properties?.furnished && (
												<span>🪑 Furnished</span>
											)}
										</div>
										<button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
											View Property Details
										</button>
									</div>
								))
							) : (
								<div className="col-span-2 text-center py-12">
									<p className="text-gray-400">
										No matches found yet. Complete your
										application to start matching!
									</p>
								</div>
							)}
						</div>
					</motion.div>
				)}

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
									<div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
										{profile?.full_name?.charAt(0)}
									</div>
									<div>
										<h2 className="text-2xl font-bold text-white">
											{profile?.full_name}
										</h2>
										<p className="text-gray-400">
											<span>📅</span> Member since{' '}
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
											🆔{' '}
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
									✏️ Edit Profile
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	)
}

export default TenantDashboard
