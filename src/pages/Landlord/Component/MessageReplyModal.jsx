import { useState } from "react";
import { Modal } from '../Component/Modal';
import { PrimaryBtn, SecondaryBtn } from './Buttons';
import { T } from '../styles/designTokens';

export const MessageReplyModal = ({ isOpen, onClose, message, onSend }) => {
  const [reply, setReply] = useState("");
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reply to ${message?.sender}`} size="md">
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"0.625rem", padding:"1rem" }}>
          <p style={{ fontSize:"0.7rem", color:T.textMuted, fontWeight:500, marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Original message</p>
          <p style={{ fontSize:"0.85rem", color:T.textSecondary, lineHeight:1.6 }}>{message?.message}</p>
        </div>
        <textarea
          value={reply} 
          onChange={(e)=>setReply(e.target.value)}
          placeholder="Type your reply…"
          rows={4}
          style={{
            width:"100%", padding:"0.75rem", background:T.surface,
            border:`1px solid ${T.border}`, borderRadius:"0.625rem",
            fontSize:"0.875rem", color:T.textPrimary, resize:"vertical",
            fontFamily:"inherit", outline:"none"
          }}
        />
        <div style={{ display:"flex", gap:"10px" }}>
          <PrimaryBtn style={{ flex:1 }} onClick={()=>{ 
            if(reply.trim()){
              onSend(message.id,reply);
              setReply("");
              onClose();
            } 
          }}>
            Send Reply
          </PrimaryBtn>
          <SecondaryBtn style={{ flex:1 }} onClick={onClose}>
            Cancel
          </SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};