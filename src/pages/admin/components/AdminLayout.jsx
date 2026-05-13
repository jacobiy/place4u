import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import '../style/admin.css'

const titleForPath = (pathname) => {
  if (pathname === '/admin' || pathname === '/admin/') return { title: 'Dashboard Overview', subtitle: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  if (pathname.startsWith('/admin/transactions'))
    return { title: 'Transaction Monitoring', subtitle: 'Real-time view of all financial activities on the platform' }
  if (pathname.startsWith('/admin/users'))
    return { title: 'User Management', subtitle: 'Manage landlords, tenants, and agents across the platform' }
  return { title: 'Admin', subtitle: 'Platform administration' }
}

const AdminLayout = () => {
  const location = useLocation()
  const { title, subtitle } = titleForPath(location.pathname)

  return (
    <div className="admin-root bg-slate-100 flex min-h-screen">
      <AdminSidebar />
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <AdminTopbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

