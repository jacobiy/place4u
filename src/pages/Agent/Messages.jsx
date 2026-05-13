import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Search, Send } from "lucide-react";
import { T } from "./Styles/designTokens";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";
import { AgentQueries } from "./db/queries";
import { useAuth } from "../../hooks/useAuth";

const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "??";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Messages = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const inputStyle = useMemo(
    () => ({
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: "0.625rem",
      padding: "0.6rem 0.875rem",
      fontSize: "0.85rem",
      color: T.textPrimary,
      outline: "none",
      fontFamily: "inherit"
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      const res = await AgentQueries.listChatContacts(200);
      if (cancelled) return;
      if (!res.success) setError(res.error || "Failed to load contacts.");
      setContacts(res.success ? res.data : []);
      setIsLoading(false);
    };
    load();
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
      const res = await AgentQueries.getDirectMessages(user.id, selectedContact.id, 200);
      if (cancelled) return;
      setMissingTable(!!res.missingTable);
      if (!res.success) setError(res.error || "Failed to load messages.");
      setMessages(res.success ? res.data : []);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    };
    loadThread();
    return () => {
      cancelled = true;
    };
  }, [user?.id, selectedContact?.id]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [contacts, contactQuery]);

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
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));

    const res = await AgentQueries.sendDirectMessage(user.id, selectedContact.id, content);
    if (!res.success) {
      setError(res.error || "Failed to send message.");
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Messages
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Chat with tenants and landlords</p>
        </div>
        <SecondaryBtn onClick={() => setContactQuery("")}>Clear search</SecondaryBtn>
      </div>

      {missingTable && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: `1px solid ${T.amber}`, borderRadius: "0.875rem", padding: "0.9rem 1rem", marginBottom: "1.25rem", color: T.textSecondary }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Mail size={16} color={T.amber} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: T.textPrimary }}>Messaging backend not set up</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: T.textMuted }}>Create the `messages` table to enable chat.</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "16px", alignItems: "stretch" }}>
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "12px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input placeholder="Search profiles…" value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} style={{ ...inputStyle, width: "100%", paddingLeft: "36px" }} />
            </div>
          </div>
          <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
            {isLoading ? (
              <p style={{ padding: "14px", color: T.textMuted }}>Loading…</p>
            ) : filteredContacts.length === 0 ? (
              <p style={{ padding: "14px", color: T.textMuted }}>No profiles found.</p>
            ) : (
              filteredContacts.map((c) => {
                const active = selectedContact?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: active ? "rgba(79,126,248,0.10)" : "transparent",
                      borderBottom: `1px solid ${T.border}`,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      color: T.textSecondary
                    }}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>
                      {initials(c.full_name || c.email)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: T.textPrimary, fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.full_name || c.email}
                      </p>
                      <p style={{ margin: "2px 0 0 0", color: T.textMuted, fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.user_type}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
            <p style={{ margin: 0, color: T.textPrimary, fontWeight: 700 }}>{selectedContact ? (selectedContact.full_name || selectedContact.email) : "Select a profile"}</p>
            <p style={{ margin: "2px 0 0 0", color: T.textMuted, fontSize: "0.8rem" }}>{selectedContact ? selectedContact.email : "Start a conversation"}</p>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
            {!selectedContact ? (
              <p style={{ color: T.textMuted, textAlign: "center", padding: "2rem 0" }}>Pick a profile on the left to see the chat.</p>
            ) : messages.length === 0 ? (
              <p style={{ color: T.textMuted, textAlign: "center", padding: "2rem 0" }}>No messages yet. Say hello.</p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                    <div style={{ maxWidth: "78%", background: mine ? "rgba(79,126,248,0.18)" : T.surface, border: `1px solid ${mine ? "rgba(79,126,248,0.35)" : T.border}`, borderRadius: "14px", padding: "10px 12px", color: T.textPrimary }}>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{m.content}</p>
                      <p style={{ margin: "6px 0 0 0", fontSize: "0.7rem", color: T.textMuted, textAlign: "right" }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: "12px", borderTop: `1px solid ${T.border}` }}>
            {error && <p style={{ margin: "0 0 8px 0", color: T.red, fontSize: "0.85rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <textarea
                rows={2}
                placeholder={selectedContact ? "Type a message…" : "Select a profile to chat…"}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                disabled={!selectedContact}
                style={{ ...inputStyle, width: "100%", resize: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <PrimaryBtn onClick={send} disabled={!selectedContact || !composer.trim()}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Send size={14} /> Send
                </span>
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

