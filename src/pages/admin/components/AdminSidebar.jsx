import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../utils/Supabase'
import {
  LayoutGrid,
  Users,
  Building2,
  ArrowLeftRight,
  FileText,
  LineChart,
  BarChart3,
  Settings,
  Bell,
  LogOut
} from 'lucide-react'

const navLinkClass =
  'sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300'

const navLinkActiveClass = 'bg-blue-600 text-white'

const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">{children}</p>
)

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [adminName, setAdminName] = useState('Super Admin');

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            setAdminName(data.full_name);
          }
        });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const email = user?.email || 'admin@propadmin.io';
  const initials = adminName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <aside className="w-[240px] min-h-screen bg-[#0F1E35] flex flex-col fixed top-0 left-0 z-20">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">PropAdmin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <SectionTitle>Main</SectionTitle>

        <NavLink
          to="/admin"
          end
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <LayoutGrid size={16} />
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/users"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <Users size={16} />
          Users
        </NavLink>

        <NavLink
          to="/admin/properties"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <Building2 size={16} />
          Properties
        </NavLink>

        <NavLink
          to="/admin/applications"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <FileText size={16} />
          Applications
        </NavLink>

        <NavLink
          to="/admin/transactions"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <ArrowLeftRight size={16} />
          Transactions
        </NavLink>

        <NavLink
          to="/admin/leases"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <FileText size={16} />
          Leases
        </NavLink>

        <div className="my-3 border-t border-white/10" />
        <SectionTitle>Reports</SectionTitle>

        <NavLink
          to="/admin/analytics"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <LineChart size={16} />
          Analytics
        </NavLink>

        <NavLink
          to="/admin/reports"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <BarChart3 size={16} />
          Reports
        </NavLink>

        <div className="my-3 border-t border-white/10" />
        <SectionTitle>System</SectionTitle>

        <NavLink
          to="/admin/settings"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <Settings size={16} />
          Settings
        </NavLink>

        <NavLink
          to="/admin/notifications"
          className={({ isActive }) => `${navLinkClass} ${isActive ? navLinkActiveClass : ''}`}
        >
          <Bell size={16} />
          Notifications
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">5</span>
        </NavLink>
      </nav>

      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{adminName}</p>
          <p className="text-slate-500 text-[11px] truncate">{email}</p>
        </div>
        <button onClick={handleLogout} type="button" className="text-slate-500 hover:text-white" aria-label="Logout">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar

