// component/ProtectedRoute.jsx
import React, { useEffect, useState, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/Supabase'
import { resolveUserRole } from '../hooks/useAuth'
import Loading from './loading'

const roleDashboardMap = {
	admin: '/admin',
	landlord: '/landlord',
	tenant: '/tenant',
	agent: '/agent'
}

/**
 * Fast local retrieval of stored Supabase session from localStorage
 * without waiting for asynchronous lock acquisitions.
 */
function getStoredLocalUser() {
	if (typeof window === 'undefined' || !window.localStorage) return null
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
				const item = localStorage.getItem(key)
				if (item) {
					const parsed = JSON.parse(item)
					const u = parsed?.user || parsed?.currentSession?.user
					if (u && u.id) return u
				}
			}
		}
	} catch {
		// Ignore parsing errors
	}
	return null
}

const ProtectedRoute = ({ children, allowedRoles }) => {
	const [loading, setLoading] = useState(true)
	const [user, setUser] = useState(null)
	const [userType, setUserType] = useState(null)
	const location = useLocation()
	const navigate = useNavigate()
	const isMountedRef = useRef(true)

	useEffect(() => {
		isMountedRef.current = true

		const checkAuth = async (activeUser) => {
			try {
				// 1. Check for local demo role first (allows instant preview of portals)
				const demoRole = localStorage.getItem('place4u_demo_role')
				if (demoRole) {
					if (!allowedRoles || allowedRoles.includes(demoRole)) {
						if (isMountedRef.current) {
							setUser({
								id: 'demo-user-id',
								email: `${demoRole}@place4u.co.za`,
								user_metadata: { full_name: `Demo ${demoRole.toUpperCase()}`, user_type: demoRole }
							})
							setUserType(demoRole)
							setLoading(false)
						}
						return
					}
				}

				// 2. Resolve currentUser (Active user -> getSession -> fast localStorage fallback)
				let currentUser = activeUser
				if (!currentUser) {
					try {
						const sessionPromise = supabase.auth.getSession()
						const timeoutPromise = new Promise((resolve) =>
							setTimeout(() => resolve({ data: { session: null } }), 1200)
						)
						const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise])
						currentUser = sessionData?.session?.user
					} catch {
						currentUser = null
					}
				}

				if (!currentUser) {
					currentUser = getStoredLocalUser()
				}

				if (!currentUser) {
					if (isMountedRef.current) {
						setUser(null)
						setUserType(null)
						setLoading(false)
					}
					return
				}

				if (isMountedRef.current) {
					setUser(currentUser)
				}

				// 3. Resolve role immediately using synchronous metadata, then upgrade if DB responds quickly
				const quickRole =
					currentUser.user_metadata?.user_type ||
					((currentUser.email || '').toLowerCase().includes('admin')
						? 'admin'
						: (currentUser.email || '').toLowerCase().includes('landlord')
						? 'landlord'
						: (currentUser.email || '').toLowerCase().includes('agent')
						? 'agent'
						: 'tenant')

				if (isMountedRef.current) {
					setUserType(quickRole)
					setLoading(false)

					if (allowedRoles && !allowedRoles.includes(quickRole)) {
						const destination = roleDashboardMap[quickRole] || '/login'
						navigate(destination, { replace: true })
						return
					}
				}

				// Authoritative background verification
				resolveUserRole(currentUser).then((authoritativeRole) => {
					if (isMountedRef.current && authoritativeRole && authoritativeRole !== quickRole) {
						setUserType(authoritativeRole)
						if (allowedRoles && !allowedRoles.includes(authoritativeRole)) {
							const destination = roleDashboardMap[authoritativeRole] || '/login'
							navigate(destination, { replace: true })
						}
					}
				}).catch(() => {})
			} catch (err) {
				console.error('[ProtectedRoute] Auth check error:', err)
				if (isMountedRef.current) {
					setLoading(false)
				}
			}
		}

		// Initial verification on mount
		checkAuth()

		// 4. Multi-tab listener: detect cross-tab sign in / logout
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
			if (!isMountedRef.current) return

			if (event === 'SIGNED_OUT' || !session?.user) {
				setUser(null)
				setUserType(null)
				setLoading(false)
				navigate('/login', { state: { from: location }, replace: true })
				return
			}

			if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
				await checkAuth(session.user)
			}
		})

		return () => {
			isMountedRef.current = false
			subscription.unsubscribe()
		}
	}, [allowedRoles, navigate, location])

	if (loading) {
		return <Loading fullScreen message="Authenticating your session..." />
	}

	// If unauthenticated, redirect to login
	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />
	}

	// If authenticated but role doesn't match allowedRoles, route to matching dashboard
	if (allowedRoles && !allowedRoles.includes(userType)) {
		const target = roleDashboardMap[userType] || '/login'
		return <Navigate to={target} replace />
	}

	return children
}

export default ProtectedRoute
