// component/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom' // Add useLocation
import { supabase } from '../utils/Supabase'

const ProtectedRoute = ({ children, allowedRoles }) => {
	const [loading, setLoading] = useState(true)
	const [user, setUser] = useState(null)
	const [userType, setUserType] = useState(null)
	const [error, setError] = useState(false)
	const location = useLocation() // Get current location for redirect state

	useEffect(() => {
		const checkUser = async () => {
			try {
				// Get current user
				const {
					data: { user },
					error: userError
				} = await supabase.auth.getUser()

				if (userError || !user) {
					setError(true)
					setLoading(false)
					return
				}

				setUser(user)

				// Get user type from users table
				const { data: userData, error: profileError } = await supabase
					.from('users')
					.select('user_type')
					.eq('id', user.id)
					.single()

				if (profileError) {
					console.error('Error fetching user type:', profileError)
					setError(true)
				} else {
					setUserType(userData?.user_type)
				}
			} catch (err) {
				console.error('Auth check error:', err)
				setError(true)
			} finally {
				setLoading(false)
			}
		}

		checkUser()
	}, [])

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-400">Loading your dashboard...</p>
				</div>
			</div>
		)
	}

	if (error || !user) {
		// Redirect to login but save the location they tried to access
		return <Navigate to="/login" state={{ from: location }} replace />
	}

	// Check if user has allowed role
	if (allowedRoles && !allowedRoles.includes(userType)) {
		// Redirect to appropriate dashboard based on their actual role
		if (userType === 'admin') return <Navigate to="/admin" replace />
		if (userType === 'landlord') return <Navigate to="/landlord" replace />
		if (userType === 'tenant') return <Navigate to="/tenant" replace />
		return <Navigate to="/login" replace />
	}

	return children
}

export default ProtectedRoute
