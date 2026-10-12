import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './Dashboard'
import ApplicationsPage from './Applications'
import AgentApplicationsPage from './AgentApplications'
import LandlordApplicationsPage from './LandlordApplications'
import PropertiesPage from './Properties'
import UsersPage from './Users'
import PaymentsPage from './Payments'
import AnalyticsPage from './Analytics'
import SettingsPage from './Settings'

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="agent-applications" element={<AgentApplicationsPage />} />
        <Route path="landlord-applications" element={<LandlordApplicationsPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
