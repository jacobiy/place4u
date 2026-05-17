import React, { useState } from 'react'
import { Home, Search, MessageSquare, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/Supabase'
import DashboardView from './Components/DashboardView'
import BrowseView from './Components/BrowseView'
import MessagesView from './Components/MessagesView'
import PropertyDetailView from './Components/PropertyDetailView'
import CustomApplication from './Components/CustomApplication'

export default function MainTenant() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeProperty, setActiveProperty] = useState(null)
  const [showApplication, setShowApplication] = useState(false)
  const [applicationProperty, setApplicationProperty] = useState(null)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const onPropertyClick = (property) => {
    setActiveProperty(property)
  }

  const onApplyClick = (property) => {
    setApplicationProperty(property ?? null)
    setShowApplication(true)
  }

  if (activeProperty) {
    return (
      <>
        <PropertyDetailView
          property={activeProperty}
          onBack={() => setActiveProperty(null)}
          onApplyClick={onApplyClick}
        />
        {showApplication ? (
          <CustomApplication
            property={applicationProperty ?? activeProperty}
            onCancel={() => {
              setShowApplication(false)
              setApplicationProperty(null)
            }}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <div className="fixed left-0 top-0 w-64 h-full bg-black/30 backdrop-blur border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              P
            </div>
            <div>
              <div className="font-bold leading-tight">Place4U</div>
              <div className="text-[11px] text-white/40">Tenant</div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <Home size={18} />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'browse' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <Search size={18} />
            <span className="text-sm font-semibold">Browse</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'messages' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span className="text-sm font-semibold">Messages</span>
          </button>
        </div>

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white py-3 rounded-xl transition"
          >
            <LogOut size={16} />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="ml-64 p-8 max-w-7xl">
        {activeTab === 'dashboard' ? (
          <DashboardView
            onPropertyClick={onPropertyClick}
            onApplyClick={onApplyClick}
            onOpenCustomApplication={() => {
              setApplicationProperty(null)
              setShowApplication(true)
            }}
          />
        ) : null}
        {activeTab === 'browse' ? <BrowseView onPropertyClick={onPropertyClick} onApplyClick={onApplyClick} /> : null}
        {activeTab === 'messages' ? <MessagesView /> : null}
      </div>

      {showApplication ? (
        <CustomApplication
          property={applicationProperty}
          onCancel={() => {
            setShowApplication(false)
            setApplicationProperty(null)
          }}
        />
      ) : null}
    </div>
  )
}
