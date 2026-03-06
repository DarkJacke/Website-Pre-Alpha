import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UploadPage from './components/UploadPage';
import ChatPage from './components/ChatPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import SearchResults from './components/SearchResults';
import FilePreview from './components/FilePreview';
import { api } from './api';

function PageTransition({ pageKey, children }) {
  const [display, setDisplay] = useState(children);
  const [animClass, setAnimClass] = useState('page-enter-active');
  const prevKey = useRef(pageKey);

  useEffect(() => {
    if (prevKey.current !== pageKey) {
      setAnimClass('page-exit-active');
      const t = setTimeout(() => {
        setDisplay(children);
        setAnimClass('page-enter-active');
        prevKey.current = pageKey;
      }, 150);
      return () => clearTimeout(t);
    } else {
      setDisplay(children);
    }
  }, [pageKey, children]);

  return (
    <div className={`flex-1 flex overflow-hidden ${animClass}`}>
      {display}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { wallpaperUrl } = useTheme();
  const [activePage, setActivePage] = useState('dashboard');
  const [previewFile, setPreviewFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [viewProfileId, setViewProfileId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changePage = useCallback((page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  }, []);

  const handleSearch = useCallback((q, type) => {
    setSearchQuery(q);
    setSearchType(type);
    changePage('search');
  }, [changePage]);

  const handleViewProfile = useCallback((userId) => {
    setViewProfileId(userId);
    changePage('viewProfile');
  }, [changePage]);

  const handleStartChat = useCallback(async (userId) => {
    try {
      const chat = await api.createChat(userId);
      setChatId(chat.chat_id);
      changePage('chat');
    } catch {}
  }, [changePage]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black" data-testid="app-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin" />
          <span className="text-white/30 font-ui text-sm tracking-widest uppercase">Loading</span>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onPreview={setPreviewFile} />;
      case 'upload':
        return <UploadPage onDone={() => changePage('dashboard')} />;
      case 'chat':
        return <ChatPage initialChatId={chatId} />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage onPreview={setPreviewFile} onStartChat={handleStartChat} onViewProfile={handleViewProfile} />;
      case 'viewProfile':
        return <ProfilePage userId={viewProfileId} onPreview={setPreviewFile} onStartChat={handleStartChat} onViewProfile={handleViewProfile} />;
      case 'search':
        return <SearchResults query={searchQuery} searchType={searchType} onPreview={setPreviewFile} onViewProfile={handleViewProfile} onStartChat={handleStartChat} />;
      default:
        return <Dashboard onPreview={setPreviewFile} />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-black" data-testid="app-main">
      {wallpaperUrl && (
        <div className="wallpaper-bg" style={{ backgroundImage: `url(${wallpaperUrl})` }} />
      )}
      <div className="relative z-10 flex w-full h-full">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/70 z-40 md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar - desktop always visible, mobile overlay */}
        <div className={`
          fixed md:relative z-50 md:z-auto
          transition-transform duration-300 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar
            activePage={activePage}
            setActivePage={changePage}
            onSearch={handleSearch}
            onMobileToggle={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between p-3 border-b border-white/10 bg-[#050505]"
            data-testid="mobile-topbar">
            <button onClick={() => setMobileMenuOpen(true)} className="text-white/60 p-1" data-testid="mobile-menu-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="font-heading text-sm font-bold tracking-tight uppercase" style={{ color: 'var(--accent-color)' }}>
              CyberVoid
            </span>
            <div className="w-6" />
          </div>

          <PageTransition pageKey={activePage}>
            {renderPage()}
          </PageTransition>
        </div>
      </div>
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
