// pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../utils/Supabase'
import { useNavigate } from 'react-router-dom'

const AdminDashboard = () => {
	const [user, setUser] = useState(null)
	const [stats, setStats] = useState({
		totalUsers: 0,
		totalTenants: 0,
		totalLandlords: 0,
		totalProperties: 0,
		totalApplications: 0,
		pendingVerifications: 0
	})
	const [recentUsers, setRecentUsers] = useState([])
	const [pendingVerifications, setPendingVerifications] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('overview')
	const navigate = useNavigate()

	useEffect(() => {
		fetchAdminData()
	}, [])

	const fetchAdminData = async () => {
		try {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				navigate('/login')
				return
			}
			setUser(user)

			// Get total users count
			const { count: totalUsers } = await supabase
				.from('users')
				.select('*', { count: 'exact', head: true })

			// Get tenants count
			const { count: totalTenants } = await supabase
				.from('users')
				.select('*', { count: 'exact', head: true })
				.eq('user_type', 'tenant')

			// Get landlords count
			const { count: totalLandlords } = await supabase
				.from('users')
				.select('*', { count: 'exact', head: true })
				.eq('user_type', 'landlord')

			// Get properties count
			const { count: totalProperties } = await supabase
				.from('properties')
				.select('*', { count: 'exact', head: true })

			// Get applications count
			const { count: totalApplications } = await supabase
				.from('applications')
				.select('*', { count: 'exact', head: true })

			// Get pending verifications (users not verified)
			const { count: pendingVerifications } = await supabase
				.from('users')
				.select('*', { count: 'exact', head: true })
				.eq('is_verified', false)

			setStats({
				totalUsers: totalUsers || 0,
				totalTenants: totalTenants || 0,
				totalLandlords: totalLandlords || 0,
				totalProperties: totalProperties || 0,
				totalApplications: totalApplications || 0,
				pendingVerifications: pendingVerifications || 0
			})

			// Get recent users
			const { data: recentUsersData } = await supabase
				.from('users')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5)
			setRecentUsers(recentUsersData || [])

			// Get pending verifications list
			const { data: pendingData } = await supabase
				.from('users')
				.select('*')
				.eq('is_verified', false)
				.order('created_at', { ascending: false })
				.limit(10)
			setPendingVerifications(pendingData || [])
		} catch (error) {
			console.error('Error fetching admin data:', error)
		} finally {
			setLoading(false)
		}
	}

	const verifyUser = async (userId) => {
		try {
			const { error } = await supabase
				.from('users')
				.update({ is_verified: true })
				.eq('id', userId)

			if (error) throw error

			// Refresh data
			fetchAdminData()
		} catch (error) {
			console.error('Error verifying user:', error)
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
						Admin Dashboard
					</p>
				</div>

				{/* Admin Profile */}
				<div className="bg-gray-800/50 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
							A
						</div>
						<div>
							<p className="text-white font-medium">Admin</p>
							<p className="text-xs text-gray-400">
								{user?.email}
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
						onClick={() => setActiveTab('users')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'users'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">👥</span>
						<span>Users</span>
					</button>
					<button
						onClick={() => setActiveTab('verifications')}
						className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3
              ${
					activeTab === 'verifications'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">🛡️</span>
						<span>Verifications</span>
						{stats.pendingVerifications > 0 && (
							<span className="ml-auto bg-yellow-500 text-xs px-2 py-1 rounded-full">
								{stats.pendingVerifications}
							</span>
						)}
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
						<span>Properties</span>
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
							Admin Overview
						</h1>

						{/* Stats Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">👥</div>
								<p className="text-3xl font-bold text-white">
									{stats.totalUsers}
								</p>
								<p className="text-gray-400">Total Users</p>
								<div className="mt-2 text-sm">
									<span className="text-green-400">
										{stats.totalTenants} Tenants
									</span>
									<span className="text-gray-600 mx-2">
										|
									</span>
									<span className="text-purple-400">
										{stats.totalLandlords} Landlords
									</span>
								</div>
							</div>

							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">🏢</div>
								<p className="text-3xl font-bold text-white">
									{stats.totalProperties}
								</p>
								<p className="text-gray-400">
									Total Properties
								</p>
							</div>

							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">📄</div>
								<p className="text-3xl font-bold text-white">
									{stats.totalApplications}
								</p>
								<p className="text-gray-400">Applications</p>
							</div>

							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">🛡️</div>
								<p className="text-3xl font-bold text-white">
									{stats.pendingVerifications}
								</p>
								<p className="text-gray-400">
									Pending Verifications
								</p>
							</div>

							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">🤝</div>
								<p className="text-3xl font-bold text-white">
									0
								</p>
								<p className="text-gray-400">Active Matches</p>
							</div>

							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<div className="text-3xl mb-3">⏱️</div>
								<p className="text-3xl font-bold text-white">
									24
								</p>
								<p className="text-gray-400">
									Avg Response (hrs)
								</p>
							</div>
						</div>

						{/* Recent Users */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<h2 className="text-xl font-semibold text-white mb-4">
									Recent Users
								</h2>
								<div className="space-y-3">
									{recentUsers.map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
										>
											<div>
												<p className="text-white font-medium">
													{user.full_name}
												</p>
												<p className="text-xs text-gray-400">
													{user.email}
												</p>
											</div>
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													user.user_type === 'tenant'
														? 'bg-green-400/10 text-green-400'
														: user.user_type ===
														  'landlord'
														? 'bg-purple-400/10 text-purple-400'
														: 'bg-blue-400/10 text-blue-400'
												}`}
											>
												{user.user_type === 'tenant'
													? '👤 Tenant'
													: user.user_type ===
													  'landlord'
													? '🏢 Landlord'
													: '⚙️ Admin'}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Pending Verifications */}
							<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
								<h2 className="text-xl font-semibold text-white mb-4">
									Pending Verifications
								</h2>
								{pendingVerifications.length > 0 ? (
									<div className="space-y-3">
										{pendingVerifications
											.slice(0, 5)
											.map((user) => (
												<div
													key={user.id}
													className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
												>
													<div>
														<p className="text-white font-medium">
															{user.full_name}
														</p>
														<p className="text-xs text-gray-400">
															{user.email}
														</p>
													</div>
													<button
														onClick={() =>
															verifyUser(user.id)
														}
														className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
													>
														✅ Verify
													</button>
												</div>
											))}
									</div>
								) : (
									<p className="text-gray-400 text-center py-4">
										No pending verifications
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* Users Tab */}
				{activeTab === 'users' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							User Management
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<p className="text-gray-400 text-center py-12">
								User management interface coming soon...
							</p>
						</div>
					</motion.div>
				)}

				{/* Verifications Tab */}
				{activeTab === 'verifications' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							Pending Verifications
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							{pendingVerifications.length > 0 ? (
								<div className="space-y-3">
									{pendingVerifications.map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
										>
											<div className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
													{user.full_name?.charAt(0)}
												</div>
												<div>
													<p className="text-white font-medium">
														{user.full_name}
													</p>
													<p className="text-sm text-gray-400">
														{user.email} •{' '}
														{user.phone}
													</p>
													<p className="text-xs text-gray-500">
														Joined:{' '}
														{new Date(
															user.created_at
														).toLocaleDateString()}
													</p>
												</div>
											</div>
											<button
												onClick={() =>
													verifyUser(user.id)
												}
												className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
											>
												✅ Verify
											</button>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-400 text-center py-12">
									No pending verifications
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
							All Properties
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<p className="text-gray-400 text-center py-12">
								Properties management interface coming soon...
							</p>
						</div>
					</motion.div>
				)}

				{/* Applications Tab */}
				{activeTab === 'applications' && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className="text-3xl font-bold text-white mb-8">
							All Applications
						</h1>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
							<p className="text-gray-400 text-center py-12">
								Applications management interface coming soon...
							</p>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	)
}

export default AdminDashboard
