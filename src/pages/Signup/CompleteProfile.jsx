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
// DESIGN: this is a sibling of Login.jsx (the screen that starts the Google
// flow), so it deliberately reuses the same shell — split editorial panel,
// `font-serif-display` headings, uppercase tracking-wider labels, `btn-tactile`
// actions, `bg-slate-950/80` inputs. It is ONE screen, not a wizard: the role
// picker is the hero and everything else is progressive disclosure beneath it.
import React, { useEffect, useState } from 'react'
import {
	HiUser,
	HiHome,
	HiShieldCheck,
	HiCheck,
	HiPhone,
	HiArrowRight,
	HiX
} from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'

// Accent sets are written out in full. Tailwind's scanner only sees literal
// class strings, so these must never be assembled at runtime.
const ROLES = [
	{
		key: 'tenant',
		label: 'Tenant',
		blurb: 'Looking to rent',
		Icon: HiUser,
		headline: 'I need somewhere to live.',
		note: 'One application, matched against verified listings and introduced to the right landlord.',
		perks: ['Browse verified listings', 'One application, many properties', 'Track every step in real time'],
		row: 'border-blue-500/60 bg-blue-500/[0.07]',
		icon: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
		dot: 'bg-blue-500'
	},
	{
		key: 'landlord',
		label: 'Landlord',
		blurb: 'Have space to let',
		Icon: HiHome,
		headline: 'I have space to let.',
		note: 'List once, then meet screened tenants who have already been verified.',
		perks: ['Free to list properties', 'Verified tenant applications', 'Direct tenant communication'],
		row: 'border-emerald-500/60 bg-emerald-500/[0.07]',
		icon: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
		dot: 'bg-emerald-500'
	},
	{
		key: 'agent',
		label: 'Agent',
		blurb: 'Manage listings',
		Icon: HiShieldCheck,
		headline: 'I work the market for others.',
		note: 'Receive qualified tenant applications, do the work, and get paid on the match.',
		perks: ['Assigned tenant applications', '50% commission on matches', 'Payouts tracked in your wallet'],
		row: 'border-purple-500/60 bg-purple-500/[0.07]',
		icon: 'bg-purple-500/15 text-purple-400 ring-purple-500/30',
		dot: 'bg-purple-500'
	}
]

const CompleteProfile = () => {
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
		<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-grid-subtle relative selection:bg-blue-600 selection:text-white">
			{/* Ambient background light */}
			<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/[0.06] blur-[140px] pointer-events-none -z-10" aria-hidden="true" />

			<div className="max-w-5xl w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12">

				{/* Dismiss */}
				<button
					type="button"
					onClick={() => supabase.auth.signOut().catch(() => {}).finally(() => navigate('/'))}
					aria-label="Sign out and return home"
					title="Sign out and return home"
					className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-md group"
				>
					<HiX className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
				</button>

				{/* Left Editorial Column — mirrors Login.jsx */}
				<div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 bg-slate-950 border-r border-white/[0.08] overflow-hidden">
					<div
						className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity transition-opacity duration-500"
						style={{ backgroundImage: "url('/download.png')" }}
						aria-hidden="true"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" aria-hidden="true" />

					{/* Brand Lockup */}
					<div className="relative z-10">
						<Link to="/" className="inline-flex items-center group">
							<img
								src="/logo.png"
								alt="Place4U Logo"
								className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
							/>
						</Link>
					</div>

					{/* Editorial statement — responds to the chosen role */}
					<div className="relative z-10 space-y-4">
						<span className="text-xs uppercase tracking-widest font-semibold text-blue-400">
							{selected ? `${selected.label} account` : 'Place4U Onboarding'}
						</span>
						<h2 className="text-2xl font-bold font-serif text-white leading-tight transition-opacity duration-300">
							{selected ? selected.headline : 'One profile. Whichever side of the deal you are on.'}
						</h2>
						<p className="text-xs text-slate-400 leading-relaxed">
							{selected
								? selected.note
								: 'Verified listings, screened tenants and warm introductions — all in one place.'}
						</p>
					</div>

					{/* Trust marker */}
					<div className="relative z-10 flex items-center gap-1.5 text-xs text-emerald-400">
						<HiShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
						<span>POPIA Encrypted &amp; Authenticated</span>
					</div>
				</div>

				{/* Right Form Column */}
				<div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">

					{/* Mobile Brand */}
					<div className="lg:hidden flex items-center justify-between mb-6 pr-12">
						<Link to="/">
							<img src="/logo.png" alt="Place4U Logo" className="h-8 w-auto object-contain" />
						</Link>
						<span className="text-xs text-slate-400">One more step</span>
					</div>

					<div>
						{/* Form Header */}
						<div>
							<h1 className="font-serif-display text-2xl sm:text-3xl font-normal text-white">
								How will you use Place4U?
							</h1>
							<p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
								You signed in with Google, so we couldn&apos;t tell whether you are renting, letting, or
								managing listings.
								{email && <span className="text-slate-300"> Signed in as {email}.</span>}
							</p>
						</div>

						{/* Feedback */}
						{error && (
							<div
								role="alert"
								className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed flex items-center justify-between"
							>
								<span>{error}</span>
								<button
									type="button"
									onClick={() => setError('')}
									className="text-red-400 hover:text-white ml-2 text-sm"
									aria-label="Dismiss error"
								>
									✕
								</button>
							</div>
						)}

						<form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>

							{/* Role picker — a vertical list reads editorial; a 3-up card
							    grid reads like a template. */}
							<fieldset>
								<legend className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
									Select your primary role
								</legend>
								<div className="space-y-2">
									{ROLES.map((r) => {
										const isSelected = role === r.key
										return (
											<div key={r.key}>
												<button
													type="button"
													onClick={() => { setRole(r.key); setError('') }}
													aria-pressed={isSelected}
													className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
														isSelected
															? `${r.row} border`
															: 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
													}`}
												>
													<span
														className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 transition-all duration-200 ${
															isSelected ? r.icon : 'bg-white/[0.04] text-slate-400 ring-white/10'
														}`}
														aria-hidden="true"
													>
														<r.Icon className="w-5 h-5" />
													</span>

													<span className="flex-1 min-w-0">
														<span className="block text-sm font-semibold text-white">{r.label}</span>
														<span className="block text-[11px] text-slate-400 mt-0.5">{r.blurb}</span>
													</span>

													<span
														className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
															isSelected ? `${r.dot} border-transparent` : 'border-slate-600'
														}`}
														aria-hidden="true"
													>
														{isSelected && <HiCheck className="w-3 h-3 text-white" />}
													</span>
												</button>

												{/* Progressive disclosure: what this role actually gets */}
												{isSelected && (
													<div className="mt-2 ml-4 pl-4 border-l-2 border-white/[0.08]">
														<ul className="space-y-1.5 py-1">
															{r.perks.map((perk) => (
																<li key={perk} className="flex items-center gap-2 text-[11px] text-slate-400">
																	<span className={`w-1 h-1 rounded-full ${r.dot} flex-shrink-0`} aria-hidden="true" />
																	{perk}
																</li>
															))}
														</ul>
													</div>
												)}
											</div>
										)
									})}
								</div>
							</fieldset>

							{/* Contact */}
							<div>
								<label
									htmlFor="cp-phone"
									className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
								>
									Phone / WhatsApp <span className="font-normal normal-case tracking-normal text-slate-500">(optional)</span>
								</label>
								<div className="relative">
									<HiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" aria-hidden="true" />
									<input
										id="cp-phone"
										type="tel"
										inputMode="tel"
										autoComplete="tel"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="082 123 4567"
										className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
									/>
								</div>
							</div>

							{/* Consents */}
							<div className="space-y-2.5 pt-1">
								<label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
									<input
										type="checkbox"
										checked={agreeToTerms}
										onChange={(e) => setAgreeToTerms(e.target.checked)}
										className="w-4 h-4 mt-0.5 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-1 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
									/>
									<span className="leading-relaxed">
										I agree to Place4U&apos;s{' '}
										<Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">Terms of Service</Link>
										{' '}and{' '}
										<Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">POPIA Privacy Policy</Link>.
									</span>
								</label>

								{/* Only the tenant is charged, so only the tenant acknowledges a fee. */}
								{role === 'tenant' && (
									<label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
										<input
											type="checkbox"
											checked={acceptFee}
											onChange={(e) => setAcceptFee(e.target.checked)}
											className="w-4 h-4 mt-0.5 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-1 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
										/>
										<span className="leading-relaxed">
											I acknowledge the assistance fee terms upon verified application submission.
										</span>
									</label>
								)}
							</div>

							<button
								type="submit"
								disabled={loading}
								className="btn-tactile w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
							>
								{loading ? (
									<span>Setting up your account…</span>
								) : (
									<>
										<span>Continue to my dashboard</span>
										<HiArrowRight className="w-4 h-4" />
									</>
								)}
							</button>
						</form>
					</div>

					{/* Footer reassurance */}
					<div className="pt-6 mt-6 border-t border-white/[0.06] text-center text-[11px] text-slate-500">
						You can change your details later in settings. Role changes after approval are handled by our team.
					</div>
				</div>
			</div>
		</div>
	)
}

export default CompleteProfile
