import { useState } from "react";
import { MailOpen, MessageCircle } from "lucide-react";
import { T } from './styles/designTokens';
import { MessageCard } from './Component/MessageCard';
import { MessageReplyModal } from './component/MessageReplyModal';
import { PrimaryBtn, SecondaryBtn } from './component/Buttons';

export const Messages = ({ messages, onSendReply, onMarkAllRead }) => {
  const [msgFilter, setMsgFilter] = useState("all");
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState({ recipient: "", content: "" });

  const inputStyle = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: "0.625rem", padding: "0.6rem 0.875rem",
    fontSize: "0.85rem", color: T.textPrimary, outline: "none", fontFamily: "inherit"
  };

  const filteredMsgs = messages.filter(m => {
    if (msgFilter === "tenants") return m.role.startsWith("Tenant");
    if (msgFilter === "prospects") return m.role.startsWith("Prospective");
    return true;
  });

  const handleReply = (message) => {
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const handleSendReply = (id, reply) => {
    onSendReply(id, reply);
    setShowReplyModal(false);
  };

  const handleSendNewMessage = () => {
    if (newMessage.recipient && newMessage.content) {
      // Handle sending new message
      console.log("Sending new message:", newMessage);
      setNewMessage({ recipient: "", content: "" });
    }
  };

  return (
    <>
      <MessageReplyModal 
        isOpen={showReplyModal} 
        onClose={() => setShowReplyModal(false)} 
        message={selectedMessage} 
        onSend={handleSendReply} 
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Messages
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Communicate with tenants and prospective renters</p>
        </div>
        <SecondaryBtn onClick={onMarkAllRead}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MailOpen size={14} /> Mark all read
          </span>
        </SecondaryBtn>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {[
          ["all", "All"],
          ["unread", "Unread"],
          ["tenants", "Tenants"],
          ["prospects", "Prospects"]
        ].map(([val, lbl]) => (
          <button 
            key={val} 
            onClick={() => setMsgFilter(val)} 
            style={{
              padding: "6px 16px", borderRadius: "20px",
              border: `1px solid ${msgFilter === val ? T.accent : T.border}`,
              background: msgFilter === val ? "rgba(79,126,248,0.15)" : "transparent",
              color: msgFilter === val ? T.accent : T.textSecondary,
              fontSize: "0.8rem", fontWeight: msgFilter === val ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s"
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "2rem" }}>
        {filteredMsgs.map(m => (
          <MessageCard key={m.id} message={m} onReply={handleReply} />
        ))}
      </div>

      {/* Compose */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", padding: "1.5rem" }}>
        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageCircle size={16} color={T.accent} /> New Message
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <select 
            style={{ ...inputStyle, width: "100%" }}
            value={newMessage.recipient}
            onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}
          >
            <option value="">Select recipient…</option>
            {messages.map(m => (
              <option key={m.id} value={m.sender}>{m.sender} · {m.role}</option>
            ))}
          </select>
          <textarea 
            placeholder="Type your message…" 
            rows={3} 
            style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
            value={newMessage.content}
            onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PrimaryBtn onClick={handleSendNewMessage}>Send Message</PrimaryBtn>
          </div>
        </div>
      </div>
    </>
  );
};