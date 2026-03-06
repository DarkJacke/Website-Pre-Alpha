import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Upload, MessageCircle, Search, Settings,
  LogOut, User, ChevronDown, Zap, X, Menu
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, onSearch, onMobileToggle }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchType);
      if (onMobileToggle) onMobileToggle();
    }
  };

  const handleNav = (page) => {
    setActivePage(page);
    if (onMobileToggle) onMobileToggle();
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'chat', icon: MessageCircle, label: 'Messages' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`h-screen flex flex-col border-r border-white/10 bg-[#050505] transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      data-testid="sidebar">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color: 'var(--accent-color)' }} />
            <span className="font-heading text-sm font-bold tracking-tight uppercase">CyberVoid</span>
          </div>
        )}
        {/* Desktop collapse */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-white/40 hover:text-white transition-colors p-1 hidden md:block"
          data-testid="sidebar-toggle">
          {collapsed ? <Menu size={18} /> : <X size={16} />}
        </button>
        {/* Mobile close */}
        <button onClick={onMobileToggle}
          className="text-white/40 hover:text-white transition-colors p-1 md:hidden"
          data-testid="sidebar-close-mobile">
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <form onSubmit={handleSearch} className="p-3 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              data-testid="sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {['all', 'files', 'accounts'].map(t => (
              <button key={t} type="button"
                data-testid={`search-type-${t}`}
                onClick={() => setSearchType(t)}
                className={`flex-1 text-[10px] uppercase tracking-widest py-1.5 font-ui transition-all ${
                  searchType === t
                    ? 'text-black font-bold'
                    : 'text-white/40 hover:text-white/60 bg-transparent'
                }`}
                style={searchType === t ? { background: 'var(--accent-color)' } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.id}
            data-testid={`nav-${item.id}`}
            onClick={() => handleNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-all duration-200 ${
              activePage === item.id
                ? 'text-black font-bold'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            } ${collapsed ? 'justify-center' : ''}`}
            style={activePage === item.id ? { background: 'var(--accent-color)' } : {}}
            title={collapsed ? item.label : ''}
          >
            <item.icon size={18} />
            {!collapsed && <span className="font-ui tracking-wide">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10 relative shrink-0" ref={dropdownRef}>
        <button
          data-testid="user-menu-button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition-colors rounded-sm"
        >
          <img src={user?.avatar_url} alt="" className="w-8 h-8 rounded-sm bg-white/10 shrink-0" />
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-ui font-bold truncate">{user?.display_name}</p>
                <p className="text-[10px] text-white/40 font-body truncate">@{user?.username}</p>
              </div>
              <ChevronDown size={14} className={`text-white/40 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#0A0A0A] border border-white/10 animate-fade-in-up z-50 shadow-2xl"
            data-testid="user-dropdown">
            <button
              data-testid="dropdown-profile"
              onClick={() => { handleNav('profile'); setDropdownOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors font-ui"
            >
              <User size={16} /> Profile
            </button>
            <button
              data-testid="dropdown-settings"
              onClick={() => { handleNav('settings'); setDropdownOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors font-ui"
            >
              <Settings size={16} /> Settings
            </button>
            <div className="border-t border-white/10" />
            <button
              data-testid="dropdown-logout"
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors font-ui"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
