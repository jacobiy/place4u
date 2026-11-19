import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './Dashboard'
import ApplicationsPage from './Applications'
import AgentApplicationsPage from './AgentApplications'
import LandlordApplicationsPage from './LandlordApplications'
import PropertiesPage from './Properties'
import BuildingsPage from './Buildings'
import PropertySubmissionsPage from './PropertySubmissions'
import PipelinePage from './Pipeline'
import UsersPage from './Users'
import PaymentsPage from './Payments'
import PromotionsPage from './Promotions'
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
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="property-submissions" element={<PropertySubmissionsPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
