import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import '../style/admin.css'

const metaForPath = (pathname) => {
  if (pathname === '/admin' || pathname === '/admin/') {
    return {
      title: 'Operations Dashboard',
      subtitle: 'Real-time overview of tenant applications, agent assignments, and property inventory'
    }
  }
  if (pathname.startsWith('/admin/applications')) {
    return {
      title: 'Applications Processing Desk',
      subtitle: 'Process tenant search requests, delegate to licensed agents, and manage placements'
    }
  }
  if (pathname.startsWith('/admin/property-submissions')) {
    return {
      title: 'Property Submission Review',
      subtitle: 'Inspect landlord-submitted listings and their ownership documents, then approve to publish or reject with feedback'
    }
  }
  if (pathname.startsWith('/admin/pipeline')) {
    return {
      title: 'Match Acceptance Pipeline',
      subtitle: 'Oversee accepted matches from tenant opt-in through landlord review, and sign off to unlock session scheduling'
    }
  }
  if (pathname.startsWith('/admin/properties')) {
    return {
      title: 'Property Listings Registry',
      subtitle: 'Review registered landlord rental properties and manage availability'
    }
  }
  if (pathname.startsWith('/admin/users')) {
    return {
      title: 'User & Role Administration',
      subtitle: 'Manage landlords, tenants, and licensed agents across Place4U'
    }
  }
  if (pathname.startsWith('/admin/payments')) {
    return {
      title: 'Payment Releases & Refunds Console',
      subtitle: 'Authorize tenant fee refunds, release agent 50% payment shares, and audit releases'
    }
  }
  if (pathname.startsWith('/admin/analytics')) {
    return {
      title: 'Placement & Operations Analytics',
      subtitle: 'Application throughput, agent workload, and property inventory breakdown'
    }
  }
  if (pathname.startsWith('/admin/settings')) {
    return {
      title: 'Settings & Gmail Dispatch',
      subtitle: 'Configure application assistance fees and operations communication defaults'
    }
  }
  return {
    title: 'Place4U Administration',
    subtitle: 'Platform Operations Portal'
  }
}

export default function AdminLayout() {
  const location = useLocation()
  const { title, subtitle } = metaForPath(location.pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="admin-root bg-[#F8FAFC] flex min-h-screen text-slate-900 font-sans antialiased">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[240px] flex-1 flex flex-col min-h-screen w-full">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
