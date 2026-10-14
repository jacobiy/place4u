// changepassword.jsx - Dedicated Change Password page for Place4U
// Reached after the reset-password (email recovery) flow, and usable by any
// signed-in user to rotate their password. In recovery mode the user has just
// proven ownership via the emailed link, so the current password is not
// required; for normal, logged-in use the current password is re-verified
// before the change is applied.
import React, { useState, useEffect } from 'react'
import {
	HiLockClosed,
	HiEye,
	HiEyeOff,
	HiCheckCircle,
	HiShieldCheck,
	HiArrowLeft
} from 'react-icons/hi'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'

const ChangePassword = () => {
	const [showCurrent, setShowCurrent] = useState(false)
	const [showNew, setShowNew] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [formData, setFormData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	})
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const navigate = useNavigate()
	const location = useLocation()

	// A recovery session (arrived from the emailed reset link) may not know, or
	// need, the current password — the link itself is the proof of ownership.
	const isRecoveryFlow =
		Boolean(location.state?.recovery) ||
		/type=recovery/.test(window.location.hash) ||
		new URLSearchParams(location.search).get('recovery') === '1'

	// Guard the page behind an authenticated session and capture the account
	// email so the user can confirm they are changing the right account.
	useEffect(() => {
		let isMounted = true
		const loadSession = async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession()
			if (!session) {
				navigate('/login', { replace: true })
				return
			}
			if (isMounted) setEmail(session.user?.email || '')
		}
		loadSession()
		return () => {
			isMounted = false
		}
	}, [navigate])

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	// Route the user to the portal that matches their authoritative role.
	const redirectToPortal = async (userId) => {
		try {
			const { data: userData } = await supabase
				.from('users')
				.select('user_type')
				.eq('id', userId)
				.maybeSingle()
			const role = userData?.user_type
			if (role) {
				navigate(`/${role}`, { replace: true })
				return
			}
		} catch (queryErr) {
			console.warn('Role lookup failed after password change (non-fatal):', queryErr)
		}
		navigate('/login', { replace: true })
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setSuccess('')

		if (!isRecoveryFlow && !formData.currentPassword) {
			setError('Please enter your current password to confirm the change.')
			return
		}
		if (formData.newPassword.length < 8) {
			setError('New password must be at least 8 characters long.')
			return
		}
		if (formData.newPassword !== formData.confirmPassword) {
			setError('New passwords do not match.')
			return
		}
		if (!isRecoveryFlow && formData.newPassword === formData.currentPassword) {
			setError('Your new password must be different from your current password.')
			return
		}

		setLoading(true)
		try {
			// Re-verify the current password before rotating it. Supabase has no
			// dedicated "verify password" call, so we re-authenticate the user.
			if (!isRecoveryFlow) {
				const { error: verifyError } = await supabase.auth.signInWithPassword({
					email,
					password: formData.currentPassword
				})
				if (verifyError) {
					throw new Error('Your current password is incorrect.')
				}
			}

			const {
				data: { user },
				error: updateError
			} = await supabase.auth.updateUser({ password: formData.newPassword })
			if (updateError) throw updateError

			setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
			setSuccess('Password updated successfully. Taking you to your dashboard...')

			setTimeout(() => {
				redirectToPortal(user?.id)
			}, 1400)
		} catch (err) {
			setError(err.message || 'Failed to update password. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const inputClass =
		'w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors'

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 bg-grid-subtle relative selection:bg-blue-600 selection:text-white">
			<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/[0.06] blur-[140px] pointer-events-none -z-10" />

			<div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 relative z-10">
				<div className="text-center mb-6">
					<Link to="/" className="inline-flex items-center gap-2 mb-4 group">
						<img src="/logo.png" alt="Place4U" className="w-8 h-8 filter brightness-0 invert" />
						<span className="font-bold text-white text-lg">Place4U</span>
					</Link>
					<h2 className="font-serif-display text-2xl font-normal text-white">
						{isRecoveryFlow ? 'Update your password' : 'Change your password'}
					</h2>
					<p className="text-slate-400 text-xs mt-1">
						{isRecoveryFlow
							? 'Your password was reset. Set a new one below or continue to your dashboard.'
							: 'Confirm your current password, then choose a new one with at least 8 characters.'}
					</p>
					{email && (
						<p className="text-slate-500 text-[11px] mt-2">
							Signed in as <span className="text-slate-300 font-medium">{email}</span>
						</p>
					)}
				</div>

				{error && (
					<div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed flex items-center justify-between">
						<span>{error}</span>
						<button
							type="button"
							onClick={() => setError('')}
							className="text-red-400 hover:text-white ml-2 text-sm"
						>
							✕
						</button>
					</div>
				)}

				{success && (
					<div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-center gap-2">
						<HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
						<span>{success}</span>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					{!isRecoveryFlow && (
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
								Current Password
							</label>
							<div className="relative">
								<HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
								<input
									name="currentPassword"
									type={showCurrent ? 'text' : 'password'}
									required
									autoComplete="current-password"
									value={formData.currentPassword}
									onChange={handleChange}
									placeholder="••••••••••••"
									className={inputClass}
								/>
								<button
									type="button"
									onClick={() => setShowCurrent(!showCurrent)}
									className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
									aria-label="Toggle current password visibility"
								>
									{showCurrent ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
								</button>
							</div>
						</div>
					)}

					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
							New Password
						</label>
						<div className="relative">
							<HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
							<input
								name="newPassword"
								type={showNew ? 'text' : 'password'}
								required
								autoComplete="new-password"
								value={formData.newPassword}
								onChange={handleChange}
								placeholder="••••••••••••"
								className={inputClass}
							/>
							<button
								type="button"
								onClick={() => setShowNew(!showNew)}
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
								aria-label="Toggle new password visibility"
							>
								{showNew ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
							</button>
						</div>
					</div>

					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
							Confirm New Password
						</label>
						<div className="relative">
							<HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
							<input
								name="confirmPassword"
								type={showConfirm ? 'text' : 'password'}
								required
								autoComplete="new-password"
								value={formData.confirmPassword}
								onChange={handleChange}
								placeholder="••••••••••••"
								className={inputClass}
							/>
							<button
								type="button"
								onClick={() => setShowConfirm(!showConfirm)}
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
								aria-label="Toggle confirm password visibility"
							>
								{showConfirm ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
							</button>
						</div>
					</div>

					<div className="flex items-center gap-1.5 text-[11px] text-slate-500">
						<HiShieldCheck className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
						<span>Use a unique password you don’t reuse on other sites.</span>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="btn-tactile w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 mt-2"
					>
						{loading ? 'Updating password...' : 'Save new password'}
					</button>

					<div className="text-center pt-2">
						<Link
							to="/login"
							className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
						>
							<HiArrowLeft className="w-3.5 h-3.5" />
							Back to sign in
						</Link>
					</div>
				</form>
			</div>
		</div>
	)
}

export default ChangePassword
