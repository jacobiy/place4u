// component/ProtectedRoute.jsx
import React, { useEffect, useState, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/Supabase'
import { resolveUserAccess } from '../hooks/useAuth'
import Loading from './loading'

const roleDashboardMap = {
	admin: '/admin',
	landlord: '/landlord',
	tenant: '/tenant',
	agent: '/agent'
}

/**
 * Fast local retrieval of the stored Supabase session user from localStorage.
 * This is only used to obtain the *authenticated user object* — it never
 * determines the role. The role is always resolved authoritatively from the
 * database in `resolveUserAccess`.
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

	// The `location` object is only needed to record where the user came from.
	// Keeping it in a ref (instead of the effect deps) stops the whole auth
	// check + subscription from tearing down and re-running on every navigation.
	const locationRef = useRef(location)
	locationRef.current = location

	// A transient auth failure surfaces a recoverable screen instead of either
	// an infinite "Authenticating…" spinner or a silent bounce to /login.
	const [authError, setAuthError] = useState(null)
	const [retryKey, setRetryKey] = useState(0)

	useEffect(() => {
		isMountedRef.current = true
		setAuthError(null)

		const checkAuth = async (activeUser) => {
			try {
				// 1. Resolve the authenticated user (Active user -> getSession -> stored session).
				let currentUser = activeUser
				if (!currentUser) {
					try {
						const sessionPromise = supabase.auth.getSession()
						const timeoutPromise = new Promise((resolve) =>
							setTimeout(() => resolve({ data: { session: null } }), 3000)
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

				// 2. Authoritative, fail-closed role + account-status resolution.
				//    Role is taken ONLY from public.users — never from localStorage,
				//    user_metadata, or the email string (all client-controlled).
				const access = await resolveUserAccess(currentUser)

				if (!isMountedRef.current) return

				if (!access.active) {
					// A transient failure (stalled request / timeout / network drop)
					// must never leave the app pinned on the auth spinner, nor silently
					// log the user out. Surface a recoverable screen and let them retry.
					if (access.reason === 'timeout' || access.reason === 'lookup-error') {
						setUser(currentUser)
						setUserType(null)
						setAuthError(access.reason)
						setLoading(false)
						return
					}

					// Definitive denial: no authoritative profile, or a disabled account.
					// Deny access entirely instead of guessing a role.
					setUserType(null)
					setUser(null)
					setLoading(false)

					if (access.reason === 'disabled') {
						await supabase.auth.signOut().catch(() => {})
					}
					navigate('/login', { replace: true, state: { from: locationRef.current } })
					return
				}

				setUserType(access.role)
				setLoading(false)

				if (allowedRoles && !allowedRoles.includes(access.role)) {
					const destination = roleDashboardMap[access.role] || '/login'
					navigate(destination, { replace: true })
				}
			} catch (err) {
				console.error('[ProtectedRoute] Auth check error:', err)
				if (isMountedRef.current) {
					setUserType(null)
					setAuthError('lookup-error')
					setLoading(false)
				}
			}
		}

		// Initial verification on mount.
		checkAuth()

		// 3. Multi-tab listener: detect cross-tab sign in / logout.
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			// This callback fires while the auth client holds its internal lock,
			// and `checkAuth` issues Supabase queries that re-enter that same
			// lock — which deadlocks the client permanently, so afterwards every
			// request hangs and all pages stay stuck loading. Defer to a
			// macrotask so the lock is released before we query Supabase.
			setTimeout(() => {
				if (!isMountedRef.current) return

				if (event === 'SIGNED_OUT' || !session?.user) {
					setUser(null)
					setUserType(null)
					setLoading(false)
					navigate('/login', { state: { from: locationRef.current }, replace: true })
					return
				}

				if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
					checkAuth(session.user)
				}
			}, 0)
		})

		return () => {
			isMountedRef.current = false
			subscription.unsubscribe()
		}
	}, [allowedRoles, navigate, retryKey])

	if (loading) {
		return <Loading fullScreen message="Authenticating your session..." />
	}

	// Transient auth failure — recoverable, never a dead end.
	if (authError) {
		return (
			<div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
				<div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 font-bold text-xl">
					!
				</div>
				<h2 className="text-lg font-semibold text-white mb-2">Couldn’t verify your session</h2>
				<p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
					We couldn’t reach Place4U to confirm your account. This is usually a brief
					connection issue — check your network and try again.
				</p>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => {
							setAuthError(null)
							setLoading(true)
							setRetryKey((key) => key + 1)
						}}
						className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
					>
						Try again
					</button>
					<button
						type="button"
						onClick={() => {
							supabase.auth.signOut().catch(() => {})
							navigate('/login', { replace: true })
						}}
						className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
					>
						Back to login
					</button>
				</div>
			</div>
		)
	}

	// If unauthenticated, redirect to login.
	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />
	}

	// If authenticated but the authoritative role doesn't match allowedRoles,
	// route to the matching dashboard (or login when no role is resolved).
	if (allowedRoles && !allowedRoles.includes(userType)) {
		const target = roleDashboardMap[userType] || '/login'
		return <Navigate to={target} replace />
	}

	return children
}

export default ProtectedRoute
