// Login.jsx - Lead UI Designer & Robust Auth Resolution for Place4U
import React, { useState } from 'react'
import {
	HiMail,
	HiLockClosed,
	HiEye,
	HiEyeOff,
	HiShieldCheck,
	HiArrowRight,
	HiCheckCircle,
	HiX
} from 'react-icons/hi'
import { FaGoogle } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'
import ResetPasswordModal from '../../component/ResetPasswordModal'

const Login = ({ isModal = false, onSwitchToSignup }) => {
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		rememberMe: true
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')
	const [resetModalOpen, setResetModalOpen] = useState(false)
	// Set when Supabase reports the account exists but the email is not yet
	// confirmed, so we can offer a resend action.
	const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
	const [resending, setResending] = useState(false)
	const [resendMessage, setResendMessage] = useState('')
	const navigate = useNavigate()

	const redirectToDashboard = (userType) => {
		switch (userType?.toLowerCase()) {
			case 'admin':
				navigate('/admin')
				break
			case 'landlord':
				navigate('/landlord')
				break
			case 'agent':
				navigate('/agent')
				break
			case 'tenant':
			default:
				navigate('/tenant')
				break
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
		const trimmedEmail = formData.email.trim()
		const trimmedPassword = formData.password.trim()

		if (!trimmedEmail || !trimmedPassword) {
			setError('Please enter both email and password.')
			return
		}

		setLoading(true)
		setError('')
		setSuccessMessage('')
		setUnconfirmedEmail('')
		setResendMessage('')

		try {
			// Clear demo role when doing real credential login
			localStorage.removeItem('place4u_demo_role')

			const { data, error: signInError } = await supabase.auth.signInWithPassword({
				email: trimmedEmail,
				password: trimmedPassword
			})

			if (signInError) throw signInError

			if (data?.user) {
				// The public.users row is the single source of truth for role and
				// account state. We deliberately do NOT fall back to user_metadata
				// or the email address — both are client-controlled and spoofable.
				let userRole = null
				let userVerified = null
				try {
					const { data: userData } = await supabase
						.from('users')
						.select('user_type, is_verified')
						.eq('id', data.user.id)
						.maybeSingle()

					userRole = userData?.user_type || null
					userVerified = userData?.is_verified
				} catch (queryErr) {
					console.warn('Users table query error (non-fatal):', queryErr)
				}

				if (!userRole) {
					// Fail closed: without an authoritative profile we cannot know the
					// role, so we must not route the user into an elevated portal.
					setError('No profile found for this account. Please contact support.')
					await supabase.auth.signOut().catch(() => {})
					return
				}

				if (userRole === 'admin' && userVerified === false) {
					setError('This administrator account is not active. Please contact the platform owner.')
					await supabase.auth.signOut().catch(() => {})
					return
				}

				setSuccessMessage('Credentials verified! Loading your dashboard...')
				setTimeout(() => {
					redirectToDashboard(userRole)
				}, 400)
			}
		} catch (err) {
			console.error('Login error:', err)
			const msg = err.message || ''
			if (msg.includes('Invalid login credentials')) {
				setError('Invalid email or password. Please verify your details and try again.')
			} else if (msg.includes('Email not confirmed')) {
				setError('Your email is awaiting confirmation. Please check your inbox.')
				setUnconfirmedEmail(trimmedEmail)
			} else {
				setError(msg || 'Unable to log in. Please check your credentials.')
			}
		} finally {
			setLoading(false)
		}
	}

	const handleForgotPassword = () => {
		setError('')
		setSuccessMessage('')
		setResetModalOpen(true)
	}

	// Offer a resend when sign-in fails because the email isn't confirmed yet.
	const handleResendConfirmation = async () => {
		if (!unconfirmedEmail) return

		setResending(true)
		setResendMessage('')
		try {
			const { error: resendError } = await supabase.auth.resend({
				type: 'signup',
				email: unconfirmedEmail,
				options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
			})
			if (resendError) throw resendError
			setResendMessage('Confirmation email sent. Please check your inbox (and your spam folder).')
		} catch (err) {
			setResendMessage(err?.message || 'Could not resend the email. Please try again in a moment.')
		} finally {
			setResending(false)
		}
	}

	const handleSocialLogin = async (provider) => {
		setLoading(true)
		setError('')
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			})
			if (error) throw error
		} catch (err) {
			setError(`${provider} sign-in failed.`)
			setLoading(false)
		}
	}

	return (
		<div className={isModal ? 'w-full text-slate-100 selection:bg-blue-600 selection:text-white' : 'min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-grid-subtle relative selection:bg-blue-600 selection:text-white'}>
			{/* Ambient background light */}
			{!isModal && <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/[0.06] blur-[140px] pointer-events-none -z-10" />}

			<div className={isModal ? 'w-full grid grid-cols-1' : 'max-w-4xl w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12'}>
				{/* Cancel / Close 'X' Button */}
				{!isModal && <button
					type="button"
					onClick={() => navigate('/')}
					aria-label="Cancel login and return home"
					title="Cancel login and return home"
					className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-md group"
				>
					<HiX className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
				</button>}

				{/* Left Editorial Visual Column */}
				{!isModal && <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 bg-slate-950 border-r border-white/[0.08] overflow-hidden">
					<div
						className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
						style={{ backgroundImage: "url('/download.png')" }}
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

					{/* Brand Logo Lockup */}
					<div className="relative z-10">
						<Link to="/" className="inline-flex items-center group">
							<img
								src="/logo.png"
								alt="Place4U Logo"
								className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
							/>
						</Link>
					</div>

					{/* Brand Value Statement */}
					<div className="relative z-10 space-y-4">
						<div className="space-y-2">
							<span className="text-xs uppercase tracking-widest font-semibold text-blue-400">
								Place4U Real Estate
							</span>
							<h2 className="text-2xl font-bold font-serif text-white leading-tight">
								Your gateway to premium living spaces.
							</h2>
							<p className="text-xs text-slate-400 leading-relaxed">
								Access verified property listings, transparent leasing agreements, and direct communications in one unified platform.
							</p>
						</div>

						<div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-2">
							<HiShieldCheck className="w-4 h-4 text-emerald-400" />
							<span>POPIA Encrypted & Authenticated</span>
						</div>
					</div>
				</div>}

				{/* Right Form Column */}
				<div className={isModal ? 'w-full max-w-lg mx-auto p-5 sm:p-7 flex flex-col justify-between' : 'lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between'}>
					<div>
						{/* Mobile Brand Link */}
						{!isModal && <div className="lg:hidden flex items-center justify-between mb-6 pr-12">
							<Link to="/">
								<img src="/logo.png" alt="Place4U Logo" className="h-8 w-auto object-contain" />
							</Link>
							<span className="text-xs text-slate-400">Portal Login</span>
						</div>}

						{/* Form Header */}
						<div>
							<h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-white">
								Welcome back
							</h2>
							<p className="text-slate-400 text-xs sm:text-sm mt-1">
								Sign in to pick up where you left off.
							</p>
						</div>

						{/* Feedback Messages */}
						{error && (
							<div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed flex items-center justify-between">
								<span>{error}</span>
								<button onClick={() => setError('')} className="text-red-400 hover:text-white ml-2 text-sm">✕</button>
							</div>
						)}

						{unconfirmedEmail && (
							<div className="mt-3 p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
								{resendMessage ? (
									<span>{resendMessage}</span>
								) : (
									<>
										Didn’t get the email?{' '}
										<button
											type="button"
											onClick={handleResendConfirmation}
											disabled={resending}
											className="font-semibold text-blue-300 hover:text-white underline underline-offset-2 disabled:opacity-60"
										>
											{resending ? 'Sending…' : 'Resend confirmation email'}
										</button>
									</>
								)}
							</div>
						)}

						{successMessage && (
							<div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-center gap-2">
								<HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
								<span>{successMessage}</span>
							</div>
						)}

						{/* Authentication Form */}
						<form onSubmit={handleSubmit} className="mt-6 space-y-4">
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
									Email address
								</label>
								<div className="relative">
									<HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
									<input
										type="email"
										name="email"
										value={formData.email}
										onChange={handleChange}
										required
										placeholder="name@email.com"
										className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
									/>
								</div>
							</div>

							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
										Password
									</label>
									<button
										type="button"
										onClick={handleForgotPassword}
										className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
									>
										Forgot password?
									</button>
								</div>
								<div className="relative">
									<HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
									<input
										type={showPassword ? 'text' : 'password'}
										name="password"
										value={formData.password}
										onChange={handleChange}
										required
										placeholder="••••••••••••"
										className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
										aria-label="Toggle password visibility"
									>
										{showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
									</button>
								</div>
							</div>

							<div className="flex items-center justify-between pt-1">
								<label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
									<input
										type="checkbox"
										name="rememberMe"
										checked={formData.rememberMe}
										onChange={handleChange}
										className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
									/>
									<span>Keep me signed in</span>
								</label>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="btn-tactile w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
							>
								{loading ? (
									<span>Verifying credentials...</span>
								) : (
									<>
										<span>Sign in</span>
										<HiArrowRight className="w-4 h-4" />
									</>
								)}
							</button>
						</form>


						{/* Social Providers */}
						<div className="mt-6 pt-5 border-t border-white/[0.08]">
							<span className="text-[11px] text-slate-500 font-medium text-center block mb-3">
								Or continue with
							</span>

							<div className="grid grid-cols-1 gap-3">
								<button
									type="button"
									onClick={() => handleSocialLogin('google')}
									className="btn-tactile py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center justify-center gap-2 transition-all"
								>
									<FaGoogle className="w-3.5 h-3.5 text-red-400" />
									<span>Continue with Google</span>
								</button>
							</div>
						</div>
					</div>

					{/* Sign Up Redirect */}
					<div className="pt-6 mt-6 border-t border-white/[0.06] text-center text-xs text-slate-400">
						New to Place4U?{' '}
						{isModal ? (
							<button type="button" onClick={onSwitchToSignup} className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4">
								Create a profile
							</button>
						) : (
							<Link to="/signup" className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4">
								Create free profile
							</Link>
						)}
					</div>
				</div>
			</div>

			<ResetPasswordModal
				isOpen={resetModalOpen}
				onClose={() => setResetModalOpen(false)}
				initialEmail={formData.email}
				isModal={isModal}
				onSwitchToSignup={() => {
					setResetModalOpen(false)
					onSwitchToSignup?.()
				}}
			/>
		</div>
	)
}

export default Login
