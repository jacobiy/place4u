// pages/AdminDashboard.jsx
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './Dashboard'
import UsersPage from './Users'
import TransactionsPage from './Transactions'

const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />

        {/* Placeholders to keep sidebar links non-breaking */}
        <Route path="properties" element={<div className="text-slate-500 text-sm">Properties page coming soon.</div>} />
        <Route path="leases" element={<div className="text-slate-500 text-sm">Leases page coming soon.</div>} />
        <Route path="analytics" element={<div className="text-slate-500 text-sm">Analytics page coming soon.</div>} />
        <Route path="reports" element={<div className="text-slate-500 text-sm">Reports page coming soon.</div>} />
        <Route path="settings" element={<div className="text-slate-500 text-sm">Settings page coming soon.</div>} />
        <Route path="notifications" element={<div className="text-slate-500 text-sm">Notifications page coming soon.</div>} />
      </Route>
    </Routes>
  )
}

export default AdminDashboard
