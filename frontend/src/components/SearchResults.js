import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Image, Film, FileText, File, Download, Eye, Search } from 'lucide-react';

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
      try { setResults(await api.search(query, searchType)); } catch {}
      setLoading(false);
    }
    if (query) doSearch();
  }, [query, searchType]);

  if (loading) return <div className="flex-1 flex items-center justify-center" data-testid="search-loading"><div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin" /></div>;

  const total = results.files.length + results.users.length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="search-results-page">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Search</h1>
        <p className="text-white/40 font-ui text-sm">
          {total} results for "<span style={{ color: 'var(--accent-color)' }}>{query}</span>"
        </p>
      </div>

      <div className="flex gap-1 mb-5 animate-fade-in-up overflow-x-auto" style={{ animationDelay: '0.05s' }}>
        {[
          { id: 'all', label: `All (${total})` },
          { id: 'files', label: `Files (${results.files.length})` },
          { id: 'users', label: `Accounts (${results.users.length})` },
        ].map(tab => (
          <button key={tab.id} data-testid={`search-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest font-ui transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-black font-bold' : 'text-white/40 hover:text-white border border-white/10'
            }`}
            style={activeTab === tab.id ? { background: 'var(--accent-color)' } : {}}
          >{tab.label}</button>
        ))}
      </div>

      {/* Users */}
      {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {activeTab === 'all' && <h3 className="font-heading text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Accounts</h3>}
          <div className="space-y-1.5">
            {results.users.map(u => (
              <div key={u.user_id} data-testid={`search-user-${u.user_id}`}
                className="flex items-center gap-3 p-3 md:p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-colors">
                <img src={u.avatar_url} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-sm bg-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm font-bold truncate">{u.display_name}</p>
                  <p className="text-[10px] font-body truncate" style={{ color: 'var(--accent-color)' }}>@{u.username}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button data-testid={`view-profile-${u.user_id}`} onClick={() => onViewProfile && onViewProfile(u.user_id)}
                    className="px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-white transition-colors">
                    Profile
                  </button>
                  {u.user_id !== user?.user_id && (
                    <button data-testid={`chat-with-${u.user_id}`} onClick={() => onStartChat && onStartChat(u.user_id)}
                      className="px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] uppercase tracking-widest font-bold font-ui transition-all"
                      style={{ background: 'var(--accent-color)', color: '#000' }}>
                      Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {(activeTab === 'all' || activeTab === 'files') && results.files.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {activeTab === 'all' && <h3 className="font-heading text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Files</h3>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {results.files.map(file => {
              const Icon = typeIcons[file.file_type] || File;
              return (
                <div key={file.file_id} data-testid={`search-file-${file.file_id}`}
                  className="group bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all">
                  <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                    {file.file_type === 'image' ? (
                      <img src={api.getPreviewUrl(file.file_id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : <Icon size={30} className="text-white/15" />}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {(file.file_type === 'image' || file.file_type === 'video') && (
                        <button onClick={() => onPreview && onPreview(file)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors"><Eye size={16} /></button>
                      )}
                      <a href={api.getDownloadUrl(file.file_id)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors"><Download size={16} /></a>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-body truncate">{file.filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-white/30 font-ui">{formatSize(file.file_size)}</span>
                      <span className="text-[10px] font-ui cursor-pointer hover:underline truncate"
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

      {total === 0 && (
        <div className="text-center text-white/25 py-16 font-ui" data-testid="search-no-results">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p>No results found</p>
          <p className="text-xs mt-1 text-white/15">Try different keywords</p>
        </div>
      )}
    </div>
  );
}
