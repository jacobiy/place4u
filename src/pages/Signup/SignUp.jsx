// Signup.jsx - Lead UI Designer Overhaul for Place4U
import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from "../../utils/Supabase";
import { 
  HiMail, 
  HiLockClosed, 
  HiEye, 
  HiEyeOff, 
  HiUser, 
  HiPhone, 
  HiBadgeCheck, 
  HiShieldCheck,
  HiCheck,
  HiArrowRight,
  HiArrowLeft
} from 'react-icons/hi'
import { FaGoogle } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'tenant', // 'tenant' | 'landlord' | 'agent'
    agreeToTerms: false,
    acceptFee: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Set when signUp() succeeds but email confirmation is required: we hold no
  // session yet, so we show a "confirm your email" panel instead of redirecting.
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const emailInputRef = useRef(null)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateStep1 = () => {
    if (!formData.fullName.trim()) return 'Full legal name is required.'
    if (!formData.email.trim()) return 'Valid email address is required.'
    if (!formData.phone.trim()) return 'South African contact number is required.'
    if (!formData.password) return 'Password is required.'
    if (formData.password.length < 8) return 'Password must be at least 8 characters long.'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) return 'Please provide a valid email format.'
    
    const phoneRegex = /^(\+27|0)[0-9]{9}$/
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      return 'Please enter a valid South African phone number (e.g. 082 123 4567 or +27821234567).'
    }
    
    return null
  }

  const validateStep2 = () => {
    if (!formData.agreeToTerms) return 'You must agree to the Terms of Service & Privacy Policy.'
    if (!formData.acceptFee) return 'Please acknowledge the assistance fee terms to proceed.'
    return null
  }

  const handleNextStep = () => {
    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setCurrentStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (currentStep === 1) {
      handleNextStep()
      return
    }

    const step2Error = validateStep2()
    if (step2Error) {
      setError(step2Error)
      return
    }

    setLoading(true)
    setError('')

    // Where Supabase should send the user after they click the link in the
    // confirmation email. AuthCallback then resolves their role from
    // public.users and routes them to the correct portal.
    const emailRedirectTo = `${window.location.origin}/auth/callback`

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            user_type: formData.userType,
            popia_consented_at: new Date().toISOString(),
            terms_version: "2026.1",
            privacy_policy_accepted: true,
            assistance_fee_acknowledged: true
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // The public.users row is created SERVER-SIDE by the
        // `on_auth_user_created` trigger on auth.users
        // (database/auth_signup_profile_sync.sql), which fires for every signup
        // whether or not a session is returned. The client must NEVER insert it:
        // the self-insert RLS policy (users_insert_self_non_admin) would also let
        // a revoked account recreate its own row.
        //
        // With "Confirm email" enabled signUp returns no session until the user
        // clicks the link, so we must not redirect into a portal the user cannot
        // access yet — we show the "confirm your email" panel instead. (For an
        // already-registered address Supabase returns an obfuscated user with an
        // empty identities array; we show the same panel on purpose to avoid
        // leaking which emails exist.)
        if (!authData.session) {
          setPendingConfirmation({ email: formData.email })
          return
        }

        // Confirmation disabled — we already hold a session, and the trigger has
        // already created the profile row, so we can go straight in.
        // Direct redirect based on user role
        if (formData.userType === 'tenant') navigate('/tenant')
        else if (formData.userType === 'landlord') navigate('/landlord')
        else if (formData.userType === 'agent') navigate('/agent')
        else navigate('/login')
      }
    } catch (err) {
      console.error('Signup error:', err)
      if (err.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else if (err.message?.includes('Password should be')) {
        setError('Password is too weak. Please use letters, numbers, and symbols.')
      } else {
        setError(err.message || 'Registration failed. Please check your network and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Resend the signup confirmation email (only meaningful once we're in the
  // "confirm your email" state).
  const handleResendConfirmation = async () => {
    const email = pendingConfirmation?.email
    if (!email) return

    setResending(true)
    setResendMessage('')
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-grid-subtle relative selection:bg-blue-600 selection:text-white">
      {/* Ambient background light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-blue-600/[0.06] blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-5xl w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editorial Visual Column */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 bg-slate-950 border-r border-white/[0.08] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
            style={{ backgroundImage: "url('/download.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

          {/* Brand Mark */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center p-1.5">
                <img
                  src="/logo.png"
                  alt="Place4U"
                  className="w-full h-full object-contain filter brightness-0 invert"
                />
              </div>
              <div>
                <span className="text-lg font-bold text-white tracking-tight">Place4U</span>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Verified Housing
                </p>
              </div>
            </Link>
          </div>

          {/* Step Guidance & Guarantees */}
          <div className="relative z-10 space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-1">
                Your Security Guaranteed
              </span>
              <ul className="text-xs text-slate-300 space-y-2 mt-2">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Title deed check on all rental spaces</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>1 profile for unlimited verified inquiries</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Strict POPIA data encryption</span>
                </li>
              </ul>
            </div>

            <div className="text-[11px] text-slate-400">
              Already have an active account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4">
                Sign in here
              </Link>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          {pendingConfirmation ? (
            /* AWAITING EMAIL CONFIRMATION */
            <div className="max-w-md mx-auto w-full text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                <HiMail className="w-7 h-7 text-blue-400" />
              </div>

              <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-white">
                Confirm your email
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-white font-semibold break-all">{pendingConfirmation.email}</span>.
                {' '}Open that email and click the link to activate your account, then sign in.
              </p>

              {resendMessage && (
                <div className="mt-5 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs leading-relaxed">
                  {resendMessage}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="btn-tactile w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend confirmation email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingConfirmation(null)
                    setResendMessage('')
                    setError('')
                    setCurrentStep(1)
                  }}
                  className="btn-tactile w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Use a different email address
                </button>

                <Link
                  to="/login"
                  className="block text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 pt-1"
                >
                  Already confirmed? Sign in
                </Link>
              </div>
            </div>
          ) : (
          <div>
            {/* Form Header with Stepper */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-white">
                  Create your profile
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                  {currentStep === 1 ? 'Step 1: Personal credentials' : 'Step 2: Role & verification setup'}
                </p>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-slate-400'
                }`}>
                  <span>1</span>
                  <span className="hidden sm:inline">Details</span>
                </div>
                <div className="w-4 h-[1px] bg-white/20" />
                <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-slate-400'
                }`}>
                  <span>2</span>
                  <span className="hidden sm:inline">Role</span>
                </div>
              </div>
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-white ml-2">✕</button>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {currentStep === 1 ? (
                /* STEP 1: CREDENTIALS */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Jacob Dlamini"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          ref={emailInputRef}
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="you@domain.co.za"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Phone / WhatsApp
                      </label>
                      <div className="relative">
                        <HiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          placeholder="082 123 4567"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
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
                        Confirm Password
                      </label>
                      <div className="relative">
                        <HiShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
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
                  </div>
                </div>
              ) : (
                /* STEP 2: ROLE & DISCLOSURE */
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Select your primary role:
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, userType: 'tenant' }))}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          formData.userType === 'tenant'
                            ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-600/20'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <HiUser className={`w-6 h-6 mx-auto mb-1.5 ${formData.userType === 'tenant' ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-white block">Tenant</span>
                        <span className="text-[10px] text-slate-400">Looking to rent</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, userType: 'landlord' }))}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          formData.userType === 'landlord'
                            ? 'bg-emerald-600/15 border-emerald-500 shadow-md shadow-emerald-600/20'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <HiBadgeCheck className={`w-6 h-6 mx-auto mb-1.5 ${formData.userType === 'landlord' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-white block">Landlord</span>
                        <span className="text-[10px] text-slate-400">Have space to let</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, userType: 'agent' }))}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          formData.userType === 'agent'
                            ? 'bg-purple-600/15 border-purple-500 shadow-md shadow-purple-600/20'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <HiShieldCheck className={`w-6 h-6 mx-auto mb-1.5 ${formData.userType === 'agent' ? 'text-purple-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-white block">Agent</span>
                        <span className="text-[10px] text-slate-400">Manage listings</span>
                      </button>
                    </div>
                  </div>

                  {/* Assistance Fee Disclosure */}
                  <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-300">
                        Assistance & Verification Fee
                      </span>
                      <span className="text-xs font-bold text-white bg-blue-600/40 px-2 py-0.5 rounded-md border border-blue-400/30">
                        R 350
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Covers 1-time digital passport vetting, deed authentication, background screening, and WhatsApp coordination.
                    </p>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 mt-0.5 cursor-pointer"
                      />
                      <span>
                        I agree to Place4U’s{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">POPIA Privacy Policy</Link>.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        name="acceptFee"
                        checked={formData.acceptFee}
                        onChange={handleChange}
                        className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 mt-0.5 cursor-pointer"
                      />
                      <span>
                        I acknowledge the standard <strong className="text-white">R 350 assistance fee</strong> terms upon verified application submission.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex items-center gap-3 pt-3">
                {currentStep === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1)
                      setError('')
                    }}
                    className="btn-tactile px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <HiArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <span>Registering profile...</span>
                  ) : currentStep === 1 ? (
                    <>
                      <span>Continue to Role Setup</span>
                      <HiArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <HiCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          )}

          {/* Social Sign Up for Step 1 */}
          {currentStep === 1 && !pendingConfirmation && (
            <div className="pt-6 mt-6 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/tenant' }
                      })
                    } catch (err) {
                      setError('Google registration failed.')
                    }
                  }}
                  className="btn-tactile py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center justify-center gap-2"
                >
                  <FaGoogle className="w-3.5 h-3.5 text-red-400" />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    emailInputRef.current?.focus()
                  }}
                  className="btn-tactile py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center justify-center gap-2"
                >
                  <HiMail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sign up with email</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
