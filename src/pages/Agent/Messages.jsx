import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Send, Phone, Video, Info, Shield, History, Layers, PlusCircle, Image as ImageIcon, Smile, MessageSquare, Home } from "lucide-react";
import { T } from "./Styles/designTokens";
import { AgentQueries as LandlordQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "??";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Messages = ({ agentProfile }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, tenant, landlord, agent
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadContacts = async () => {
      setIsLoading(true);
      setError("");
      const res = await LandlordQueries.listChatContacts(100);
      if (cancelled) return;
      if (!res.success) setError(res.error || "Failed to load contacts.");
      setContacts(res.success ? res.data : []);
      setIsLoading(false);
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadThread = async () => {
      if (!user?.id || !selectedContact?.id) {
        setMessages([]);
        return;
      }
      setError("");
      const res = await LandlordQueries.getDirectMessages(
        user.id,
        selectedContact.id,
        200
      );
      if (cancelled) return;
      if (!res.success) setError(res.error || "Failed to load messages.");
      setMessages(res.success ? res.data : []);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    };

    loadThread();
    return () => {
      cancelled = true;
    };
  }, [user?.id, selectedContact?.id]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    
    // Tab filter
    if (activeTab !== "all") {
      result = result.filter(c => (c.user_type || "tenant").toLowerCase() === activeTab);
    }

    // Search query filter
    const q = contactQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (c) =>
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [contacts, contactQuery, activeTab]);

  const send = async () => {
    if (!user?.id || !selectedContact?.id) return;
    const content = composer.trim();
    if (!content) return;

    setError("");
    setComposer("");
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedContact.id,
      content,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });

    const res = await LandlordQueries.sendDirectMessage(
      user.id,
      selectedContact.id,
      content
    );
    if (!res.success) {
      setError(res.error || "Failed to send message.");
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimistic.id ? res.data : m))
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div 
      className="flex h-[calc(100vh-65px)] md:h-screen w-full overflow-hidden"
      style={{ background: T.navy }}
    >
      {/* Sidebar: Conversations List */}
      <aside 
        className="w-sidebar-width border-r flex flex-col shrink-0"
        style={{ background: T.navyMid, borderColor: T.border }}
      >
        {/* Sidebar Header & Search */}
        <div 
          className="p-lg border-b space-y-md"
          style={{ borderColor: T.border }}
        >
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors flex items-center">
              <Search className="w-4 h-4" style={{ color: T.textMuted }} />
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-sm rounded-lg focus:ring-2 transition-all font-body-sm text-body-sm outline-none"
              style={{ 
                background: T.surface, 
                border: `1px solid ${T.border}`,
                color: T.textPrimary
              }}
            />
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-xs overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: "all", label: "All" },
              { id: "tenant", label: "Tenants" },
              { id: "landlord", label: "Landlords" },
              { id: "agent", label: "Agents" }
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-md py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors cursor-pointer"
                  style={{
                    background: active ? T.accent : T.surface,
                    color: active ? "#ffffff" : T.textSecondary
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-lg text-center font-body-sm text-body-sm" style={{ color: T.textMuted }}>
              Loading conversations...
            </div>
          ) : filteredContacts.length === 0 ? (
            /* Empty Conversation List */
            <div className="flex-grow flex flex-col items-center justify-center p-xl text-center space-y-md">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: T.surface }}>
                <MessageSquare className="text-3xl w-8 h-8" style={{ color: T.textMuted }} />
              </div>
              <div>
                <p className="font-label-md text-label-md" style={{ color: T.textPrimary }}>No conversations yet</p>
                <p className="font-body-sm text-body-sm mt-xs px-md" style={{ color: T.textMuted }}>
                  Filter categories or start a new thread to see messages here.
                </p>
              </div>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isActive = selectedContact?.id === c.id;
              const userType = c.user_type || "tenant";
              
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className="flex items-center gap-md p-lg border-b cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(79,126,248,0.12)" : "transparent",
                    borderLeft: isActive ? `4px solid ${T.accent}` : "none",
                    borderColor: T.border
                  }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-[#7c5ef8] flex items-center justify-center text-sm font-bold text-white uppercase shadow-sm">
                      {initials(c.full_name || c.email)}
                    </div>
                    <span 
                      className="absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full"
                      style={{ background: T.emerald, borderColor: T.navyMid }}
                    ></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-label-md text-label-md truncate" style={{ color: T.textPrimary }}>
                        {c.full_name || c.email}
                      </h4>
                      <span className="font-label-xs text-label-xs" style={{ color: T.textMuted }}>Active</span>
                    </div>
                    <div className="flex items-center gap-xs mb-1">
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: userType === "landlord"
                            ? "rgba(245,158,11,0.15)"
                            : userType === "agent"
                            ? "rgba(79,126,248,0.15)"
                            : "rgba(16,185,129,0.15)",
                          color: userType === "landlord"
                            ? T.amber
                            : userType === "agent"
                            ? T.accent
                            : T.emerald
                        }}
                      >
                        {userType}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm truncate" style={{ color: T.textSecondary }}>
                      {c.email}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col overflow-hidden relative" style={{ background: T.navy }}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <header 
              className="h-[72px] border-b px-lg flex items-center justify-between z-10 shrink-0"
              style={{ background: T.navyMid, borderColor: T.border }}
            >
              <div className="flex items-center gap-md">
                <div 
                  className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-[#7c5ef8] flex items-center justify-center text-sm font-bold text-white uppercase border"
                  style={{ borderColor: T.border }}
                >
                  {initials(selectedContact.full_name || selectedContact.email)}
                </div>
                <div>
                  <h3 className="font-label-md text-label-md" style={{ color: T.textPrimary }}>
                    {selectedContact.full_name || selectedContact.email}
                  </h3>
                  <div className="flex items-center gap-sm">
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: T.emerald
                      }}
                    >
                      {selectedContact.user_type || "tenant"}
                    </span>
                    <span className="flex items-center gap-1 font-label-xs text-label-xs" style={{ color: T.emerald }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: T.emerald }}></span>
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-md">
                <button 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: T.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: T.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: T.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Message Scroller */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-lg space-y-lg flex flex-col"
              style={{ background: T.navy }}
            >
              <div className="flex justify-center my-md">
                <span 
                  className="px-md py-1 rounded-full font-label-xs text-label-xs uppercase tracking-widest"
                  style={{ background: T.surface, color: T.textSecondary }}
                >
                  Messages
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="flex-grow flex items-center justify-center text-center p-lg font-body-sm text-body-sm" style={{ color: T.textMuted }}>
                  No messages yet. Say hello.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-sm max-w-[80%] ${
                        isMine ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-[#7c5ef8] flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0">
                          {initials(selectedContact.full_name || selectedContact.email)}
                        </div>
                      )}
                      <div>
                        <div
                          className={`p-md shadow-sm ${
                            isMine
                              ? "chat-bubble-sent text-white"
                              : "chat-bubble-received text-white"
                          }`}
                          style={{
                            background: isMine ? T.accent : T.navyMid,
                            border: isMine ? "none" : `1px solid ${T.border}`
                          }}
                        >
                          <p className="font-body-md text-body-md whitespace-pre-wrap leading-normal">
                            {m.content}
                          </p>
                        </div>
                        <span className={`font-label-xs text-label-xs mt-1 block ${isMine ? "text-right" : ""}`} style={{ color: T.textMuted }}>
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Area */}
            <footer 
              className="p-lg border-t shrink-0"
              style={{ background: T.navyMid, borderColor: T.border }}
            >
              <div className="flex items-center gap-md max-w-5xl mx-auto">
                <button 
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90"
                  style={{ color: T.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <PlusCircle className="w-6 h-6" />
                </button>
                <button 
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90"
                  style={{ color: T.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full py-md px-lg rounded-full focus:ring-2 transition-all outline-none font-body-md text-body-md"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      color: T.textPrimary
                    }}
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ color: T.textMuted }}>
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={send}
                  disabled={!composer.trim()}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  style={{ 
                    background: composer.trim() ? T.accent : T.surface,
                    color: "#ffffff"
                  }}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </footer>
          </>
        ) : (
          /* Empty State / Welcome Panel */
          <div className="flex-grow relative flex flex-col items-center justify-center overflow-y-auto" style={{ background: T.navy }}>
            <div className="max-w-[560px] w-full px-lg py-xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Illustration/Visual Anchor */}
              <div className="relative mb-xl inline-block">
                <div className="absolute -inset-4 rounded-full blur-3xl" style={{ background: "rgba(79, 126, 248, 0.15)" }}></div>
                <div 
                  className="relative w-48 h-48 mx-auto rounded-3xl flex items-center justify-center shadow-lg border"
                  style={{ background: T.navyMid, borderColor: T.border }}
                >
                  <img
                    alt="Welcome illustration"
                    className="w-40 h-40 object-cover rounded-2xl"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2F0jrtiFQ2Sg5CkpalgGeiTZdtngZOImX3ELaz0r4uVXoB2TyghLQSUq472MZTN4jStbx-4RDNMmiQoclH_lqUvZS5dMKlX_gRPH3LdsSpc-Gjdx32TD6orv_FGE4J1QWnMQ1wyRNxMiVSMV-s4J7F3YwKOwKe58Xyw8fjsW8EZsTMIqbiVrbvwH4cGw1B3UAJtJoF8VqMnCviUqGQaC3OmkxjgwkyF5FhKDrcisd21SgQIPLlzto6ddxiUL7kY7CikC7nbmJfXw"
                  />
                </div>
                {/* Decorative Floating Icons */}
                <div 
                  className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-md border"
                  style={{ background: T.surface, borderColor: T.border, color: T.accent }}
                >
                  <Home className="w-5 h-5" style={{ color: T.accent }} />
                </div>
                <div 
                  className="absolute bottom-4 -left-6 w-14 h-14 rounded-full flex items-center justify-center shadow-md border"
                  style={{ background: T.surface, borderColor: T.border, color: T.accent }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: T.accent }} />
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-md">
                <h1 className="font-headline-xl text-headline-xl tracking-tight" style={{ color: T.textPrimary }}>
                  Welcome to Place4U Messaging
                </h1>
                <p className="font-body-md text-body-md leading-relaxed max-w-md mx-auto" style={{ color: T.textSecondary }}>
                  Connect with tenants, landlords, and agents to start your journey. Manage your leases, inquiries, and property details all in one secure place.
                </p>
              </div>

              {/* Info grid */}
              <div className="mt-xl grid grid-cols-1 sm:grid-cols-3 gap-lg border-t pt-xl" style={{ borderColor: T.border }}>
                <div className="text-center space-y-xs flex flex-col items-center">
                  <Shield className="w-6 h-6 mb-xs" style={{ color: T.accent }} />
                  <h3 className="font-label-md text-label-md" style={{ color: T.textPrimary }}>Secure</h3>
                  <p className="font-body-sm text-body-sm" style={{ color: T.textMuted }}>Encrypted end-to-end</p>
                </div>
                <div className="text-center space-y-xs border-x px-md flex flex-col items-center" style={{ borderColor: T.border }}>
                  <History className="w-6 h-6 mb-xs" style={{ color: T.accent }} />
                  <h3 className="font-label-md text-label-md" style={{ color: T.textPrimary }}>Trackable</h3>
                  <p className="font-body-sm text-body-sm" style={{ color: T.textMuted }}>Full history archived</p>
                </div>
                <div className="text-center space-y-xs flex flex-col items-center">
                  <Layers className="w-6 h-6 mb-xs" style={{ color: T.accent }} />
                  <h3 className="font-label-md text-label-md" style={{ color: T.textPrimary }}>Integrated</h3>
                  <p className="font-body-sm text-body-sm" style={{ color: T.textMuted }}>Syncs with leases</p>
                </div>
              </div>
            </div>

            {/* Subtle background branding */}
            <div className="absolute bottom-lg right-lg opacity-5 select-none pointer-events-none">
              <span className="font-headline-xl text-[120px] font-black tracking-tighter" style={{ color: T.accent }}>
                Place4U
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
