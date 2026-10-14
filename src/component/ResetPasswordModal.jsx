// ResetPasswordModal.jsx - Password reset request dialog for Place4U
// Opens from the login page's "Forgot password?" affordance. Sends a
// Supabase recovery email and keeps the sign-in / create-account paths
// reachable so the user is never stranded inside the dialog.
import React, { useEffect, useState } from 'react'
import {
	HiMail,
	HiX,
	HiCheckCircle,
	HiArrowLeft,
	HiUserAdd,
	HiShieldCheck
} from 'react-icons/hi'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/Supabase'

const ResetPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
	const [email, setEmail] = useState(initialEmail)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	// Keep the field in sync with whatever the user already typed on the
	// login form, and clear transient feedback each time the dialog opens.
	useEffect(() => {
		if (isOpen) {
			setEmail(initialEmail || '')
			setError('')
			setSuccess('')
		}
	}, [isOpen, initialEmail])

	useEffect(() => {
		if (!isOpen) return undefined

		const originalOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		const handleKeyDown = (e) => {
			if (e.key === 'Escape' && !loading) onClose()
		}
		window.addEventListener('keydown', handleKeyDown)

		return () => {
			document.body.style.overflow = originalOverflow
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, loading, onClose])

	if (!isOpen) return null

	const handleSubmit = async (e) => {
		e.preventDefault()
		const trimmedEmail = email.trim()

		if (!trimmedEmail) {
			setError('Please enter your email address to receive reset instructions.')
			return
		}

		setLoading(true)
		setError('')
		setSuccess('')

		try {
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(
				trimmedEmail,
				{ redirectTo: `${window.location.origin}/reset-password` }
			)
			if (resetError) throw resetError
			setSuccess(
				'Reset link sent. Check your inbox for the link to set a new password.'
			)
		} catch (err) {
			setError(err.message || 'Failed to send reset link. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
			style={{ animation: 'alertBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
			onClick={() => {
				if (!loading) onClose()
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="reset-password-title"
				onClick={(e) => e.stopPropagation()}
				className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 relative overflow-hidden"
				style={{ animation: 'alertModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
			>
				<div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-700" />

				<button
					type="button"
					onClick={onClose}
					disabled={loading}
					aria-label="Close password reset dialog"
					className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-50"
				>
					<HiX className="w-5 h-5" />
				</button>

				<div className="p-6 sm:p-8">
					<div className="mb-6">
						<div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
							<HiMail className="w-6 h-6" />
						</div>
						<h2
							id="reset-password-title"
							className="font-serif-display text-2xl font-normal text-white"
						>
							Reset your password
						</h2>
						<p className="text-slate-400 text-xs mt-1 leading-relaxed">
							Enter the email linked to your account and we will send you a secure link to set a new password.
						</p>
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
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
								Email Address
							</label>
							<div className="relative">
								<HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
								<input
									type="email"
									name="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									placeholder="you@place4u.co.za"
									className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="btn-tactile w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 disabled:opacity-60"
						>
							{loading ? 'Sending reset link...' : 'Send reset link'}
						</button>
					</form>

					<div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
						<HiShieldCheck className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
						<span>Reset links expire shortly and can only be used once.</span>
					</div>

					<div className="mt-6 pt-6 border-t border-white/[0.08] space-y-3 text-center text-xs text-slate-400">
						<Link
							to="/login"
							onClick={onClose}
							className="inline-flex items-center justify-center gap-2 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
						>
							<HiArrowLeft className="w-4 h-4" />
							Back to sign in
						</Link>

						<div>
							Don’t have an account yet?{' '}
							<Link
								to="/signup"
								onClick={onClose}
								className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors"
							>
								<HiUserAdd className="w-3.5 h-3.5" />
								Create free account
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default ResetPasswordModal
