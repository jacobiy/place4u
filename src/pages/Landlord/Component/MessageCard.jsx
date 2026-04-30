import { useState } from "react";
import { User, Paperclip } from "lucide-react";
import { T } from '../styles/designTokens';

export const MessageCard = ({ message, onReply }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={()=>setHovered(true)} 
      onMouseLeave={()=>setHovered(false)}
      style={{
        background: hovered ? T.cardBgHover : T.cardBg,
        border:`1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius:"0.875rem", padding:"1.25rem",
        transition:"all 0.2s", transform: hovered ? "translateY(-2px)" : "none"
      }}
    >
      <div style={{ display:"flex", gap:"1rem" }}>
        <div style={{
          width:"42px", height:"42px", borderRadius:"50%",
          background:`linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
        }}>
          <User size={18} color="#fff" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
            <div>
              <p style={{ fontWeight:600, color:T.textPrimary, fontSize:"0.9rem" }}>{message.sender}</p>
              <p style={{ fontSize:"0.75rem", color:T.textMuted }}>{message.role}</p>
            </div>
            <span style={{
              fontSize:"0.7rem", color:T.textMuted,
              background:T.surface, padding:"3px 10px", borderRadius:"20px"
            }}>{message.date}</span>
          </div>
          <p style={{ fontSize:"0.85rem", color:T.textSecondary, margin:"10px 0 14px", lineHeight:1.6 }}>{message.message}</p>
          <div style={{ display:"flex", gap:"8px" }}>
            <button
              onClick={()=>onReply(message)}
              style={{
                padding:"6px 16px", background:T.accent, border:"none",
                borderRadius:"8px", fontSize:"0.8rem", fontWeight:500,
                color:"#fff", cursor:"pointer", fontFamily:"inherit",
                transition:"background 0.15s"
              }}
              onMouseEnter={(e)=>e.currentTarget.style.background=T.accentHover}
              onMouseLeave={(e)=>e.currentTarget.style.background=T.accent}
            >Reply</button>
            {message.attachments?.length > 0 && (
              <button style={{
                padding:"6px 12px", background:"transparent",
                border:`1px solid ${T.border}`, borderRadius:"8px",
                fontSize:"0.8rem", color:T.textSecondary,
                cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", fontFamily:"inherit"
              }}>
                <Paperclip size={12} /> {message.attachments.length} files
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};