// App.jsx
import { Routes, Route, Navigate } from 'react-router-dom' 
import ProtectedRoute from './component/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/SignUp'
import TenantDashboard from './pages/TenantDashboard'
import LandlordDashboard from './pages/Landlord/MainLandLord'
import AdminDashboard from './pages/AdminDashboard'
import ResetPassword from './pages/resetpassword'
//ssh-keygen -t ed25519 -C "your@email.com"
function App() {
	return (
		<Routes>
			{' '}
			{/* Just Routes, no Router */}
			<Route path="/" element={<Landing />} />
			<Route path="/login" element={<Login />} />
			<Route path="/signup" element={<Signup />} />
			<Route path="/reset-password" element={<ResetPassword />} />
			{/* Protected Routes */}
			<Route
				path="/tenant"
				element={
					<ProtectedRoute allowedRoles={['tenant']}>
						<TenantDashboard />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/landlord"
				element={
					<ProtectedRoute allowedRoles={['landlord']}>
						<LandlordDashboard />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/admin"
				element={
					<ProtectedRoute allowedRoles={['admin']}>
						<AdminDashboard />
					</ProtectedRoute>
				}
			/>
			{/* Redirect old dashboard path to login */}
			<Route
				path="/dashboard"
				element={<Navigate to="/login" replace />}
			/>
			{/* Catch all - 404 redirect */}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	)
}

export default App
