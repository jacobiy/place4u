// Login.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { FaGoogle, FaFacebook } from 'react-icons/fa'
import { Link, useNavigate, useLocation } from 'react-router-dom' // Add useLocation
import { supabase } from '../../utils/Supabase'

const Login = () => {
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		rememberMe: false
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')
	const navigate = useNavigate()
	const location = useLocation() // Get location for redirect after login
	const from = location.state?.from?.pathname || '/' // Where user tried to go

	// // Check if user is already logged in
	// useEffect(() => {
	// 	const checkUser = async () => {
	// 		const {
	// 			data: { user }
	// 		} = await supabase.auth.getUser()
	// 		if (user) {
	// 			// Fetch user type and redirect to appropriate dashboard
	// 			const { data: userData } = await supabase
	// 				.from('users')
	// 				.select('user_type')
	// 				.eq('id', user.id)
	// 				.single()

	// 			redirectToDashboard(userData?.user_type)
	// 		}
	// 	}
	// 	checkUser()
	// }, [navigate])

	const redirectToDashboard = (userType) => {
		switch (userType) {
			case 'admin':
				navigate('/admin')
				break
			case 'landlord':
				navigate('/landlord')
				break
			case 'tenant':
				navigate('/tenant')
				break
			case 'agent':
				navigate('/agent')
				break
			default:
				navigate('/') // Default to home if no role
		}
	}

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setLoading(true)
		setError('')
		setSuccessMessage('')

		try {
			// Validate inputs
			if (!formData.email || !formData.password) {
				throw new Error('Please fill in all fields')
			}

			// Attempt login with Supabase
			const { data, error } = await supabase.auth.signInWithPassword({
				email: formData.email,
				password: formData.password
			})

			if (error) throw error

			if (data.user) {
				// Check if email is verified
				// if (!data.user.email_confirmed_at) {
				// 	setError('Please verify your email before logging in')
				// 	// Optionally resend verification email
				// 	await supabase.auth.resend({
				// 		type: 'signup',
				// 		email: formData.email
				// 	})
				// 	return
				// }

				// Fetch user type from users table
				const { data: userData, error: userError } = await supabase
					.from('users')
					.select('user_type')
					.eq('id', data.user.id)
					.single()

				if (userError) {
					console.error('Error fetching user type:', userError)
					setError('Error loading user profile. Please try again.')
					return
				}

				// Redirect based on user type
				redirectToDashboard(userData?.user_type)
			}
		} catch (err) {
			console.error('Login error:', err)

			// Handle specific error messages
			if (err.message.includes('Invalid login credentials')) {
				setError('Invalid email or password')
			} else if (err.message.includes('Email not confirmed')) {
				setError('Please verify your email address before logging in')
			} else if (err.message.includes('rate limit')) {
				setError('Too many attempts. Please try again later.')
			} else {
				setError(err.message || 'Login failed. Please try again.')
			}
		} finally {
			setLoading(false)
		}
	}

	const handleForgotPassword = async () => {
		if (!formData.email) {
			setError('Please enter your email address first')
			return
		}

		setLoading(true)
		setError('')
		setSuccessMessage('')

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(
				formData.email,
				{
					redirectTo: `${window.location.origin}/reset-password`
				}
			)

			if (error) throw error

			// Show success message
			setSuccessMessage(
				'Password reset link sent to your email! Please check your inbox.'
			)
			setFormData((prev) => ({ ...prev, password: '' })) // Clear password field
		} catch (err) {
			console.error('Password reset error:', err)

			if (err.message.includes('rate limit')) {
				setError('Too many requests. Please try again later.')
			} else if (
				err.message.includes('email') &&
				err.message.includes('not found')
			) {
				setError('No account found with this email address.')
			} else {
				setError(
					err.message ||
						'Failed to send reset email. Please try again.'
				)
			}
		} finally {
			setLoading(false)
		}
	}

	const handleSocialLogin = async (provider) => {
		setLoading(true)
		setError('')
		setSuccessMessage('')

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: provider,
				options: {
					redirectTo: window.location.origin + '/auth/callback', // You'll need to handle this callback
					queryParams:
						provider === 'facebook'
							? {
									access_type: 'offline',
									prompt: 'consent'
							  }
							: {}
				}
			})

			if (error) throw error
		} catch (err) {
			console.error(`${provider} login error:`, err)
			setError(`${provider} login failed. Please try again.`)
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			{/* Background Pattern */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-5xl w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 shadow-2xl relative z-10 overflow-hidden"
			>
				<div className="grid grid-cols-1 lg:grid-cols-2">
					{/* Left image */}
					<div className="hidden lg:block relative">
						<img src="/download.png" alt="Place4U" className="h-full w-full object-cover" />
						<div className="absolute inset-0 bg-gradient-to-tr from-gray-900/80 via-gray-900/40 to-transparent" />
						<div className="absolute bottom-0 left-0 right-0 p-8">
							<h3 className="text-2xl font-bold text-white">Welcome back</h3>
							<p className="text-gray-200/80 text-sm mt-2">
								Sign in to manage your applications, payments, and messages.
							</p>
						</div>
					</div>

					{/* Right form */}
					<div className="p-8 space-y-8">
				{/* Header */}
				<div className="text-center">
					<Link to="/">
						<h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
							Place4U
						</h2>
					</Link>
					<h2 className="mt-6 text-3xl font-extrabold text-white">
						Welcome back
					</h2>
					<p className="mt-2 text-sm text-gray-400">
						Don't have an account?{' '}
						<Link
							to="/signup"
							className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
						>
							Sign up
						</Link>
					</p>
				</div>

				{/* Error Message */}
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm"
					>
						{error}
					</motion.div>
				)}

				{/* Success Message */}
				{successMessage && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm"
					>
						{successMessage}
					</motion.div>
				)}

				{/* Info Message for unverified emails */}
				{error && error.includes('verify your email') && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg text-sm mt-2"
					>
						<p>Check your inbox for the verification link.</p>
						<button
							onClick={async () => {
								try {
									await supabase.auth.resend({
										type: 'signup',
										email: formData.email
									})
									alert('Verification email resent!')
								} catch (err) {
									setError(
										'Failed to resend verification email'
									)
								}
							}}
							className="text-yellow-400 underline mt-1 inline-block"
						>
							Resend verification email
						</button>
					</motion.div>
				)}

				{/* Login Form */}
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						{/* Email Field */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Email address
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<HiMail className="h-5 w-5 text-gray-500" />
								</div>
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									required
									value={formData.email}
									onChange={handleChange}
									className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                           text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									placeholder="you@example.com"
									disabled={loading}
								/>
							</div>
						</div>

						{/* Password Field */}
						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Password
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<HiLockClosed className="h-5 w-5 text-gray-500" />
								</div>
								<input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									autoComplete="current-password"
									required
									value={formData.password}
									onChange={handleChange}
									className="block w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                           text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									placeholder="••••••••"
									disabled={loading}
								/>
								<button
									type="button"
									onClick={() =>
										setShowPassword(!showPassword)
									}
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									disabled={loading}
								>
									{showPassword ? (
										<HiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
									) : (
										<HiEye className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
									)}
								</button>
							</div>
						</div>
					</div>

					{/* Remember Me & Forgot Password */}
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<input
								id="rememberMe"
								name="rememberMe"
								type="checkbox"
								checked={formData.rememberMe}
								onChange={handleChange}
								className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
								disabled={loading}
							/>
							<label
								htmlFor="rememberMe"
								className="ml-2 block text-sm text-gray-300"
							>
								Remember me
							</label>
						</div>

						<div className="text-sm">
							<button
								type="button"
								onClick={handleForgotPassword}
								disabled={loading}
								className="font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
							>
								Forgot your password?
							</button>
						</div>
					</div>

					{/* Submit Button */}
					<motion.button
						type="submit"
						disabled={loading}
						whileHover={{ scale: loading ? 1 : 1.02 }}
						whileTap={{ scale: loading ? 1 : 0.98 }}
						className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg
                     text-white font-medium bg-gradient-to-r from-blue-600 to-blue-700
                     hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300
                     ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
					>
						{loading ? (
							<div className="flex items-center">
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
								Signing in...
							</div>
						) : (
							'Sign in'
						)}
					</motion.button>

					{/* Social Login */}
					<div className="mt-6">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-600"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-gray-800/50 text-gray-400">
									Or continue with
								</span>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-2 gap-3">
							<motion.button
								type="button"
								whileHover={{ scale: loading ? 1 : 1.05 }}
								whileTap={{ scale: loading ? 1 : 0.95 }}
								onClick={() => handleSocialLogin('google')}
								disabled={loading}
								className="w-full flex justify-center items-center gap-2 py-2.5 px-4 
                         bg-gray-700/50 hover:bg-gray-700 border border-gray-600 
                         rounded-lg text-gray-300 hover:text-white transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<FaGoogle className="h-5 w-5" />
								<span className="text-sm">Google</span>
							</motion.button>

							<motion.button
								type="button"
								whileHover={{ scale: loading ? 1 : 1.05 }}
								whileTap={{ scale: loading ? 1 : 0.95 }}
								onClick={() => handleSocialLogin('facebook')}
								disabled={loading}
								className="w-full flex justify-center items-center gap-2 py-2.5 px-4 
                         bg-gray-700/50 hover:bg-gray-700 border border-gray-600 
                         rounded-lg text-gray-300 hover:text-white transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<FaFacebook className="h-5 w-5" />
								<span className="text-sm">Facebook</span>
							</motion.button>
						</div>
					</div>
				</form>

				{/* Terms */}
				<p className="mt-4 text-center text-xs text-gray-500">
					By signing in, you agree to our{' '}
					<Link
						to="/terms"
						className="text-blue-400 hover:text-blue-300"
					>
						Terms of Service
					</Link>{' '}
					and{' '}
					<Link
						to="/privacy"
						className="text-blue-400 hover:text-blue-300"
					>
						Privacy Policy
					</Link>
				</p>
					</div>
				</div>
			</motion.div>
		</div>
	)
}

export default Login
