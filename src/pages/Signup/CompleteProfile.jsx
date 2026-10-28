// CompleteProfile.jsx — one-time role onboarding for accounts that signed up
// with Google (or any OAuth provider).
//
// Why this page exists: OAuth hands us only what the provider knows (name,
// email, picture). It cannot tell us whether someone is a tenant, a landlord or
// an agent, and supabase.auth.signInWithOAuth has no way to pass a role. So the
// on_auth_user_created trigger provisions the public.users row as 'tenant' with
// role_confirmed = false, and AuthCallback sends those users here to choose.
//
// The choice is applied by the SECURITY DEFINER RPC public.set_initial_role(),
// which accepts only tenant|landlord|agent and only while role_confirmed is
// false — so it is one-shot and can never be replayed to move between roles or
// to reach 'admin'. The client is not trusted for any of that.
//
// If database/oauth_role_onboarding.sql has NOT been applied, role_confirmed is
// undefined, AuthCallback never routes here, and this page is unreachable — it
// degrades to the previous behaviour rather than breaking.
//
import React, { useEffect, useState } from 'react'
import {
	HiUser,
	HiHome,
	HiShieldCheck,
	HiCheck,
	HiPhone,
	HiArrowRight
} from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'
import './CompleteProfile.css'

// Accent sets are written out in full. Tailwind's scanner only sees literal
// class strings, so these must never be assembled at runtime.
const ROLES = [
	{
		key: 'tenant',
		label: 'Renter',
		blurb: 'I’m looking for a place to rent.',
		Icon: HiUser,
	},
	{
		key: 'landlord',
		label: 'Property owner',
		blurb: 'I have a room or home to let.',
		Icon: HiHome,
	},
	{
		key: 'agent',
		label: 'Agent',
		blurb: 'I manage rental listings for others.',
		Icon: HiShieldCheck,
	}
]

const CompleteProfile = ({ isModal = false }) => {
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [role, setRole] = useState('')
	const [phone, setPhone] = useState('')
	const [agreeToTerms, setAgreeToTerms] = useState(false)
	const [acceptFee, setAcceptFee] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		let isActive = true

		const load = async () => {
			try {
				const { data: { session } } = await supabase.auth.getSession()
				if (!isActive) return

				if (!session?.user) {
					navigate('/login', { replace: true })
					return
				}
				setEmail(session.user.email || '')

				// select('*') on purpose: it does not fail when role_confirmed has
				// not been added yet, so this page degrades instead of erroring.
				const { data: row } = await supabase
					.from('users')
					.select('*')
					.eq('id', session.user.id)
					.maybeSingle()
				if (!isActive) return

				if (!row) {
					// No authoritative profile: fail closed rather than guess a portal.
					await supabase.auth.signOut().catch(() => {})
					navigate('/login', { replace: true })
					return
				}

				// Already onboarded — never make this page a second stop.
				if (row.role_confirmed !== false) {
					navigate(`/${row.user_type}`, { replace: true })
					return
				}

				setPhone(row.phone || '')
			} catch (err) {
				console.error('Complete profile load error:', err)
				if (isActive) navigate('/login', { replace: true })
			}
		}

		load()
		return () => { isActive = false }
	}, [navigate])

	const selected = ROLES.find(r => r.key === role) || null

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (!role) return setError('Please choose how you will use Place4U.')
		if (!agreeToTerms) return setError('You must agree to the Terms of Service & Privacy Policy.')
		if (selected?.key === 'tenant' && !acceptFee) {
			return setError('Please acknowledge the assistance fee terms to proceed.')
		}

		setLoading(true)
		setError('')

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user) {
				navigate('/login', { replace: true })
				return
			}

			// 1. Authoritative, one-shot role set. The database — not the browser —
			//    decides what is allowed.
			const { error: roleError } = await supabase.rpc('set_initial_role', { p_role: role })
			if (roleError) throw roleError

			// 2. Optional phone on the profile row (own row: permitted by RLS and by
			//    the privilege guard, which only protects user_type/is_verified).
			if (phone.trim()) {
				await supabase.from('users').update({ phone: phone.trim() }).eq('id', session.user.id)
			}

			// 3. POPIA / fee consent. A password signup records these in the auth
			//    user metadata at signUp time; an OAuth signup cannot, so we record
			//    them in the same place here. Only the tenant acknowledges a fee.
			await supabase.auth.updateUser({
				data: {
					user_type: role,
					phone: phone.trim() || null,
					popia_consented_at: new Date().toISOString(),
					terms_version: '2026.1',
					privacy_policy_accepted: true,
					assistance_fee_acknowledged: role === 'tenant'
				}
			})

			navigate(`/${role}`, { replace: true })
		} catch (err) {
			console.error('Complete profile error:', err)
			setError(err?.message || 'Could not save your choice. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className={`place-complete-profile ${isModal ? 'place-complete-profile--modal' : 'min-h-screen flex items-center justify-center p-4 sm:p-6'}`}>
			<main className="place-complete-profile__card w-full max-w-3xl overflow-hidden rounded-3xl border bg-white shadow-xl">
				<header className="place-complete-profile__header flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<Link to="/" className="inline-flex items-center" aria-label="Place4U home">
						<img src="/logo.png" alt="Place4U" className="place-complete-profile__logo h-10 w-auto" />
					</Link>
					<button
						type="button"
						onClick={() => supabase.auth.signOut().catch(() => {}).finally(() => navigate('/'))}
						className="place-complete-profile__signout inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
					>
						Sign out
					</button>
				</header>

				<div className="place-complete-profile__content px-5 py-6 sm:px-8 sm:py-8">
					<div className="mb-5 max-w-2xl">
						<p className="place-complete-profile__eyebrow mb-2 text-xs font-semibold">ACCOUNT SETUP</p>
						<h1 className="font-serif-display text-3xl font-normal sm:text-4xl">Set up your profile</h1>
						<p className="mt-2 text-sm leading-relaxed">
							Choose how you’ll use Place4U to get started.
							{email && <span className="place-complete-profile__account-email"> Signed in as {email}.</span>}
						</p>
					</div>

					{error && (
						<div role="alert" className="place-complete-profile__error mb-5 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed">
							<span>{error}</span>
							<button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="shrink-0 rounded p-1">✕</button>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-4" noValidate>
						<fieldset>
							<legend className="mb-3 text-sm font-semibold">What brings you to Place4U?</legend>
							<div className="place-complete-profile__roles grid grid-cols-1 gap-3 sm:grid-cols-3">
								{ROLES.map((r) => {
									const isSelected = role === r.key
									return (
										<button
											key={r.key}
											type="button"
											onClick={() => { setRole(r.key); setError('') }}
											aria-pressed={isSelected}
											className={`place-complete-profile__role w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'is-selected' : ''}`}
										>
											<span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg">
												<r.Icon className="h-5 w-5" aria-hidden="true" />
											</span>
											<span className="block text-sm font-semibold">{r.label}</span>
											<span className="mt-1 block text-xs leading-relaxed">{r.blurb}</span>
											<span className="place-complete-profile__radio mt-3 flex h-5 w-5 items-center justify-center rounded-full border">
												{isSelected && <HiCheck className="h-3 w-3" aria-hidden="true" />}
											</span>
										</button>
									)
								})}
							</div>
						</fieldset>

						<div>
							<label htmlFor="cp-phone" className="mb-2 block text-sm font-semibold">
								Phone or WhatsApp <span className="place-complete-profile__optional font-normal">Optional</span>
							</label>
							<div className="relative">
								<HiPhone className="place-complete-profile__field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
								<input
									id="cp-phone"
									type="tel"
									inputMode="tel"
									autoComplete="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="082 123 4567"
									className="place-complete-profile__input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
								/>
							</div>
						</div>

						<div className="place-complete-profile__consents space-y-3 border-t pt-5">
							<label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
								<input
									type="checkbox"
									checked={agreeToTerms}
									onChange={(e) => setAgreeToTerms(e.target.checked)}
									className="mt-1 h-4 w-4 shrink-0"
								/>
								<span>
									I agree to Place4U’s{' '}
									<Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
									{' '}and{' '}
									<Link to="/privacy" target="_blank" rel="noopener noreferrer">POPIA Privacy Policy</Link>.
								</span>
							</label>

							{role === 'tenant' && (
								<label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
									<input
										type="checkbox"
										checked={acceptFee}
										onChange={(e) => setAcceptFee(e.target.checked)}
										className="mt-1 h-4 w-4 shrink-0"
									/>
									<span>I acknowledge the assistance fee terms for tenant applications.</span>
								</label>
							)}
						</div>

						<button
							type="submit"
							disabled={loading}
							className="place-complete-profile__submit inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
						>
							{loading ? 'Setting up your account…' : 'Finish profile setup'}
							<HiArrowRight className="h-4 w-4" aria-hidden="true" />
						</button>
					</form>
				</div>
			</main>
		</div>
	)
}

export default CompleteProfile
