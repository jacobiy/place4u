// ResetPassword.jsx - Lead UI Designer Overhaul for Place4U
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
	HiLockClosed,
	HiEye,
	HiEyeOff,
	HiCheckCircle,
	HiExclamationCircle,
	HiRefresh
} from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'

/**
 * Read the outcome Supabase appended to the recovery redirect.
 *
 * On a SUCCESSFUL recovery the client rewrites the URL to
 * `#access_token=…&type=recovery` and clears the fragment once it has consumed
 * it, so by the time this page renders the fragment is usually already gone and
 * the session is in storage. On a REJECTED link (expired, already used, or
 * consumed by a mail scanner prefetching it) nothing is cleared and the reason
 * is left behind as `#error=access_denied&error_code=otp_expired&error_description=…`.
 * Reading that is the difference between telling the user their link expired and
 * silently bouncing them back to the sign-in page.
 */
function readRecoveryUrlError() {
	if (typeof window === 'undefined') return null

	const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
	const queryParams = new URLSearchParams(window.location.search)
	const get = (key) => hashParams.get(key) || queryParams.get(key)

	const error = get('error')
	const code = get('error_code')
	const description = get('error_description')
	if (!error && !code && !description) return null

	return { code: code || '', description: description || error || '' }
}

/**
 * The project's Reset Password email template links to
 *
 *     {{ .SiteURL }}/reset-password?token={{ .TokenHash }}
 *
 * i.e. `/reset-password?token=<sha256 hex>` — a customised template that skips
 * Supabase's `/auth/v1/verify` endpoint, instead of the default
 * `#access_token=…&type=recovery` fragment. The auth client only auto-parses the
 * fragment (implicit flow) or `?code=…` (PKCE), so a query-string token is
 * invisible to `detectSessionInUrl` and no session would ever be created — which
 * is why this page used to end up back at /login.
 *
 * The token has to be exchanged explicitly with verifyOtp(). It is single-use, so
 * one exchange is shared for the whole page load: a re-render or a React
 * StrictMode double-mount must not submit the same token twice.
 *
 * If that template is ever changed back to `{{ .ConfirmationURL }}`, this
 * exchange simply stops running (`handled: false`) and the implicit flow above
 * takes over — but the `redirect_to` origin must then be allow-listed in the
 * Supabase project. Keep the two in sync.
 */
let recoveryExchange = null

function readRecoveryToken() {
	if (typeof window === 'undefined') return null
	const params = new URLSearchParams(window.location.search)
	// `token` is the usual template variable name; `token_hash` is the other
	// spelling seen in the wild, so accept either.
	return params.get('token') || params.get('token_hash') || null
}

function exchangeRecoveryToken() {
	const token = readRecoveryToken()
	if (!token) return Promise.resolve({ handled: false, error: null, session: null })

	// Join the in-flight (or already finished) attempt for this exact token.
	if (recoveryExchange?.token === token) return recoveryExchange.promise

	const promise = (async () => {
		try {
			const { data, error } = await supabase.auth.verifyOtp({
				token_hash: token,
				type: 'recovery'
			})
			if (error) return { handled: true, error, session: null }

			// The token has served its purpose — keep it out of the address bar, the
			// history entry and any Referer header sent to a third party.
			window.history.replaceState(window.history.state, '', window.location.pathname)
			return { handled: true, error: null, session: data?.session || null }
		} catch (err) {
			return { handled: true, error: err, session: null }
		}
	})()

	recoveryExchange = { token, promise }
	return promise
}

function describeRecoveryTokenError(error) {
	const message = String(error?.message || '')
	if (error?.code === 'otp_expired' || /expired|invalid|already/i.test(message)) {
		return 'That reset link has expired or has already been used. These links are single-use and time-limited.'
	}
	return message || 'That reset link could not be verified.'
}

/** Shared chrome so the verifying / expired / form states cannot drift apart. */
function AuthShell({ title, subtitle, children }) {
	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 bg-grid-subtle relative selection:bg-blue-600 selection:text-white">
			<div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80">
				<div className="text-center mb-6">
					<Link to="/" className="inline-flex items-center gap-2 mb-4 group">
						<img src="/logo.png" alt="Place4U" className="w-8 h-8 filter brightness-0 invert" />
						<span className="font-bold text-white text-lg">Place4U</span>
					</Link>
					<h2 className="font-serif-display text-2xl font-normal text-white">{title}</h2>
					<p className="text-slate-400 text-xs mt-1">{subtitle}</p>
				</div>
				{children}
			</div>
		</div>
	)
}

const ResetPassword = () => {
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [formData, setFormData] = useState({
		password: '',
		confirmPassword: ''
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	// 'verifying' -> the emailed link is still being resolved
	// 'ready'     -> we hold a session, the form is usable
	// 'expired'   -> the link was rejected; offer a fresh one instead of bouncing
	const [status, setStatus] = useState('verifying')
	const [linkError, setLinkError] = useState('')
	const [resendEmail, setResendEmail] = useState('')
	const [resending, setResending] = useState(false)
	const [resent, setResent] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		let cancelled = false
		let decided = false
		let graceTimer = null

		const accept = () => {
			if (cancelled || decided) return
			decided = true
			setStatus('ready')
		}

		const giveUp = (message) => {
			if (cancelled || decided) return
			decided = true
			setLinkError(message)
			setStatus('expired')
		}

		// Returns true once the outcome is known, false while it is still pending.
		const evaluate = async () => {
			// Redeem `?token=…` from a customised reset email before anything else.
			// It must win over any session already in storage: the link is proof of
			// ownership of the account it names, so it has to switch the session to
			// that account — otherwise whoever is signed in on this browser would be
			// the one whose password gets reset. `handled: false` means there was no
			// such token, so fall through to the standard flows.
			const exchange = await exchangeRecoveryToken()
			if (cancelled || decided) return true

			if (exchange.handled) {
				if (exchange.session) {
					accept()
					return true
				}
				if (exchange.error) {
					giveUp(describeRecoveryTokenError(exchange.error))
					return true
				}
			}

			// Implicit flow (`#access_token=…&type=recovery`): the client has already
			// created the session during initialisation, so finding one is the signal.
			const {
				data: { session }
			} = await supabase.auth.getSession()
			if (cancelled || decided) return true

			if (session) {
				accept()
				return true
			}

			const urlError = readRecoveryUrlError()
			if (urlError) {
				giveUp(
					urlError.code === 'otp_expired'
						? 'That reset link has expired or has already been used. These links are single-use and time-limited.'
						: urlError.description || 'That reset link is no longer valid.'
				)
				return true
			}

			return false
		}

		// The client resolves the redirect during initialisation and then emits
		// PASSWORD_RECOVERY, which is the authoritative signal for this page. This
		// callback only reads its own arguments — issuing a Supabase query inside
		// it would re-enter the auth lock and deadlock the client (see useAuth.js).
		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
				accept()
			}
		})

		evaluate().then((settled) => {
			if (settled || cancelled) return
			// Nothing yet and no error in the URL: the client may simply not have
			// finished parsing the link. Give it a window before declaring the link
			// dead — redirecting on the first null session is what broke valid links.
			graceTimer = setTimeout(async () => {
				const late = await evaluate()
				if (!late && !cancelled && !decided) {
					giveUp('We could not verify that reset link. Request a new one below.')
				}
			}, 3000)
		})

		return () => {
			cancelled = true
			if (graceTimer) clearTimeout(graceTimer)
			data?.subscription?.unsubscribe()
		}
	}, [])

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: value
		}))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setLoading(true)
		setError('')
		setSuccess('')

		try {
			if (formData.password.length < 8) {
				throw new Error('Password must be at least 8 characters long.')
			}

			if (formData.password !== formData.confirmPassword) {
				throw new Error('Passwords do not match.')
			}

			const { error } = await supabase.auth.updateUser({
				password: formData.password
			})

			if (error) throw error

			setSuccess('Password updated successfully! Continuing to your account...')
			setTimeout(() => {
				navigate('/change-password', { state: { recovery: true }, replace: true })
			}, 1800)
		} catch (err) {
			setError(err.message || 'Failed to update password. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const handleResend = async (e) => {
		e.preventDefault()
		const trimmed = resendEmail.trim()
		if (!trimmed) {
			setError('Enter the email address on the account to receive a new link.')
			return
		}

		setResending(true)
		setError('')
		try {
			const { error: resendError } = await supabase.auth.resetPasswordForEmail(trimmed, {
				redirectTo: `${window.location.origin}/reset-password`
			})
			if (resendError) throw resendError
			setResent(true)
		} catch (err) {
			setError(err.message || 'Could not send a new link. Please try again.')
		} finally {
			setResending(false)
		}
	}

	if (status === 'verifying') {
		return (
			<AuthShell title="Set New Password" subtitle="Checking your reset link…">
				<div className="py-10 flex flex-col items-center gap-3 text-center">
					<span className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
					<p className="text-slate-400 text-xs">Verifying your reset link…</p>
				</div>
			</AuthShell>
		)
	}

	if (status === 'expired') {
		return (
			<AuthShell title="Link Expired" subtitle="This reset link can no longer be used.">
				<div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2">
					<HiExclamationCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
					<span>{linkError}</span>
				</div>

				{error && (
					<div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
						{error}
					</div>
				)}

				{resent ? (
					<div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-start gap-2">
						<HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
						<span>
							A new link is on its way. Open it promptly — these links are single-use and
							time-limited.
						</span>
					</div>
				) : (
					<form onSubmit={handleResend} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
								Email Address
							</label>
							<input
								type="email"
								name="resendEmail"
								required
								autoComplete="email"
								value={resendEmail}
								onChange={(e) => setResendEmail(e.target.value)}
								placeholder="you@example.com"
								className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
							/>
						</div>
						<button
							type="submit"
							disabled={resending}
							className="btn-tactile w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
						>
							<HiRefresh className="w-4 h-4" />
							{resending ? 'Sending…' : 'Send a new reset link'}
						</button>
					</form>
				)}

				<div className="text-center pt-4">
					<Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
						Back to sign in
					</Link>
				</div>
			</AuthShell>
		)
	}

	return (
		<AuthShell
			title="Set New Password"
			subtitle="Create a secure password with at least 8 characters."
		>
			{error && (
				<div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
					{error}
				</div>
			)}

			{success && (
				<div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
					<HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
					<span>{success}</span>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
						New Password
					</label>
					<div className="relative">
						<HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
						<input
							name="password"
							type={showPassword ? 'text' : 'password'}
							required
							value={formData.password}
							onChange={handleChange}
							placeholder="••••••••••••"
							className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
						>
							{showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
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
							type={showConfirmPassword ? 'text' : 'password'}
							required
							value={formData.confirmPassword}
							onChange={handleChange}
							placeholder="••••••••••••"
							className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
						>
							{showConfirmPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
						</button>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="btn-tactile w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 mt-2"
				>
					{loading ? 'Updating Password...' : 'Save New Password'}
				</button>

				<div className="text-center pt-2">
					<Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
						Cancel and return to sign in
					</Link>
				</div>
			</form>
		</AuthShell>
	)
}

export default ResetPassword
