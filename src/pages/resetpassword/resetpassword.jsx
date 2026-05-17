// ResetPassword.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
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
		// Check if we have a session (user came from reset email)
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
				throw new Error('Password must be at least 8 characters')
			}

			if (formData.password !== formData.confirmPassword) {
				throw new Error('Passwords do not match')
			}

			const { error } = await supabase.auth.updateUser({
				password: formData.password
			})

			if (error) throw error

			setSuccess('Password updated successfully!')
			setTimeout(() => {
				navigate('/login')
			}, 2000)
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl border border-gray-700"
			>
				<h2 className="text-2xl font-bold text-white mb-6">
					Reset Your Password
				</h2>

				{error && (
					<div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
						{error}
					</div>
				)}

				{success && (
					<div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm mb-4">
						{success}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* New Password */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							New Password
						</label>
						<div className="relative">
							<input
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								value={formData.password}
								onChange={handleChange}
								className="w-full pl-4 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                         text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="••••••••"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								{showPassword ? (
									<HiEyeOff className="text-gray-400" />
								) : (
									<HiEye className="text-gray-400" />
								)}
							</button>
						</div>
					</div>

					{/* Confirm Password */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Confirm Password
						</label>
						<div className="relative">
							<input
								name="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								required
								value={formData.confirmPassword}
								onChange={handleChange}
								className="w-full pl-4 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg 
                         text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="••••••••"
							/>
							<button
								type="button"
								onClick={() =>
									setShowConfirmPassword(!showConfirmPassword)
								}
								className="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								{showConfirmPassword ? (
									<HiEyeOff className="text-gray-400" />
								) : (
									<HiEye className="text-gray-400" />
								)}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 
                     text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 
                     transition-all duration-300 disabled:opacity-50"
					>
						{loading ? 'Updating...' : 'Update Password'}
					</button>
				</form>
			</motion.div>
		</div>
	)
}

export default ResetPassword
