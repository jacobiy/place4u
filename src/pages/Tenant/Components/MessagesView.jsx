import React, { useState } from 'react'
import { Paperclip, Send, FileText, Check } from 'lucide-react'
import { CONVERSATIONS, MESSAGES } from '../Data/constants'

export default function MessagesView() {
  const [activeConv, setActiveConv] = useState('1')
  const [message, setMessage] = useState('')

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 glass rounded-3xl overflow-hidden border-white/5">
      <div className="w-80 border-r border-white/10 flex flex-col shrink-0">
        <header className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold tracking-tight">Conversations</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          {CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={`w-full p-4 flex items-start gap-4 transition-all border-b border-white/5 hover:bg-white/5 text-left ${
                activeConv === conv.id ? 'bg-white/10' : ''
              }`}
              type="button"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0 border border-blue-500/10">
                {conv.avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm font-bold truncate ${conv.unread ? 'text-white' : 'text-white/80'}`}>
                    {conv.name}
                  </h3>
                  <span className="text-[10px] text-white/40 whitespace-nowrap ml-2">{conv.timestamp}</span>
                </div>
                <p className="text-xs text-white/40 truncate">{conv.lastMessage}</p>
              </div>
              {conv.unread ? <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white/[0.02]">
        <header className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold">Conversation</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Active Now</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {MESSAGES.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col gap-1 max-w-[70%]">
                <div
                  className={`p-4 rounded-3xl text-sm ${
                    msg.isMe
                      ? 'bg-blue-600 text-white rounded-tr-lg shadow-lg shadow-blue-600/20'
                      : 'bg-white/10 text-white/90 rounded-tl-lg border border-white/5'
                  }`}
                >
                  {msg.attachment ? (
                    <div className="flex items-center gap-4 py-2">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-red-400">
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-sm tracking-tight">{msg.attachment.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Check size={12} className="text-blue-400" />
                          <span className="text-[10px] text-white/40 font-medium">Attached</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <span className={`text-[10px] text-white/30 font-medium px-2 ${msg.isMe ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6">
          <div className="glass rounded-2xl p-2 flex items-center gap-2 border-white/10">
            <button className="p-3 text-white/40 hover:text-white transition-colors" type="button">
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              placeholder="Type your message here..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-white placeholder:text-white/20"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95" type="button">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

