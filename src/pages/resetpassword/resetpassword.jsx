// ResetPassword.jsx - Lead UI Designer Overhaul for Place4U
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiLockClosed, HiEye, HiEyeOff, HiCheckCircle } from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'

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
	const navigate = useNavigate()

	useEffect(() => {
		const checkSession = async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession()
			if (!session) {
				navigate('/login')
			}
		}
		checkSession()
	}, [navigate])

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

			setSuccess('Password updated successfully! Redirecting you to login...')
			setTimeout(() => {
				navigate('/login')
			}, 1800)
		} catch (err) {
			setError(err.message || 'Failed to update password. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 bg-grid-subtle relative selection:bg-blue-600 selection:text-white">
			<div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/80">
				<div className="text-center mb-6">
					<Link to="/" className="inline-flex items-center gap-2 mb-4 group">
						<img src="/logo.png" alt="Place4U" className="w-8 h-8 filter brightness-0 invert" />
						<span className="font-bold text-white text-lg">Place4U</span>
					</Link>
					<h2 className="font-serif-display text-2xl font-normal text-white">
						Set New Password
					</h2>
					<p className="text-slate-400 text-xs mt-1">
						Create a secure password with at least 8 characters.
					</p>
				</div>

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
			</div>
		</div>
	)
}

export default ResetPassword
