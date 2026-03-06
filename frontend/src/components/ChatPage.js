import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Send, ArrowLeft, MessageCircle, CheckCheck } from 'lucide-react';

export default function ChatPage({ initialChatId }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialLoaded = useRef(false);
  const typingTimeout = useRef(null);
  const lastTypingSent = useRef(0);

  const loadChats = useCallback(async () => {
    try { setChats(await api.getChats()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    if (initialChatId && chats.length && !initialLoaded.current) {
      const c = chats.find(ch => ch.chat_id === initialChatId);
      if (c) { openChat(c); initialLoaded.current = true; }
    }
  }, [initialChatId, chats]);

  const openChat = async (chat) => {
    setActiveChat(chat);
    setTypingUser(null);
    try {
      const msgs = await api.getMessages(chat.chat_id);
      setMessages(msgs);
      api.markAsRead(chat.chat_id).catch(() => {});
    } catch {}

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(api.getWsUrl(chat.chat_id));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => prev.some(m => m.message_id === data.message_id) ? prev : [...prev, data]);
        ws.send(JSON.stringify({ type: 'read' }));
      } else if (data.type === 'typing' && data.sender_id !== user?.user_id) {
        setTypingUser(data.sender_username);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 3000);
      } else if (data.type === 'read' && data.reader_id !== user?.user_id) {
        setMessages(prev => prev.map(m => m.sender_id === user?.user_id ? { ...m, read: true } : m));
      }
    };
    wsRef.current = ws;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  useEffect(() => { return () => { if (wsRef.current) wsRef.current.close(); }; }, []);

  const handleInput = (val) => {
    setInput(val);
    if (wsRef.current?.readyState === 1 && Date.now() - lastTypingSent.current > 2000) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
      lastTypingSent.current = Date.now();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;
    const content = input.trim();
    setInput('');
    try { await api.sendMessage(activeChat.chat_id, content); } catch {}
  };

  if (loading) return <div className="flex-1 flex items-center justify-center" data-testid="chat-loading"><div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin"/></div>;

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="chat-page">
      {/* Chat list */}
      <div className={`w-full md:w-72 border-r border-white/10 flex flex-col bg-[#050505] shrink-0 ${activeChat?'hidden md:flex':'flex'}`}>
        <div className="p-4 border-b border-white/10 shrink-0">
          <h2 className="font-heading text-base md:text-lg font-bold tracking-tight uppercase">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length===0?(
            <div className="p-6 text-center text-white/30 font-ui text-sm" data-testid="no-chats">
              <MessageCircle size={28} className="mx-auto mb-3 opacity-30"/>
              <p>No conversations yet</p><p className="text-[10px] mt-1 text-white/20">Search for users to chat</p>
            </div>
          ):(
            chats.map(chat=>(
              <button key={chat.chat_id} data-testid={`chat-item-${chat.chat_id}`}
                onClick={()=>openChat(chat)}
                className={`w-full flex items-center gap-3 p-3 md:p-4 text-left transition-colors border-b border-white/5 ${activeChat?.chat_id===chat.chat_id?'bg-white/5':'hover:bg-white/5'}`}>
                <img src={chat.other_user?.avatar_url||''} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-sm bg-white/10 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm font-bold truncate">{chat.other_user?.display_name||chat.other_user?.username}</p>
                  <p className="text-[11px] text-white/30 font-body truncate">{chat.last_message||'No messages'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeChat?(
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 md:p-4 border-b border-white/10 flex items-center gap-3 bg-[#050505] shrink-0">
            <button onClick={()=>setActiveChat(null)} className="text-white/50 hover:text-white md:hidden" data-testid="chat-back-btn"><ArrowLeft size={18}/></button>
            <img src={activeChat.other_user?.avatar_url||''} alt="" className="w-8 h-8 rounded-sm bg-white/10 shrink-0"/>
            <div className="min-w-0">
              <p className="font-ui text-sm font-bold truncate">{activeChat.other_user?.display_name}</p>
              {typingUser ? (
                <p className="text-[10px] font-body animate-pulse" style={{color:'var(--accent-color)'}}>typing...</p>
              ) : (
                <p className="text-[10px] text-white/40 font-body truncate">@{activeChat.other_user?.username}</p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2" data-testid="chat-messages">
            {messages.map((msg,i)=>{
              const isMe = msg.sender_id===user?.user_id;
              return (
                <div key={msg.message_id} className={`flex ${isMe?'justify-end':'justify-start'} animate-message-in`}
                  style={{animationDelay:`${Math.min(i*0.02,0.3)}s`}}>
                  <div className={`max-w-[80%] md:max-w-[70%] px-3.5 py-2 ${isMe?'text-black':'bg-white/5 border border-white/10 text-white'}`}
                    style={isMe?{background:'var(--accent-color)'}:{}} data-testid={`message-${msg.message_id}`}>
                    {!isMe && <p className="text-[10px] font-ui mb-0.5" style={{color:'var(--accent-color)'}}>{msg.sender_username}</p>}
                    <p className="text-sm font-body break-words">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMe?'justify-end':''}`}>
                      <span className={`text-[9px] ${isMe?'text-black/50':'text-white/30'} font-body`}>
                        {new Date(msg.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                      {isMe && msg.read && <CheckCheck size={12} className="text-black/50"/>}
                    </div>
                  </div>
                </div>
              );
            })}
            {typingUser && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-3.5 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background:'var(--accent-color)', animationDelay:'0s'}}/>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background:'var(--accent-color)', animationDelay:'0.15s'}}/>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background:'var(--accent-color)', animationDelay:'0.3s'}}/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-white/10 flex gap-2 bg-[#050505] shrink-0 safe-bottom">
            <input data-testid="chat-input" value={input} onChange={e=>handleInput(e.target.value)}
              placeholder="Type a message..." maxLength={5000}
              className="flex-1 bg-white/5 border border-white/10 px-3 md:px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--accent-color)] font-body min-w-0"/>
            <button type="submit" data-testid="chat-send-btn"
              className="px-3 md:px-4 py-2.5 transition-all active:scale-95 shrink-0"
              style={{background:'var(--accent-color)',color:'#000'}}><Send size={16}/></button>
          </form>
        </div>
      ):(
        <div className="flex-1 hidden md:flex items-center justify-center text-white/20 font-ui" data-testid="chat-empty-state">
          <div className="text-center"><MessageCircle size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">Select a conversation</p></div>
        </div>
      )}
    </div>
  );
}
