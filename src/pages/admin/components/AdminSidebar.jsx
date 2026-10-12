import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../utils/Supabase'
import {
  LayoutGrid,
  Users,
  Building2,
  FileCheck2,
  ShieldCheck,
  CreditCard,
  LineChart,
  Settings,
  LogOut,
  X,
  Mail,
  ExternalLink
} from 'lucide-react'
import { openGmail, getAdminAgentApplications, getAdminLandlordApplications } from '../db/queries'
import { subscribeToApplicationUpdates } from '../../../services/applicationSync'

const navLinkClass =
  'sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 transition-colors'

const navLinkActiveClass = 'bg-blue-600 text-white font-semibold shadow-xs'

const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5 mt-3">
    {children}
  </p>
)

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [adminName, setAdminName] = useState('Admin')
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [pendingAgentCount, setPendingAgentCount] = useState(0)
  const [pendingLandlordCount, setPendingLandlordCount] = useState(0)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            setAdminName(data.full_name)
          }
        })
    }

    const fetchUnassigned = () => {
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .is('assigned_to', null)
        .then(({ count }) => {
          if (typeof count === 'number') setUnassignedCount(count)
        })
    }

    fetchUnassigned()

    // Get count of pending agent applications
    getAdminAgentApplications()
      .then((apps) => {
        const count = (apps || []).filter((a) => a.verification_status === 'pending_review').length
        setPendingAgentCount(count)
      })
      .catch(() => {})

    // Get count of pending landlord applications
    getAdminLandlordApplications()
      .then((apps) => {
        const count = (apps || []).filter((a) => a.verification_status === 'pending_review').length
        setPendingLandlordCount(count)
      })
      .catch(() => {})

    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchUnassigned()
    })

    return () => unsubscribe()
  }, [user])

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const email = user?.email || 'admin@place4u.co.za'
  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        className={`w-[240px] h-screen bg-[#0B132B] flex flex-col fixed top-0 left-0 z-40 transition-transform duration-300 border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight block">Place4U</span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Admin Operations</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <SectionTitle>Application Workflows</SectionTitle>

          <NavLink
            to="/admin"
            end
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <LayoutGrid size={15} />
            Operations Dashboard
          </NavLink>

          <NavLink
            to="/admin/applications"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <FileCheck2 size={15} />
            Tenant Applications
            {unassignedCount > 0 && (
              <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unassignedCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/admin/agent-applications"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <ShieldCheck size={15} />
            Agent Applications
            {pendingAgentCount > 0 && (
              <span className="ml-auto bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingAgentCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/admin/landlord-applications"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <Building2 size={15} />
            Landlord Applications
            {pendingLandlordCount > 0 && (
              <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingLandlordCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/admin/properties"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <Building2 size={15} />
            Property Management
          </NavLink>

          <NavLink
            to="/admin/users"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <Users size={15} />
            Users & Roles
          </NavLink>

          <SectionTitle>Financial Releases</SectionTitle>

          <NavLink
            to="/admin/payments"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <CreditCard size={15} />
            Payments & Releases
          </NavLink>

          <SectionTitle>Intelligence & Tools</SectionTitle>

          <NavLink
            to="/admin/analytics"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <LineChart size={15} />
            Placement Analytics
          </NavLink>

          <NavLink
            to="/admin/settings"
            onClick={onClose}
            className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : 'hover:bg-white/5'}`}
          >
            <Settings size={15} />
            Settings
          </NavLink>

          {/* Quick Gmail Button */}
          <div className="pt-4 px-1">
            <button
              onClick={() => openGmail('admin@place4u.co.za', 'Place4U Admin Update', 'Hello team,')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              <Mail size={14} className="text-red-400" />
              Open Gmail Web
            </button>
          </div>
        </nav>

        {/* User Card Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#070D1E] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{adminName}</p>
            <p className="text-slate-400 text-[10px] truncate leading-tight mt-0.5">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            aria-label="Logout"
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}
