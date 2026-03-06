import React, { useState, useCallback } from 'react';
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

function AppContent() {
  const { user, loading } = useAuth();
  const { wallpaperUrl } = useTheme();
  const [activePage, setActivePage] = useState('dashboard');
  const [previewFile, setPreviewFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [viewProfileId, setViewProfileId] = useState(null);
  const [chatId, setChatId] = useState(null);

  const handleSearch = useCallback((q, type) => {
    setSearchQuery(q);
    setSearchType(type);
    setActivePage('search');
  }, []);

  const handleViewProfile = useCallback((userId) => {
    setViewProfileId(userId);
    setActivePage('viewProfile');
  }, []);

  const handleStartChat = useCallback(async (userId) => {
    try {
      const chat = await api.createChat(userId);
      setChatId(chat.chat_id);
      setActivePage('chat');
    } catch {}
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black" data-testid="app-loading">
        <div className="text-white/30 font-ui animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onPreview={setPreviewFile} />;
      case 'upload':
        return <UploadPage onDone={() => setActivePage('dashboard')} />;
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
        <Sidebar activePage={activePage} setActivePage={setActivePage} onSearch={handleSearch} />
        {renderPage()}
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
