import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  Image, Film, FileText, File, Download, Eye, MessageCircle, ExternalLink
} from 'lucide-react';

const typeIcons = { image: Image, video: Film, document: FileText, other: File };

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function ProfilePage({ userId, onStartChat, onPreview, onViewProfile }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetId = userId || user?.user_id;
  const isOwnProfile = targetId === user?.user_id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [u, f] = await Promise.all([
          api.getUser(targetId),
          api.getUserFiles(targetId),
        ]);
        setProfile(u);
        setFiles(f);
      } catch {}
      setLoading(false);
    }
    if (targetId) load();
  }, [targetId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-white/30 font-ui" data-testid="profile-loading">Loading...</div>;
  }

  if (!profile) {
    return <div className="flex-1 flex items-center justify-center text-white/30 font-ui" data-testid="profile-not-found">User not found</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid="profile-page">
      {/* Profile Card (Holo Card) */}
      <div className="max-w-2xl mb-8 animate-fade-in-up">
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-6"
          style={{ boxShadow: '0 0 30px rgba(var(--accent-rgb), 0.1)' }}>
          <div className="flex items-start gap-6">
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-sm bg-white/10 shrink-0"
              data-testid="profile-avatar" />
            <div className="flex-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="profile-display-name">
                {profile.display_name}
              </h1>
              <p className="text-sm font-body mt-1" style={{ color: 'var(--accent-color)' }}
                data-testid="profile-username">
                @{profile.username}
              </p>
              {profile.bio && (
                <p className="text-sm font-body text-white/60 mt-3" data-testid="profile-bio">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <span className="text-xs font-ui text-white/40 uppercase tracking-widest">
                  {files.length} public files
                </span>
                {!isOwnProfile && (
                  <button
                    data-testid="profile-message-btn"
                    onClick={() => onStartChat && onStartChat(profile.user_id)}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs uppercase tracking-widest font-bold font-ui transition-all active:scale-95"
                    style={{ background: 'var(--accent-color)', color: '#000' }}
                  >
                    <MessageCircle size={14} /> Message
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent-color)' }} />
        </div>
      </div>

      {/* Files */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-heading text-lg font-bold tracking-tight uppercase mb-4">
          {isOwnProfile ? 'Your Public Files' : 'Public Files'}
        </h2>
        {files.length === 0 ? (
          <div className="text-center text-white/30 py-12 font-ui" data-testid="profile-no-files">
            No public files
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map(file => {
              const Icon = typeIcons[file.file_type] || File;
              return (
                <div key={file.file_id}
                  data-testid={`profile-file-${file.file_id}`}
                  className="group bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all">
                  <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                    {file.file_type === 'image' ? (
                      <img src={api.getPreviewUrl(file.file_id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : file.file_type === 'video' ? (
                      <video src={api.getPreviewUrl(file.file_id)} className="w-full h-full object-cover" muted />
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
                    <p className="text-[10px] text-white/30 font-ui mt-1">{formatSize(file.file_size)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
