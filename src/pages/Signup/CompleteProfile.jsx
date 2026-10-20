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
import React, { useEffect, useState } from 'react'
import { HiUser, HiBadgeCheck, HiShieldCheck, HiCheck, HiPhone } from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'

const ROLES = [
  {
    key: 'tenant',
    label: 'Tenant',
    blurb: 'Looking to rent',
    Icon: HiUser,
    accent: 'blue',
    hasFee: true,
  },
  {
    key: 'landlord',
    label: 'Landlord',
    blurb: 'Have space to let',
    Icon: HiBadgeCheck,
    accent: 'emerald',
    hasFee: false,
  },
  {
    key: 'agent',
    label: 'Agent',
    blurb: 'Manage listings',
    Icon: HiShieldCheck,
    accent: 'purple',
    hasFee: false,
  },
]

const ACCENT_ON = {
  blue:    'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-600/20',
  emerald: 'bg-emerald-600/15 border-emerald-500 shadow-md shadow-emerald-600/20',
  purple:  'bg-purple-600/15 border-purple-500 shadow-md shadow-purple-600/20',
}

const ACCENT_ICON = {
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  purple: 'text-purple-400',
}

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

        // select('*') on purpose: it does not fail when role_confirmed has not
        // been added yet, so this page degrades instead of erroring.
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) return setError('Please choose how you will use Place4U.')
    if (!agreeToTerms) return setError('You must agree to the Terms of Service & Privacy Policy.')

    const selectedRole = ROLES.find(r => r.key === role)
    if (selectedRole?.hasFee && !acceptFee) return setError('Please acknowledge the assistance fee terms to proceed.')

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
      //    them in the same place here.
      await supabase.auth.updateUser({
        data: {
          user_type: role,
          phone: phone.trim() || null,
          popia_consented_at: new Date().toISOString(),
          terms_version: '2026.1',
          privacy_policy_accepted: true,
          assistance_fee_acknowledged: selectedRole?.hasFee || false,
        },
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-blue-600/[0.06] blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 p-6 sm:p-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center p-1.5">
            <img src="/logo.png" alt="Place4U" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Place4U</span>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Verified Housing</p>
          </div>
        </div>

        <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-white mt-6">
          How will you use Place4U?
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
          One last step. You signed in with Google, so we could not tell from your account
          whether you are looking to rent, letting a property, or managing listings.
          {email && <> Signed in as <span className="text-slate-300 font-semibold break-all">{email}</span>.</>}
        </p>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map(({ key, label, blurb, Icon, accent, fee, feeNote, hasFee }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRole(key); setError('') }}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  role === key
                    ? ACCENT_ON[accent]
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-1.5 ${role === key ? ACCENT_ICON[accent] : 'text-slate-400'}`} />
                <span className="text-xs font-semibold text-white block">{label}</span>
                <span className="text-[10px] text-slate-400">{blurb}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Phone / WhatsApp (optional)
            </label>
            <div className="relative">
              <HiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="082 123 4567"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 mt-0.5 cursor-pointer"
              />
              <span>
                I agree to Place4U's{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">POPIA Privacy Policy</Link>.
              </span>
            </label>

            {role && ROLES.find(r => r.key === role)?.hasFee && (
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptFee}
                  onChange={(e) => setAcceptFee(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 mt-0.5 cursor-pointer"
                />
                <span>
                  I acknowledge the assistance fee terms upon verified application submission.
                </span>
              </label>
            )}
            {!role && (
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptFee}
                  onChange={(e) => setAcceptFee(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 mt-0.5 cursor-pointer"
                />
                <span>
                  I acknowledge the standard <strong className="text-white">assistance fee</strong> terms upon verified application submission.
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
              <span>Saving…</span>
            ) : (
              <>
                <span>Continue to my dashboard</span>
                <HiCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompleteProfile
