import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';

export default function ChatPage({ initialChatId }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadChats = useCallback(async () => {
    try {
      const data = await api.getChats();
      setChats(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    if (initialChatId && chats.length) {
      const c = chats.find(ch => ch.chat_id === initialChatId);
      if (c) openChat(c);
    }
  }, [initialChatId, chats]);

  const openChat = async (chat) => {
    setActiveChat(chat);
    try {
      const msgs = await api.getMessages(chat.chat_id);
      setMessages(msgs);
    } catch {}

    // Connect WebSocket
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(api.getWsUrl(chat.chat_id));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages(prev => {
        if (prev.some(m => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
    wsRef.current = ws;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;
    const content = input.trim();
    setInput('');
    try {
      await api.sendMessage(activeChat.chat_id, content);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30 font-ui" data-testid="chat-loading">
        Loading chats...
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="chat-page">
      {/* Chat list */}
      <div className={`w-72 border-r border-white/10 flex flex-col bg-[#050505] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10">
          <h2 className="font-heading text-lg font-bold tracking-tight uppercase">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-white/30 font-ui text-sm" data-testid="no-chats">
              <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-[11px] mt-1">Search for users to start chatting</p>
            </div>
          ) : (
            chats.map(chat => (
              <button key={chat.chat_id}
                data-testid={`chat-item-${chat.chat_id}`}
                onClick={() => openChat(chat)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-white/5 ${
                  activeChat?.chat_id === chat.chat_id ? 'bg-white/5' : 'hover:bg-white/5'
                }`}
              >
                <img src={chat.other_user?.avatar_url || ''} alt=""
                  className="w-10 h-10 rounded-sm bg-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm font-bold truncate">
                    {chat.other_user?.display_name || chat.other_user?.username}
                  </p>
                  <p className="text-[11px] text-white/30 font-body truncate">
                    {chat.last_message || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat messages */}
      {activeChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#050505]">
            <button onClick={() => setActiveChat(null)} className="md:hidden text-white/50 hover:text-white"
              data-testid="chat-back-btn">
              <ArrowLeft size={18} />
            </button>
            <img src={activeChat.other_user?.avatar_url || ''} alt=""
              className="w-8 h-8 rounded-sm bg-white/10" />
            <div>
              <p className="font-ui text-sm font-bold">{activeChat.other_user?.display_name}</p>
              <p className="text-[10px] text-white/40 font-body">@{activeChat.other_user?.username}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.user_id;
              return (
                <div key={msg.message_id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message-in`}
                  style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}
                >
                  <div className={`max-w-[70%] px-4 py-2.5 ${
                    isMe ? 'text-black' : 'bg-white/5 border border-white/10 text-white'
                  }`}
                    style={isMe ? { background: 'var(--accent-color)' } : {}}
                    data-testid={`message-${msg.message_id}`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-ui mb-1" style={{ color: 'var(--accent-color)' }}>
                        {msg.sender_username}
                      </p>
                    )}
                    <p className="text-sm font-body">{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${isMe ? 'text-black/50' : 'text-white/30'} font-body`}>
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-3 bg-[#050505]">
            <input
              data-testid="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
            />
            <button type="submit" data-testid="chat-send-btn"
              className="px-4 py-3 transition-all duration-200 active:scale-95"
              style={{ background: 'var(--accent-color)', color: '#000' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-white/20 font-ui"
          data-testid="chat-empty-state">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p>Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
