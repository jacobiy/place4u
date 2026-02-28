// Signup.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from "../utils/Supabase";
import { 
  HiMail, 
  HiLockClosed, 
  HiEye, 
  HiEyeOff,
  HiUser,
  HiPhone,
  HiBadgeCheck,
  HiShieldCheck
} from 'react-icons/hi'
import { FaGoogle, FaFacebook } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Account Details
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: User Type & Verification
    userType: 'tenant', // 'tenant' or 'landlord'
    agreeToTerms: false,
    acceptFee: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateStep1 = () => {
    if (!formData.fullName) return 'Full name is required'
    if (!formData.email) return 'Email is required'
    if (!formData.phone) return 'Phone number is required'
    if (!formData.password) return 'Password is required'
    if (formData.password.length < 8) return 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address'
    
    // Validate phone (simple SA format)
    const phoneRegex = /^(\+27|0)[0-9]{9}$/
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) return 'Please enter a valid South African phone number'
    
    return null
  }

  const validateStep2 = () => {
    if (!formData.agreeToTerms) return 'You must agree to the Terms of Service'
    if (!formData.acceptFee) return 'You must acknowledge the assistance fee'
    return null
  }

  const handleNextStep = () => {
    const error = validateStep1()
    if (error) {
      setError(error)
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

    // Step 2 validation
    const step2Error = validateStep2()
    if (step2Error) {
      setError(step2Error)
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            user_type: formData.userType
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Insert user profile into users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              phone: formData.phone,
              full_name: formData.fullName,
              user_type: formData.userType,
              is_verified: false
            }
          ])

        if (profileError) throw profileError

      }
    } catch (err) {
      console.error('Signup error:', err)
      
      // Handle specific Supabase errors
      if (err.message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else if (err.message.includes('Password should be')) {
        setError('Password is too weak. Please use a stronger password.')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
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
        className="max-w-md w-full space-y-8 bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl border border-gray-700 shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="text-center">
          <Link to="/">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Place4U
            </h2>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                          ${currentStep >= 1 ? 'border-blue-400 bg-blue-400/20' : 'border-gray-600'}`}>
              1
            </div>
            <span className="ml-2 text-sm hidden sm:block">Account</span>
          </div>
          <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-400' : 'bg-gray-600'}`} />
          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                          ${currentStep >= 2 ? 'border-blue-400 bg-blue-400/20' : 'border-gray-600'}`}>
              2
            </div>
            <span className="ml-2 text-sm hidden sm:block">Verification</span>
          </div>
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

        {/* Success Message for specific cases */}
        {!error && formData.email && currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg text-sm"
          >
            <p className="font-medium">Almost there!</p>
            <p className="text-xs mt-1">Complete your registration to continue.</p>
          </motion.div>
        )}

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {currentStep === 1 ? (
            /* Step 1: Account Details */
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUser className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
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
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiPhone className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="+27 12 345 6789"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
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
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <HiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <HiEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiShieldCheck className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <HiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <HiEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: User Type & Verification */
            <div className="space-y-6">
              {/* User Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  I am a:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'tenant' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300
                              ${formData.userType === 'tenant' 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-gray-700 hover:border-gray-600'}`}
                  >
                    <HiUser className={`w-6 h-6 mx-auto mb-2 
                      ${formData.userType === 'tenant' ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium
                      ${formData.userType === 'tenant' ? 'text-blue-400' : 'text-gray-400'}`}>
                      Tenant
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Looking for housing</p>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'landlord' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300
                              ${formData.userType === 'landlord' 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-gray-700 hover:border-gray-600'}`}
                  >
                    <HiBadgeCheck className={`w-6 h-6 mx-auto mb-2 
                      ${formData.userType === 'landlord' ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium
                      ${formData.userType === 'landlord' ? 'text-blue-400' : 'text-gray-400'}`}>
                      Landlord
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Have property to rent</p>
                  </motion.button>
                </div>
              </div>

              {/* Fee Acknowledgment */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">
                  <span className="text-blue-400 font-bold">R350</span> one-time assistance fee
                </p>
                <p className="text-xs text-gray-400">
                  This non-refundable fee covers application processing, document verification, 
                  and matching services. It does not guarantee successful placement.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-500 
                             focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">
                    I agree to the{' '}
                    <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="acceptFee"
                    checked={formData.acceptFee}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-500 
                             focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">
                    I understand and accept the{' '}
                    <span className="text-blue-400">R350 non-refundable assistance fee</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep === 2 && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCurrentStep(1)
                  setError('')
                }}
                className="flex-1 py-3 px-4 border border-gray-600 rounded-lg
                         text-gray-300 font-medium hover:bg-gray-700 
                         transition-all duration-300"
              >
                Back
              </motion.button>
            )}
            
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-3 px-4 border border-transparent rounded-lg
                       text-white font-medium bg-gradient-to-r from-blue-600 to-blue-700
                       hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300
                       ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {currentStep === 1 ? 'Next' : 'Creating account...'}
                </div>
              ) : (
                currentStep === 1 ? 'Next' : 'Create Account'
              )}
            </motion.button>
          </div>

          {/* Social Signup - Only on Step 1 */}
          {currentStep === 1 && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800/50 text-gray-400">Or sign up with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: window.location.origin + '/dashboard'
                        }
                      })
                      if (error) throw error
                    } catch (err) {
                      setError('Google sign-in failed. Please try again.')
                    }
                  }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 
                           bg-gray-700/50 hover:bg-gray-700 border border-gray-600 
                           rounded-lg text-gray-300 hover:text-white transition-all duration-300"
                >
                  <FaGoogle className="h-5 w-5" />
                  <span className="text-sm">Google</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'facebook',
                        options: {
                          redirectTo: window.location.origin + '/dashboard'
                        }
                      })
                      if (error) throw error
                    } catch (err) {
                      setError('Facebook sign-in failed. Please try again.')
                    }
                  }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 
                           bg-gray-700/50 hover:bg-gray-700 border border-gray-600 
                           rounded-lg text-gray-300 hover:text-white transition-all duration-300"
                >
                  <FaFacebook className="h-5 w-5" />
                  <span className="text-sm">Facebook</span>
                </motion.button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  )
}

export default Signup