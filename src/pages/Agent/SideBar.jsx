import React from 'react'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Wallet,
  User,
  Settings,
  LogOut,
  GitBranch,
  X
} from 'lucide-react'
import { getUserAvatar, AvatarImage } from '../../utils/avatarHelper'

const navLinkClass =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 transition-colors w-full text-left'

const navLinkActiveClass = 'bg-blue-600 text-white font-semibold shadow-xs'

const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5 mt-3">
    {children}
  </p>
)

export const Sidebar = ({
  activeView,
  setActiveView,
  onLogout,
  profile,
  agentProfile,
  user,
  isOpen = false,
  onClose = () => {}
}) => {
  const displayName =
    profile?.full_name ||
    agentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Agent'
  const isAgentVerified = Boolean(agentProfile?.is_verified === true || profile?.is_verified === true)
  const email = user?.email || profile?.email || ''

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 w-[240px] bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-800/60 border border-slate-700/60 flex-shrink-0">
            <img
              src="/logo-icon.png"
              alt="Place4U"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight block leading-tight">Place4U</span>
            <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Agent Portal</span>
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
        <SectionTitle>Workspace</SectionTitle>

        <button
          type="button"
          onClick={() => {
            setActiveView('dashboard')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'dashboard' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('applications')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'applications' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <FileText size={15} />
          <span>Applications</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('pipeline')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'pipeline' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <GitBranch size={15} />
          <span>Match Pipeline</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('properties')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'properties' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <Building2 size={15} />
          <span>Properties</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('wallet')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'wallet' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <Wallet size={15} />
          <span>Earnings & Payouts</span>
        </button>

        <SectionTitle>Account</SectionTitle>

        <button
          type="button"
          onClick={() => {
            setActiveView('profile')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'profile' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <User size={15} />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('settings')
            onClose()
          }}
          className={`${navLinkClass} ${activeView === 'settings' ? navLinkActiveClass : 'hover:bg-white/5'}`}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>

        {/* Support note */}
        <div className="pt-6 px-3">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Need assistance?
            <a
              href="mailto:support@place4u.xyz"
              className="block font-semibold text-blue-300 hover:text-blue-200 transition-colors break-all mt-0.5"
            >
              support@place4u.xyz
            </a>
          </p>
        </div>
      </nav>

      {/* User Card Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#070D1E] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border border-slate-700">
          <AvatarImage src={getUserAvatar(agentProfile || { full_name: displayName }, 'agent')} alt={displayName} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate leading-tight">{displayName}</p>
          <p className="text-slate-400 text-[10px] truncate leading-tight mt-0.5">
            {isAgentVerified ? 'Verified Agent' : 'Unverified Agent'}
          </p>
        </div>
        <button
          onClick={onLogout}
          type="button"
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Log Out"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
export default Sidebar
