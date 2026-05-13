// pages/TenantDashboard.jsx - Updated Sidebar Only
import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../utils/Supabase'
import { useNavigate } from 'react-router-dom'
import { Home, DollarSign, ChevronDown, Building2, Search, MessageSquare, Send, LogOut, FileText, Heart } from 'lucide-react'
import CustomApplication from './Tenant/Components/CustomApplication'

const TenantDashboard = () => {
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [applications, setApplications] = useState([])
	const [properties, setProperties] = useState([])	//Stores the properties from the database
	const [matches, setMatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")
	const [activeTab, setActiveTab] = useState('overview')
	const [showCustomForm, setShowCustomForm] = useState(false)
	const [propertyQuery, setPropertyQuery] = useState("")

	// Messaging
	const [contacts, setContacts] = useState([])
	const [contactQuery, setContactQuery] = useState("")
	const [selectedContact, setSelectedContact] = useState(null)
	const [threadMessages, setThreadMessages] = useState([])
	const [composer, setComposer] = useState("")
	const [messagesLoading, setMessagesLoading] = useState(false)
	const [missingMessagesTable, setMissingMessagesTable] = useState(false)
	const [messagesError, setMessagesError] = useState("")
	const chatListRef = useRef(null)
	const navigate = useNavigate()

	useEffect(() => {
		fetchUserData()
	}, [])

	useEffect(() => {
		if (activeTab !== 'messages') return
		loadContacts()
	}, [activeTab])

	useEffect(() => {
		if (activeTab !== 'messages') return
		requestAnimationFrame(() => {
			chatListRef.current?.scrollTo({
				top: chatListRef.current.scrollHeight,
				behavior: 'smooth'
			})
		})
	}, [threadMessages, activeTab])

	const closeCustomForm = () =>{
		setShowCustomForm(false)
	}
	const fetchUserData = async () => {
		try {
			setError("")
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

			// Browse properties (active listings)
			const { data: propertiesData, error: propertiesError } = await supabase
				.from('properties')
				.select('*')
				.eq('is_active', true)
				.order('created_at', { ascending: false })
				.limit(60)
			if (propertiesError) throw propertiesError
			setProperties(propertiesData || [])

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
			setError(error?.message || "Failed to load tenant dashboard.")
		} finally {
			setLoading(false)
		}
	}

	const loadContacts = async () => {
		try {
			setMessagesError("")
			setMessagesLoading(true)
			// Agents first, then admins (fallback)
			const { data: agents, error: agentsError } = await supabase
				.from('users')
				.select('id, full_name, email, user_type, created_at')
				.in('user_type', ['agent', 'admin'])
				.order('created_at', { ascending: false })
				.limit(100)
			if (agentsError) throw agentsError
			setContacts(agents || [])
		} catch (e) {
			setMessagesError(e?.message || "Failed to load contacts.")
		} finally {
			setMessagesLoading(false)
		}
	}

	const loadThread = async (other) => {
		if (!user?.id || !other?.id) return
		try {
			setMessagesError("")
			setMessagesLoading(true)
			const { data, error } = await supabase
				.from('messages')
				.select('*')
				.or(
					`and(sender_id.eq.${user.id},receiver_id.eq.${other.id}),and(sender_id.eq.${other.id},receiver_id.eq.${user.id})`
				)
				.order('created_at', { ascending: true })
				.limit(200)
			if (error) {
				if (error.code === '42P01') {
					setMissingMessagesTable(true)
					setThreadMessages([])
					return
				}
				throw error
			}
			setMissingMessagesTable(false)
			setThreadMessages(data || [])
		} catch (e) {
			setMessagesError(e?.message || "Failed to load messages.")
		} finally {
			setMessagesLoading(false)
		}
	}

	const sendMessage = async () => {
		if (!user?.id || !selectedContact?.id) return
		const content = composer.trim()
		if (!content) return

		setMessagesError("")
		setComposer("")

		const optimistic = {
			id: `temp-${Date.now()}`,
			sender_id: user.id,
			receiver_id: selectedContact.id,
			content,
			created_at: new Date().toISOString()
		}
		setThreadMessages((prev) => [...prev, optimistic])
		requestAnimationFrame(() => {
			chatListRef.current?.scrollTo({
				top: chatListRef.current.scrollHeight,
				behavior: 'smooth'
			})
		})

		try {
			const { data, error } = await supabase
				.from('messages')
				.insert([
					{
						sender_id: user.id,
						receiver_id: selectedContact.id,
						content
					}
				])
				.select()
				.single()
			if (error) throw error
			setThreadMessages((prev) =>
				prev.map((m) => (m.id === optimistic.id ? data : m))
			)
		} catch (e) {
			setMessagesError(e?.message || "Failed to send message.")
		}
	}

	const handleLogout = async () => {
		await supabase.auth.signOut()
		navigate('/')
	}

	const getInitials = (nameOrEmail) => {
		const raw = (nameOrEmail || "").trim()
		if (!raw) return "??"
		if (raw.includes("@")) return raw.slice(0, 2).toUpperCase()
		const parts = raw.split(/\s+/).filter(Boolean)
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
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

	// Get initials from full name (JD for John Doe)
	const getUserInitials = () => {
		if (!profile?.full_name) return 'JD'
		const nameParts = profile.full_name.trim().split(' ')
		if (nameParts.length >= 2) {
			return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
		}
		return profile.full_name[0].toUpperCase()
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
			</div>
		)
	}

	const propertyPlaceholder =
		"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60"

	const filteredProperties = (properties || []).filter((p) => {
		const q = propertyQuery.trim().toLowerCase()
		if (!q) return true
		return (
			(p.address || "").toLowerCase().includes(q) ||
			(p.area || "").toLowerCase().includes(q) ||
			(p.city || "").toLowerCase().includes(q) ||
			(p.property_type || "").toLowerCase().includes(q)
		)
	})

	const filteredContacts = (contacts || []).filter((c) => {
		const q = contactQuery.trim().toLowerCase()
		if (!q) return true
		return (
			(c.full_name || "").toLowerCase().includes(q) ||
			(c.email || "").toLowerCase().includes(q) ||
			(c.user_type || "").toLowerCase().includes(q)
		)
	})

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
			{/* Sidebar - Updated to match the attached image design */}
			<div className="fixed left-0 top-0 w-64 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col">
				{/* Logo */}
				<div className="p-6 pl-[6dvw] border-b border-gray-800">	{/*TODO: Update Logo Position properly*/}
					<img 
    				  src="/logo.png" 
    				  alt="Place4U Logo"
    				  className="mb-2"
    				  style={{
    				    height: "auto",
    				    width: "auto",
    				    maxHeight: "40px",
    				    filter: "brightness(0) invert(1)"
    				  }}
    				/>
				</div>

				{/* Welcome Section */}
				{/* <div className="px-6 pb-3">
					<p className="text-xs text-gray-500 uppercase tracking-wider">
						Welcome back,
					</p>
					<p className="text-white font-medium text-lg mt-0.5">
						{profile?.full_name?.split(' ')[0] || 'John'}
					</p>
				</div> */}

				{/* Applications Section */}
				<div className="px-6 py-3">
					{/* User Profile Card with Initials JD */}
					<div className="grid grid-cols-1 gap-4 items-center rounded-xl p-3 mb-4">
							<div className="w-30 h-30 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[32px] shadow-lg">
								{getUserInitials()}
							</div>
							<div className='flex items-center justify-between'>
								<div>
									<p className="text-white font-medium text-sm">
										{profile?.full_name || 'John Doe'}
									</p>
									<p className="text-xs text-blue-400 font-medium">
										Premium Tenant
									</p>
								</div>
								<button className='text-gray-400 hover:text-white cursor-pointer' onClick={() => setActiveTab('profile')}>
									<ChevronDown />
								</button>
							</div>
					</div>
				</div>

				{/* Properties Section */}
				{/* <div className="px-6 py-3">
					<p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
						Properties
					</p>
					
					{/* Search *
					<button className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 text-sm">
						<span className="text-lg">🔍</span>
						<span>Search</span>
					</button>
					
					{/* All Properties 
					<button className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 text-sm">
						<span className="text-lg">🏠</span>
						<span>All Properties</span>
					</button>
				</div> */}

				{/* Dashboard & Payments Section */}
				<div className="px-6 py-3">
					{/* <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
						Menu
					</p> */}
					
					{/* Dashboard / Overview */}
					<button
						onClick={() => setActiveTab('overview')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm mb-1 cursor-pointer
              ${
					activeTab === 'overview'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<Home size={18} />
						<span>Dashboard</span>
					</button>
					
					{/* Payments */}
					<button
						onClick={() => setActiveTab('payments')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm cursor-pointer
              ${
					activeTab === 'payments'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<DollarSign size={18} />
						<span>Payments</span>
					</button>

					{/* Browse Properties */}
					<button
						onClick={() => setActiveTab('properties')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm mt-1 cursor-pointer
              ${
					activeTab === 'properties'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<Building2 size={18} />
						<span>Browse Properties</span>
					</button>

					{/* Messages */}
					<button
						onClick={() => setActiveTab('messages')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm mt-1 cursor-pointer
              ${
					activeTab === 'messages'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<MessageSquare size={18} />
						<span>Messages</span>
					</button>
				</div>

				{/* Applications Tab Button (for the applications section) */}
				<div className="px-6 py-3 mt-2">
					{/*<button
						onClick={() => setActiveTab('applications')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm
              ${
					activeTab === 'applications'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">📄</span>
						<span>My Applications</span>
					</button>
					
					<button
						onClick={() => setActiveTab('matches')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm mt-1
              ${
					activeTab === 'matches'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">👁️</span>
						<span>Matches</span>
					</button>*/}
					
					{/* <button
						onClick={() => setActiveTab('profile')}
						className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm mt-1
              ${
					activeTab === 'profile'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-800'
				}`}
					>
						<span className="text-lg">👤</span>
						<span>Profile</span>
					</button> */}
				</div>

				{/* Spacer */}
				<div className="flex-1"></div>

				{/* Sign Out Button */}
				<div className="p-6 pt-0">
					<button
						onClick={handleLogout}
						className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
					>
						<LogOut size={16} />
						<span>Sign Out</span>
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className="ml-64 p-8 max-w-7xl">
				{error && (
					<div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl">
						{error}
					</div>
				)}
				{activeTab === 'overview' && (
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
						<div className="mb-8">
							<p className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Tenant Portal</p>
							<h1 className="text-3xl font-bold text-white mt-2">
								Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}!
							</h1>
							<p className="text-slate-400 text-sm mt-2">Track your applications, saved homes, and messages.</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
							<div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
								<div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center">
									<FileText size={18} />
								</div>
								<div>
									<p className="text-slate-400 text-xs">Applications</p>
									<p className="text-white text-2xl font-bold">{applications.length}</p>
								</div>
							</div>
							<div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
								<div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-300 flex items-center justify-center">
									<Building2 size={18} />
								</div>
								<div>
									<p className="text-slate-400 text-xs">Available Properties</p>
									<p className="text-white text-2xl font-bold">{properties.length}</p>
								</div>
							</div>
							<div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
								<div className="w-11 h-11 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center">
									<Heart size={18} />
								</div>
								<div>
									<p className="text-slate-400 text-xs">Matches</p>
									<p className="text-white text-2xl font-bold">{matches.length}</p>
								</div>
							</div>
						</div>
						{/* Stats Cards */}
						<div className=''>
							<h2 className="text-xl font-semibold text-white mb-4">
								Applications
							</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
							{applications.length === 0 ?(
								<p className="text-gray-400 text-center py-8">
									No Applications yet.{' '}
									<button className="text-blue-400 hover:underline">
										Please make an application
									</button>
								</p>
							):(
								applications.map((app)=>{
									<div key={app.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
										<button>View</button>
									</div>
								})
							)}
							<div className='custom-application '>
								<button onClick={()=>setShowCustomForm(true)} className='bg-blue-600 text-white p-2 rounded-xl cursor-pointer'>Custom Application</button>
							</div>
							{/* <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
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
							</div> */}
						</div>
						</div>

						{/* Recent Applications */}
						<div className="">
							<div className='flex items-center justify-between'>
								<h2 className="text-xl font-semibold text-white mb-4">Properties</h2>
								<div className='flex gap-2'>
									<input type='text' placeholder='Search'className='w-full px-4 py-2 border border-[#4f7ef8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-500'/>
									<select className='w-full px-4 py-2 border border-[#4f7ef8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-500'>
										<option className='text-gray-500 rounded-xl p-2 border border-gray-700'>All Properties</option>
									</select>
								</div>
							</div>

							{properties.length === 0 ? (
								<p className="text-gray-400 text-center py-8">
									No properties yet.{' '}
									<button className="text-blue-400 hover:underline">
										Please try again later
									</button>
								</p>
							):(
								properties.map((property) => {
									<div key={property.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
										<button>Apply</button>
									</div>
								})
							)}

							{/* {applications.length > 0 ? (
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
							)} */}
						</div>
					</motion.div>
				)}

				{activeTab === 'properties' && (
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
						<div className="flex items-end justify-between mb-6">
							<div>
								<h1 className="text-3xl font-bold text-white">Browse Properties</h1>
								<p className="text-gray-400 mt-1">
									View active listings. When you're ready, submit an application and our agents will help shortlist options.
								</p>
							</div>
							<button
								onClick={() => setShowCustomForm(true)}
								className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-colors"
							>
								Submit Application
							</button>
						</div>

						<div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 mb-6">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
								<input
									value={propertyQuery}
									onChange={(e) => setPropertyQuery(e.target.value)}
									placeholder="Search by address, area, city, or type..."
									className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
								/>
							</div>
						</div>

						{filteredProperties.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
								{filteredProperties.map((p) => (
									<div key={p.id} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
										<div className="h-40 w-full bg-gray-900/40">
											<img
												src={p.image_url || propertyPlaceholder}
												alt={p.address}
												className="w-full h-full object-cover"
											/>
										</div>
										<div className="p-5">
											<div className="flex items-start justify-between gap-3 mb-2">
												<div>
													<p className="text-white font-semibold capitalize">
														🏠 {p.property_type}
													</p>
													<p className="text-gray-400 text-sm mt-1">
														📍 {p.area}, {p.city}{p.province ? `, ${p.province}` : ""}
													</p>
												</div>
												<span className="bg-blue-400/10 text-blue-300 px-3 py-1 rounded-full text-xs whitespace-nowrap">
													R{Number(p.price).toLocaleString()}/mo
												</span>
											</div>

											<p className="text-gray-300 text-sm mb-4">
												{p.address}
											</p>

											<div className="flex flex-wrap gap-2 text-xs text-gray-300">
												{typeof p.bedrooms === "number" && (
													<span className="bg-gray-900/40 border border-gray-700 px-2 py-1 rounded-lg">🛏️ {p.bedrooms} bed</span>
												)}
												{typeof p.bathrooms === "number" && (
													<span className="bg-gray-900/40 border border-gray-700 px-2 py-1 rounded-lg">🚿 {p.bathrooms} bath</span>
												)}
												{p.furnished && (
													<span className="bg-gray-900/40 border border-gray-700 px-2 py-1 rounded-lg">🪑 Furnished</span>
												)}
												{p.pet_friendly && (
													<span className="bg-gray-900/40 border border-gray-700 px-2 py-1 rounded-lg">🐾 Pet friendly</span>
												)}
												{p.available_from && (
													<span className="bg-gray-900/40 border border-gray-700 px-2 py-1 rounded-lg">
														📅 {new Date(p.available_from).toLocaleDateString()}
													</span>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="bg-gray-800/40 border border-gray-700 rounded-xl p-10 text-center">
								<p className="text-gray-300 font-medium">No properties found</p>
								<p className="text-gray-500 text-sm mt-2">Try a different search, or submit an application so we can match you.</p>
								<div className="mt-6">
									<button
										onClick={() => setShowCustomForm(true)}
										className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-colors"
									>
										Submit Application
									</button>
								</div>
							</div>
						)}
					</motion.div>
				)}

				{activeTab === 'messages' && (
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
						<div className="flex items-end justify-between mb-6">
							<div>
								<h1 className="text-3xl font-bold text-white">Messages</h1>
								<p className="text-gray-400 mt-1">
									Chat with Place4U agents about your application and shortlisted options.
								</p>
							</div>
							<button
								onClick={loadContacts}
								className="bg-gray-800/60 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg border border-gray-700 transition-colors"
							>
								Refresh
							</button>
						</div>

						{missingMessagesTable && (
							<div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 px-4 py-3 rounded-xl">
								Messaging backend not set up. Create a `public.messages` table with
								(sender_id, receiver_id, content, created_at) to enable chat.
							</div>
						)}

						{messagesError && (
							<div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl">
								{messagesError}
							</div>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Contacts */}
							<div className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden">
								<div className="p-4 border-b border-gray-700">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
										<input
											value={contactQuery}
											onChange={(e) => setContactQuery(e.target.value)}
											placeholder="Search agents..."
											className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
										/>
									</div>
								</div>

								<div className="max-h-[62vh] overflow-y-auto">
									{messagesLoading && contacts.length === 0 ? (
										<p className="p-4 text-gray-400">Loading...</p>
									) : filteredContacts.length === 0 ? (
										<p className="p-4 text-gray-400">No agents found.</p>
									) : (
										filteredContacts.map((c) => {
											const active = selectedContact?.id === c.id
											return (
												<button
													key={c.id}
													onClick={() => {
														setSelectedContact(c)
														loadThread(c)
													}}
													className={`w-full text-left p-4 border-b border-gray-700 flex items-center gap-3 transition-colors ${
														active ? 'bg-blue-600/10' : 'hover:bg-gray-700/20'
													}`}
												>
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow">
														{getInitials(c.full_name || c.email)}
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-white font-semibold truncate">
															{c.full_name || c.email}
														</p>
														<p className="text-gray-400 text-xs truncate">
															{c.user_type}
														</p>
													</div>
												</button>
											)
										})
									)}
								</div>
							</div>

							{/* Chat */}
							<div className="lg:col-span-2 bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
								<div className="p-4 border-b border-gray-700 flex items-center justify-between">
									<div>
										<p className="text-white font-semibold">
											{selectedContact ? (selectedContact.full_name || selectedContact.email) : 'Select an agent'}
										</p>
										<p className="text-gray-400 text-xs">
											{selectedContact ? selectedContact.email : 'Choose a contact on the left to start chatting.'}
										</p>
									</div>
								</div>

								<div ref={chatListRef} className="flex-1 p-4 overflow-y-auto">
									{!selectedContact ? (
										<p className="text-gray-400 text-center py-16">Pick an agent to view the conversation.</p>
									) : threadMessages.length === 0 ? (
										<p className="text-gray-400 text-center py-16">No messages yet. Say hello.</p>
									) : (
										<div className="space-y-3">
											{threadMessages.map((m) => {
												const mine = m.sender_id === user?.id
												return (
													<div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
														<div
															className={`max-w-[78%] px-3 py-2 rounded-2xl border text-sm ${
																mine
																	? 'bg-blue-600/20 border-blue-500/30 text-gray-100'
																	: 'bg-gray-900/40 border-gray-700 text-gray-100'
															}`}
														>
															<p className="whitespace-pre-wrap">{m.content}</p>
															<p className="text-[10px] text-gray-400 mt-1 text-right">
																{m.created_at ? new Date(m.created_at).toLocaleString() : ''}
															</p>
														</div>
													</div>
												)
											})}
										</div>
									)}
								</div>

								<div className="p-4 border-t border-gray-700">
									<div className="flex gap-3 items-end">
										<textarea
											rows={2}
											value={composer}
											onChange={(e) => setComposer(e.target.value)}
											disabled={!selectedContact}
											placeholder={selectedContact ? 'Type a message...' : 'Select an agent to chat...'}
											className="w-full resize-none px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) {
													e.preventDefault()
													sendMessage()
												}
											}}
										/>
										<button
											onClick={sendMessage}
											disabled={!selectedContact || !composer.trim()}
											className={`px-4 py-2 rounded-lg flex items-center gap-2 border transition-colors ${
												!selectedContact || !composer.trim()
													? 'bg-gray-700/30 text-gray-500 border-gray-700 cursor-not-allowed'
													: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/30'
											}`}
										>
											<Send size={16} />
											Send
										</button>
									</div>
								</div>
							</div>
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

				{activeTab === 'payments' && (
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
						<div className="flex items-center justify-center mt-6">
							<h1 className="text-3xl font-bold text-white mb-8">Payment History</h1>
						</div>
						<div className='flex items-center justify-end'>
							<button className='bg-[#4f7ef8] hover:bg-[#3d6be0] text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-300 cursor-pointer'>
								New Payment
							</button>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 mt-4 border border-gray-700">
							<p className="text-gray-400 text-center py-12">
								Payment history and methods will appear here.
							</p>
						</div>
					</motion.div>
				)}
				{showCustomForm && (
					<CustomApplication 
						onCancel={closeCustomForm}
					/>
				)}
			</div>
		</div>
	)
}

export default TenantDashboard
