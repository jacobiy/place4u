import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Send,
  Phone,
  Video,
  Info,
  Shield,
  ShieldCheck,
  History,
  Layers,
  Paperclip,
  Smile,
  MessageSquare,
  Home,
  ArrowLeft,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  X,
  FileText,
  User
} from "lucide-react";
import { AgentQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../utils/Supabase";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "??";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const ROLE_STYLES = {
  admin: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    label: "Admin"
  },
  agent: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    label: "Agent"
  },
  landlord: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    label: "Landlord"
  },
  tenant: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "Tenant"
  }
};

const AGENT_QUICK_ACTIONS = [
  { icon: "📍", text: "Viewing appointment confirmed for this Saturday at 11:00 AM." },
  { icon: "📋", text: "Application documents received and submitted for vetting." },
  { icon: "📑", text: "Lease agreement prepared and awaiting digital signature." },
  { icon: "📞", text: "Are you available for a brief 5-minute phone call?" },
  { icon: "🔑", text: "Inspection scheduled for key handover." }
];

const EMOJIS = ["👍", "🔑", "🏠", "📄", "🤝", "⭐", "📅", "✅", "🎉", "💼"];


export const Messages = ({ agentProfile }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [contacts, setContacts] = useState([]);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, tenant, landlord, admin
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [error, setError] = useState("");

  const listRef = useRef(null);
  const textareaRef = useRef(null);

  // Load contacts
  useEffect(() => {
    let cancelled = false;
    const loadContacts = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await AgentQueries.listChatContacts(100);
        if (cancelled) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map((item) => ({
            ...item,
            unit: item.unit || (item.user_type === "landlord" ? "Property Owner" : item.user_type === "admin" ? "Platform Admin" : "Prospective Resident"),
            lastMessage: item.last_message || "",
            lastTime: item.last_time || "",
            unread: item.unread || 0
          }));
          setContacts(formatted);
          if (!selectedContact && window.innerWidth >= 768) {
            setSelectedContact(formatted[0]);
          }
        } else {
          setContacts([]);
        }
      } catch {
        if (!cancelled) {
          setContacts([]);
        }
      }
      setIsLoading(false);
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load thread & setup realtime
  useEffect(() => {
    if (!selectedContact?.id) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const loadThread = async () => {
      setError("");
      try {
        const res = await AgentQueries.getDirectMessages(
          currentUserId,
          selectedContact.id,
          200
        );
        if (cancelled) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setMessages(res.data);
        } else {
          // No stored messages yet: show an empty thread.
          setMessages([]);
        }
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        });
      } catch (err) {
        if (!cancelled) setError("Could not load direct messages.");
      }
    };

    loadThread();

    // Supabase Realtime channel
    const channel = supabase
      .channel(`agent-chat-${selectedContact.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === currentUserId) ||
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === selectedContact.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            requestAnimationFrame(() => {
              if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight;
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedContact?.id, currentUserId]);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (activeTab !== "all") {
      result = result.filter(
        (c) => (c.user_type || "tenant").toLowerCase() === activeTab
      );
    }

    const q = contactQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (c) =>
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [contacts, contactQuery, activeTab]);

  const send = async () => {
    if (!selectedContact?.id) return;
    let content = composer.trim();
    if (attachment) {
      content = content
        ? `${content}\n📎 Attached: ${attachment.name} (${attachment.size})`
        : `📎 Attached: ${attachment.name} (${attachment.size})`;
    }
    if (!content) return;

    setError("");
    setComposer("");
    setAttachment(null);
    setShowEmojiPicker(false);

    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: selectedContact.id,
      content,
      created_at: new Date().toISOString(),
      status: "sending"
    };

    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });

    try {
      const res = await AgentQueries.sendDirectMessage(
        currentUserId,
        selectedContact.id,
        content
      );

      if (res?.success && res?.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...res.data, status: "sent" } : m))
        );
      } else {
        // Send failed: drop the optimistic bubble and surface an error.
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setError("Your message could not be sent. Please try again.");
      }
    } catch {
      // Keep optimistic message
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const simulateAttachment = (name, size) => {
    setAttachment({ name, size });
  };

  return (
    <div className="flex h-[calc(100vh-65px)] md:h-screen w-full bg-[#0B132B] text-slate-100 overflow-hidden font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Column 1: Conversations & Threads Sidebar                     */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 bg-[#070D1E] flex flex-col shrink-0 z-20 ${
          selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0B132B] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <MessageSquare size={16} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">Agent Communications</h1>
                <p className="text-[11px] text-slate-400">Direct lead & tenancy hub</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, landlords, support..."
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
            />
            {contactQuery && (
              <button
                onClick={() => setContactQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "tenant", label: "Tenants" },
              { id: "landlord", label: "Landlords" },
              { id: "admin", label: "Support" }
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/25"
                      : "bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contacts Scroller */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-700 border-t-blue-500 mx-auto" />
              <p>Loading conversations...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No conversations found</p>
              <p className="text-[11px] text-slate-500">Try adjusting your filter or search query.</p>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isActive = selectedContact?.id === c.id;
              const roleConfig = ROLE_STYLES[c.user_type] || ROLE_STYLES.tenant;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 relative ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600/20 to-indigo-500/10 border border-blue-500/40 shadow-sm"
                      : "hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                      {initials(c.full_name || c.email)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070D1E]" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">
                        {c.full_name || c.email}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {c.lastTime || "Active"}
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

                  {/* Unread badge */}
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* Column 2: Active Chat Viewport                                */}
      {/* ------------------------------------------------------------- */}
      <main
        className={`flex-1 flex flex-col bg-[#0B132B] overflow-hidden relative ${
          !selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedContact ? (
          <>
            {/* Chat Sticky Header */}
            <header className="h-[68px] border-b border-slate-800 bg-[#070D1E]/90 backdrop-blur-xs px-4 md:px-6 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Back to contacts"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                    {initials(selectedContact.full_name || selectedContact.email)}
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
                        (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).bg
                      } ${
                        (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).text
                      } ${
                        (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).border
                      }`}
                    >
                      {selectedContact.user_type || "tenant"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Direct Lead Channel
                    </span>
                    <span>• {selectedContact.email}</span>
                  </p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(`tel:${selectedContact.phone || ''}`, '_self')}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Direct Phone Call"
                >
                  <Phone size={15} />
                </button>
                <button
                  onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    showDetailsDrawer
                      ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
                  }`}
                  title="Lead Profile & Documents"
                >
                  <Info size={15} />
                </button>
              </div>
            </header>

            {/* Message Thread Scroller */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-radial from-slate-900/40 to-[#0B132B]"
            >
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 border border-slate-800 text-slate-400 uppercase tracking-widest shadow-xs">
                  🔒 Encrypted Agent Channel • Place4U Verified Lead
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <MessageSquare size={32} className="mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No messages yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Send a note or select one of the agent prompt chips below.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === currentUserId;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                        isMine ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md break-words ${
                          isMine
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                            : "bg-[#162038] text-slate-100 border border-slate-700/70 rounded-bl-xs"
                        }`}
                      >
                        {!isMine && (
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
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "Just now"}
                        </span>
                        {isMine && (
                          <span>
                            {m.status === "sending" ? (
                              <Clock size={11} className="text-slate-400" />
                            ) : (
                              <CheckCheck size={12} className="text-blue-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action Chips Carousel */}
            <div className="px-4 py-2 border-t border-slate-800/80 bg-[#070D1E]/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 text-blue-400">
                <Sparkles size={11} /> Agent Prompts:
              </span>
              {AGENT_QUICK_ACTIONS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setComposer(item.text);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Attachment preview if loaded */}
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

            {/* Message Composer */}
            <footer className="p-3.5 border-t border-slate-800 bg-[#070D1E] relative">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-6 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-20">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setComposer((prev) => prev + emoji);
                        setShowEmojiPicker(false);
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
                  onClick={() => simulateAttachment("Lease_Offer_Draft.pdf", "320 KB")}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Attach Documents / Lease PDF"
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
                    placeholder={`Message ${selectedContact.full_name || 'client'}... (Press Enter to send)`}
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full resize-none py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                    style={{ maxHeight: "120px" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={send}
                  disabled={!composer.trim() && !attachment}
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    composer.trim() || attachment
                      ? "bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/25 active:scale-95"
                      : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
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
            <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">Agent Communications Center</h2>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              Select a tenant lead, property owner, or platform support from the left directory to schedule viewings, coordinate offers, and finalize contracts.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md w-full border-t border-slate-800 pt-4">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Shield size={16} className="mx-auto text-blue-400 mb-1" />
                <p className="text-[10px] font-semibold text-white">Verified Leads</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <History size={16} className="mx-auto text-blue-400 mb-1" />
                <p className="text-[10px] font-semibold text-white">Deal History</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Layers size={16} className="mx-auto text-blue-400 mb-1" />
                <p className="text-[10px] font-semibold text-white">Lease Pipeline</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Column 3: Collapsible Contact/Lead Drawer                      */}
      {/* ------------------------------------------------------------- */}
      {selectedContact && showDetailsDrawer && (
        <aside className="w-72 border-l border-slate-800 bg-[#070D1E] p-4 flex flex-col shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Client Dossier</h3>
            <button
              onClick={() => setShowDetailsDrawer(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-base font-bold text-white shadow-md">
              {initials(selectedContact.full_name || selectedContact.email)}
            </div>
            <h4 className="text-sm font-bold text-white mt-2">
              {selectedContact.full_name || selectedContact.email}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{selectedContact.email}</p>
            <span
              className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).bg
              } ${
                (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).text
              } ${
                (ROLE_STYLES[selectedContact.user_type] || ROLE_STYLES.tenant).border
              }`}
            >
              {selectedContact.user_type || "tenant"}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Interest / Role
              </span>
              <p className="text-xs font-semibold text-white">
                {selectedContact.unit || "Sandton Penthouse"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Contact Phone
              </span>
              <p className="text-xs font-semibold text-white">
                {selectedContact.phone || "+27 83 234 5678"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Vetting & ID Status
              </span>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={13} /> Screening Complete
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
