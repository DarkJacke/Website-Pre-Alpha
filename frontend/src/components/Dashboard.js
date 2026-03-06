import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  Image, Film, FileText, File, Download, Trash2, Eye, Grid, List, Clock, HardDrive
} from 'lucide-react';

const typeIcons = { image: Image, video: Film, document: FileText, other: File };

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ onPreview }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');

  const loadFiles = useCallback(async () => {
    try {
      const data = await api.getMyFiles();
      setFiles(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDelete = async (fileId) => {
    try {
      await api.deleteFile(fileId);
      setFiles(f => f.filter(x => x.file_id !== fileId));
    } catch {}
  };

  const filtered = filter === 'all' ? files : files.filter(f => f.file_type === filter);
  const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="dashboard-page">
      <div className="mb-6 md:mb-8 animate-fade-in-up">
        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">
          Dashboard
        </h1>
        <p className="text-white/40 font-ui text-sm">
          Welcome, <span style={{ color: 'var(--accent-color)' }}>{user?.display_name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        {[
          { icon: File, label: 'Files', value: files.length, tid: 'stat-files' },
          { icon: HardDrive, label: 'Storage', value: formatSize(totalSize), tid: 'stat-storage' },
          { icon: Clock, label: 'Recent', value: files.length > 0 ? '1d' : '--', tid: 'stat-recent' },
        ].map(s => (
          <div key={s.tid} className="bg-[#0A0A0A] border border-white/5 p-3 md:p-4 hover:border-white/20 transition-colors" data-testid={s.tid}>
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon size={16} className="text-white/40" />
              <span className="font-ui text-[10px] uppercase tracking-widest text-white/40 hidden sm:inline">{s.label}</span>
            </div>
            <p className="font-heading text-lg md:text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-in-up overflow-x-auto gap-2" style={{ animationDelay: '0.1s' }}>
        <div className="flex gap-1 shrink-0">
          {['all', 'image', 'video', 'document', 'other'].map(t => (
            <button key={t}
              data-testid={`filter-${t}`}
              onClick={() => setFilter(t)}
              className={`px-2 md:px-3 py-1.5 text-[10px] md:text-[11px] uppercase tracking-widest font-ui transition-all whitespace-nowrap ${
                filter === t ? 'text-black font-bold' : 'text-white/40 hover:text-white border border-white/10'
              }`}
              style={filter === t ? { background: 'var(--accent-color)' } : {}}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0">
          <button data-testid="view-grid" onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-white/30'}`}>
            <Grid size={16} />
          </button>
          <button data-testid="view-list" onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'text-white' : 'text-white/30'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-white/30 py-16 md:py-20 font-ui" data-testid="empty-state">
          <File size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-base">No files yet</p>
          <p className="text-xs mt-2 text-white/20">Upload files to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {filtered.map((file, i) => {
            const Icon = typeIcons[file.file_type] || File;
            return (
              <div key={file.file_id}
                data-testid={`file-card-${file.file_id}`}
                className="group bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all duration-300"
              >
                <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                  {file.file_type === 'image' ? (
                    <img src={api.getPreviewUrl(file.file_id)} alt={file.filename}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : file.file_type === 'video' ? (
                    <video src={api.getPreviewUrl(file.file_id)} className="w-full h-full object-cover" muted preload="metadata" />
                  ) : (
                    <Icon size={32} className="text-white/15" />
                  )}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {(file.file_type === 'image' || file.file_type === 'video') && (
                      <button data-testid={`preview-${file.file_id}`} onClick={() => onPreview(file)}
                        className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
                        <Eye size={16} />
                      </button>
                    )}
                    <a href={api.getDownloadUrl(file.file_id)} data-testid={`download-${file.file_id}`}
                      className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
                      <Download size={16} />
                    </a>
                    <button data-testid={`delete-${file.file_id}`} onClick={() => handleDelete(file.file_id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-2 md:p-3">
                  <p className="text-xs md:text-sm font-body truncate">{file.filename}</p>
                  <p className="text-[10px] text-white/30 font-ui mt-0.5">{formatSize(file.file_size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {filtered.map(file => {
            const Icon = typeIcons[file.file_type] || File;
            return (
              <div key={file.file_id}
                data-testid={`file-row-${file.file_id}`}
                className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-colors group"
              >
                <Icon size={16} className="text-white/30 shrink-0" />
                <span className="flex-1 text-xs md:text-sm font-body truncate min-w-0">{file.filename}</span>
                <span className="text-[10px] text-white/30 font-ui hidden sm:inline shrink-0">{formatSize(file.file_size)}</span>
                <span className="text-[10px] text-white/30 font-ui hidden md:inline shrink-0">{formatDate(file.created_at)}</span>
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  {(file.file_type === 'image' || file.file_type === 'video') && (
                    <button onClick={() => onPreview(file)} className="p-1.5 hover:bg-white/10 transition-colors">
                      <Eye size={14} />
                    </button>
                  )}
                  <a href={api.getDownloadUrl(file.file_id)} className="p-1.5 hover:bg-white/10 transition-colors">
                    <Download size={14} />
                  </a>
                  <button onClick={() => handleDelete(file.file_id)} className="p-1.5 hover:bg-red-500/10 text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
