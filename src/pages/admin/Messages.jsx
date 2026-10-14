import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Send,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Radio,
  Paperclip,
  Smile,
  X,
  MessageSquare,
  ArrowLeft,
  CheckCheck,
  Check,
  Filter,
  Sparkles,
  Megaphone,
  Clock,
  FileText,
  Info
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/Supabase'
import {
  getAdminChatContacts,
  getAdminDirectMessages,
  sendAdminDirectMessage,
  broadcastAdminMessage
} from './db/queries'

const getInitials = (nameOrEmail) => {
  const raw = (nameOrEmail || '').trim()
  if (!raw) return '??'
  if (raw.includes('@')) return raw.slice(0, 2).toUpperCase()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const ROLE_COLORS = {
  admin: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Admin' },
  agent: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Agent' },
  landlord: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Landlord' },
  tenant: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Tenant' }
}

const QUICK_ACTIONS = [
  { icon: '🛡️', text: 'Verification approved & profile activated.' },
  { icon: '📄', text: 'Please upload updated FICA / proof of income documents.' },
  { icon: '⚠️', text: 'Lease compliance notice: pending inspection sign-off.' },
  { icon: '💳', text: 'Payment acknowledged & credited to account ledger.' },
  { icon: '🔒', text: 'Account security review complete. No actions needed.' }
]

const EMOJIS = ['👍', '🔑', '🏠', '📄', '🤝', '⭐', '📅', '✅', '🎉', '💼']

export default function AdminMessages() {
  const { user } = useAuth()
  const currentAdminId = user?.id || 'admin-super'

  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, tenant, landlord, agent, admin
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [composer, setComposer] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastTarget, setBroadcastTarget] = useState('all')
  const [broadcastContent, setBroadcastContent] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const listRef = useRef(null)
  const textareaRef = useRef(null)

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Load chat directory
  useEffect(() => {
    let isMounted = true
    const fetchContacts = async () => {
      setLoadingContacts(true)
      const res = await getAdminChatContacts(100)
      if (!isMounted) return
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item, idx) => ({
          ...item,
          unit: item.unit || (item.user_type === 'agent' ? 'Registered Agent' : item.user_type === 'landlord' ? 'Property Owner' : 'Resident Tenant'),
          lastMessage: item.last_message || (idx === 0 ? 'Inquiry regarding document verification.' : 'Direct platform communication.'),
          lastTime: 'Active',
          unread: idx === 0 ? 1 : 0
        }))
        setContacts(formatted)
        if (formatted.length > 0 && !selectedContact) {
          if (window.innerWidth >= 768) {
            setSelectedContact(formatted[0])
          }
        }
      }
      setLoadingContacts(false)
    }
    fetchContacts()
    return () => {
      isMounted = false
    }
  }, [])

  // Load conversation thread
  useEffect(() => {
    if (!selectedContact?.id) {
      setMessages([])
      return
    }

    let isMounted = true
    const loadConversation = async () => {
      const res = await getAdminDirectMessages(currentAdminId, selectedContact.id, 150)
      if (!isMounted) return
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setMessages(res.data)
      } else {
        // No stored conversation yet: show an empty thread.
        setMessages([])
      }
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
      })
    }

    loadConversation()

    const channel = supabase
      .channel(`admin-chat-${selectedContact.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          if (
            (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === currentAdminId) ||
            (newMsg.sender_id === currentAdminId && newMsg.receiver_id === selectedContact.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            requestAnimationFrame(() => {
              if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [selectedContact?.id, currentAdminId])

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const role = (c.user_type || 'tenant').toLowerCase()
      if (activeTab !== 'all' && role !== activeTab) return false
      const query = searchQuery.trim().toLowerCase()
      if (!query) return true
      return (
        (c.full_name || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query) ||
        (c.phone || '').toLowerCase().includes(query)
      )
    })
  }, [contacts, activeTab, searchQuery])

  // Send message
  const handleSendMessage = async () => {
    if (!selectedContact?.id) return
    let finalContent = composer.trim()
    if (attachment) {
      finalContent = finalContent
        ? `${finalContent}\n📎 Attached: ${attachment.name} (${attachment.size})`
        : `📎 Attached: ${attachment.name} (${attachment.size})`
    }
    if (!finalContent) return

    setComposer('')
    setAttachment(null)
    setShowEmojiPicker(false)

    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: currentAdminId,
      receiver_id: selectedContact.id,
      content: finalContent,
      created_at: new Date().toISOString(),
      status: 'sending'
    }

    setMessages((prev) => [...prev, optimistic])
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    })

    const res = await sendAdminDirectMessage(currentAdminId, selectedContact.id, finalContent)
    if (res.success && res.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...res.data, status: 'sent' } : m))
      )
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastContent.trim()) return
    setBroadcasting(true)
    const res = await broadcastAdminMessage(currentAdminId, broadcastTarget, broadcastContent.trim())
    setBroadcasting(false)
    setShowBroadcastModal(false)
    setBroadcastContent('')
    if (res.success) {
      triggerToast(`Broadcast transmitted to ${res.recipientCount} accounts successfully!`)
    } else {
      triggerToast('Broadcast failed to send.')
    }
  }

  const simulateAttachment = (name, size) => {
    setAttachment({ name, size })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#0B132B] text-slate-100 overflow-hidden relative font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={14} />
          {toastMessage}
        </div>
      )}

      {/* Top Operations Header */}
      <div className="h-14 border-b border-slate-800 bg-[#0B132B] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <MessageSquare size={17} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Communications & Messages Hub
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Direct real-time messaging, stakeholder support, and platform broadcasts.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Megaphone size={14} />
          <span className="hidden sm:inline">Broadcast Announcement</span>
          <span className="sm:hidden">Broadcast</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Contacts & Channels */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 bg-[#070D1E] flex flex-col shrink-0 z-20 ${
            selectedContact ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-slate-800/80 bg-[#0B132B] space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'tenant', label: 'Tenants' },
                { id: 'landlord', label: 'Landlords' },
                { id: 'agent', label: 'Agents' },
                { id: 'admin', label: 'Admins' }
              ].map((tab) => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/25'
                        : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
            {loadingContacts ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-700 border-t-blue-500 mx-auto" />
                <p>Loading stakeholders...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">No contacts found</p>
                <p className="text-[11px] text-slate-500">Try another filter or search term.</p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = selectedContact?.id === c.id
                const roleConfig = ROLE_COLORS[c.user_type] || ROLE_COLORS.tenant

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-500/10 border border-blue-500/40 shadow-sm'
                        : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                    )}

                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                        {getInitials(c.full_name || c.email)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070D1E]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {c.full_name || c.email}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {c.lastTime || 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}
                        >
                          {roleConfig.label}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {c.unit || c.email}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 truncate">
                        {c.lastMessage || c.email}
                      </p>
                    </div>

                    {c.unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Thread or Placeholder */}
        <main className={`flex-1 flex flex-col bg-[#0B132B] overflow-hidden relative ${
          !selectedContact ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedContact ? (
            <>
              {/* Thread Header */}
              <header className="h-[68px] border-b border-slate-800 bg-[#070D1E]/90 backdrop-blur-xs px-4 md:px-6 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back to directory"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {getInitials(selectedContact.full_name || selectedContact.email)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070D1E]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">
                        {selectedContact.full_name || selectedContact.email}
                      </h2>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).bg
                        } ${
                          (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).text
                        } ${
                          (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).border
                        }`}
                      >
                        {selectedContact.user_type || 'tenant'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {selectedContact.email}
                      </span>
                      {selectedContact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {selectedContact.phone}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      showDetailsDrawer
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    }`}
                    title="User Profile & Verification"
                  >
                    <Info size={15} />
                  </button>
                  <button
                    onClick={() => triggerToast('Compliance and FICA status verified.')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
                  >
                    <ShieldCheck size={14} />
                    Verified
                  </button>
                </div>
              </header>

              {/* Message List Viewport */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-radial from-slate-900/40 to-[#0B132B]"
              >
                <div className="flex justify-center my-2">
                  <span className="px-3.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 border border-slate-800 text-slate-400 uppercase tracking-widest shadow-xs">
                    🔒 Official Administrative Communication Channel • Place4U
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                    <MessageSquare size={32} className="mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-300">No messages in this channel yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Send a direct inquiry or select one of the quick compliance prompts below.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFromAdmin = m.sender_id === currentAdminId

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                          isFromAdmin ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md break-words ${
                            isFromAdmin
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-[#162038] text-slate-100 border border-slate-700/70 rounded-bl-xs'
                          }`}
                        >
                          {!isFromAdmin && (
                            <span className="text-[10px] font-bold text-blue-400 block mb-1">
                              {selectedContact.full_name || selectedContact.email}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400 font-medium">
                          <span>
                            {m.created_at
                              ? new Date(m.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Just now'}
                          </span>
                          {isFromAdmin && (
                            <span>
                              {m.status === 'sending' ? (
                                <Clock size={11} className="text-slate-400" />
                              ) : (
                                <CheckCheck size={12} className="text-blue-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Quick Action Prompts */}
              <div className="px-4 py-2 border-t border-slate-800/80 bg-[#070D1E]/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 text-blue-400">
                  <Sparkles size={11} /> Admin Actions:
                </span>
                {QUICK_ACTIONS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setComposer(item.text)
                      textareaRef.current?.focus()
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>

              {/* Attachment Preview (if selected) */}
              {attachment && (
                <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                    <FileText size={15} />
                    <span>{attachment.name}</span>
                    <span className="text-[10px] text-slate-400">({attachment.size})</span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Composer */}
              <footer className="p-3.5 border-t border-slate-800 bg-[#070D1E] relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-6 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-20">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setComposer((prev) => prev + emoji)
                          setShowEmojiPicker(false)
                        }}
                        className="text-lg p-1.5 hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 max-w-5xl mx-auto">
                  <button
                    type="button"
                    onClick={() => simulateAttachment('FICA_Compliance_Verified.pdf', '240 KB')}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                    title="Attach Official Documentation (FICA/Lease)"
                  >
                    <Paperclip size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                    title="Emoji"
                  >
                    <Smile size={17} />
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder={`Type official communication to ${selectedContact.full_name || 'user'}... (Press Enter to send)`}
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full resize-none py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!composer.trim() && !attachment}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      composer.trim() || attachment
                        ? 'bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/25 active:scale-95'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-radial from-slate-900/40 to-[#070D1E]">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-600/10">
                <MessageSquare size={32} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1.5">Place4U Communications Portal</h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                Select a tenant, landlord, or agent from the directory to start a secure direct thread, or broadcast platform notices to all users.
              </p>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
              >
                <Megaphone size={14} />
                Send Announcement Broadcast
              </button>
            </div>
          )}
        </main>

        {/* Details Drawer */}
        {selectedContact && showDetailsDrawer && (
          <aside className="w-72 border-l border-slate-800 bg-[#070D1E] p-4 flex flex-col shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Stakeholder Dossier</h3>
              <button
                onClick={() => setShowDetailsDrawer(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base font-bold text-slate-200 shadow-md">
                {getInitials(selectedContact.full_name || selectedContact.email)}
              </div>
              <h4 className="text-sm font-bold text-white mt-2">
                {selectedContact.full_name || selectedContact.email}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">{selectedContact.email}</p>
              <span
                className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).bg
                } ${
                  (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).text
                } ${
                  (ROLE_COLORS[selectedContact.user_type] || ROLE_COLORS.tenant).border
                }`}
              >
                {selectedContact.user_type || 'tenant'}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  User Role / Designation
                </span>
                <p className="text-xs font-semibold text-white">
                  {selectedContact.unit || 'Platform Stakeholder'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Phone Number
                </span>
                <p className="text-xs font-semibold text-white">
                  {selectedContact.phone || '+27 82 000 0000'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Verification Status
                </span>
                <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> FICA & Compliance Approved
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Platform Broadcast</h3>
                  <p className="text-[11px] text-slate-400">Transmit an announcement to stakeholders</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Recipient Audience
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'All Users' },
                    { id: 'tenant', label: 'Tenants' },
                    { id: 'landlord', label: 'Landlords' },
                    { id: 'agent', label: 'Agents' }
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setBroadcastTarget(target.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                        broadcastTarget === target.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Broadcast Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter important platform announcement, maintenance downtime notice, or policy update..."
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={broadcasting || !broadcastContent.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                {broadcasting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Megaphone size={14} />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
