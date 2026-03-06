import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  Image, Film, FileText, File, Download, Eye, MessageCircle, User, Search
} from 'lucide-react';

const typeIcons = { image: Image, video: Film, document: FileText, other: File };

function formatSize(bytes) {
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function SearchResults({ query, searchType, onPreview, onViewProfile, onStartChat }) {
  const { user } = useAuth();
  const [results, setResults] = useState({ files: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchType === 'accounts' ? 'users' : searchType === 'files' ? 'files' : 'all');

  useEffect(() => {
    async function doSearch() {
      setLoading(true);
      try {
        const data = await api.search(query, searchType);
        setResults(data);
      } catch {}
      setLoading(false);
    }
    if (query) doSearch();
  }, [query, searchType]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-white/30 font-ui" data-testid="search-loading">Searching...</div>;
  }

  const totalResults = results.files.length + results.users.length;

  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid="search-results-page">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="font-heading text-3xl font-black tracking-tighter uppercase mb-2">Search</h1>
        <p className="text-white/40 font-ui text-sm">
          {totalResults} results for "<span style={{ color: 'var(--accent-color)' }}>{query}</span>"
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        {[
          { id: 'all', label: `All (${totalResults})` },
          { id: 'files', label: `Files (${results.files.length})` },
          { id: 'users', label: `Accounts (${results.users.length})` },
        ].map(tab => (
          <button key={tab.id}
            data-testid={`search-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs uppercase tracking-widest font-ui transition-all ${
              activeTab === tab.id ? 'text-black font-bold' : 'text-white/40 hover:text-white border border-white/10'
            }`}
            style={activeTab === tab.id ? { background: 'var(--accent-color)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users */}
      {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {activeTab === 'all' && (
            <h3 className="font-heading text-sm font-bold tracking-widest uppercase text-white/50 mb-3">Accounts</h3>
          )}
          <div className="space-y-2">
            {results.users.map(u => (
              <div key={u.user_id}
                data-testid={`search-user-${u.user_id}`}
                className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-colors"
              >
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-sm bg-white/10" />
                <div className="flex-1">
                  <p className="font-ui text-sm font-bold">{u.display_name}</p>
                  <p className="text-[11px] font-body" style={{ color: 'var(--accent-color)' }}>@{u.username}</p>
                </div>
                <button
                  data-testid={`view-profile-${u.user_id}`}
                  onClick={() => onViewProfile && onViewProfile(u.user_id)}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-white transition-colors"
                >
                  Profile
                </button>
                {u.user_id !== user?.user_id && (
                  <button
                    data-testid={`chat-with-${u.user_id}`}
                    onClick={() => onStartChat && onStartChat(u.user_id)}
                    className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold font-ui transition-all"
                    style={{ background: 'var(--accent-color)', color: '#000' }}
                  >
                    Chat
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {(activeTab === 'all' || activeTab === 'files') && results.files.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {activeTab === 'all' && (
            <h3 className="font-heading text-sm font-bold tracking-widest uppercase text-white/50 mb-3">Files</h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.files.map(file => {
              const Icon = typeIcons[file.file_type] || File;
              return (
                <div key={file.file_id}
                  data-testid={`search-file-${file.file_id}`}
                  className="group bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all"
                >
                  <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                    {file.file_type === 'image' ? (
                      <img src={api.getPreviewUrl(file.file_id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Icon size={40} className="text-white/20" />
                    )}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      {(file.file_type === 'image' || file.file_type === 'video') && (
                        <button onClick={() => onPreview && onPreview(file)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
                          <Eye size={18} />
                        </button>
                      )}
                      <a href={api.getDownloadUrl(file.file_id)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
                        <Download size={18} />
                      </a>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-body truncate">{file.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/30 font-ui">{formatSize(file.file_size)}</span>
                      <span className="text-[10px] font-ui cursor-pointer hover:underline"
                        style={{ color: 'var(--accent-color)' }}
                        onClick={() => onViewProfile && onViewProfile(file.user_id)}>
                        @{file.username}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalResults === 0 && (
        <div className="text-center text-white/30 py-20 font-ui" data-testid="search-no-results">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try different keywords</p>
        </div>
      )}
    </div>
  );
}
