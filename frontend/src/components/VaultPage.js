import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { Lock, Unlock, Upload, Trash2, Eye, Download, ShieldCheck, X, FileUp, Image, Film, File } from 'lucide-react';

const typeIcons = { image: Image, video: Film, other: File };
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function VaultPage({ onPreview }) {
  const [status, setStatus] = useState(null);
  const [vaultToken, setVaultToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.vaultStatus();
      setStatus(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const setupVault = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Min 6 characters'); return; }
    if (password !== confirmPw) { setError('Passwords don\'t match'); return; }
    try {
      await api.vaultSetup(password);
      setStatus({ has_vault: true, vault_files_count: 0 });
      setPassword('');
      setConfirmPw('');
    } catch (err) { setError(err.message); }
  };

  const unlockVault = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.vaultUnlock(password);
      setVaultToken(res.vault_token);
      setPassword('');
      const files = await api.vaultFiles(res.vault_token);
      setFiles(files);
    } catch (err) { setError(err.message); }
  };

  const handleUpload = async (fileList) => {
    if (!vaultToken) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('vault_token', vaultToken);
      try {
        await api.vaultUpload(fd);
      } catch {}
    }
    const updated = await api.vaultFiles(vaultToken);
    setFiles(updated);
    setUploading(false);
  };

  const handleDelete = async (fileId) => {
    try {
      await api.vaultDeleteFile(fileId, vaultToken);
      setFiles(f => f.filter(x => x.file_id !== fileId));
    } catch {}
  };

  const lockVault = () => {
    setVaultToken(null);
    setFiles([]);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center" data-testid="vault-loading">
      <div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin" />
    </div>;
  }

  // Setup vault
  if (status && !status.has_vault) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="vault-setup-page">
        <div className="max-w-md mx-auto mt-16 animate-fade-in-up">
          <div className="text-center mb-8">
            <ShieldCheck size={48} className="mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
            <h1 className="font-heading text-2xl font-black tracking-tighter uppercase mb-2">Secure Vault</h1>
            <p className="text-white/40 font-ui text-sm">Create a password-protected folder for sensitive files</p>
          </div>
          <form onSubmit={setupVault} className="space-y-4 bg-[#0A0A0A] border border-white/5 p-6">
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Vault Password</label>
              <input data-testid="vault-setup-password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
                placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Confirm Password</label>
              <input data-testid="vault-setup-confirm" type="password" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
                placeholder="Repeat password" required />
            </div>
            {error && <p className="text-red-400 text-xs font-body">{error}</p>}
            <button data-testid="vault-setup-submit" type="submit"
              className="w-full py-3 uppercase tracking-widest font-bold text-xs font-ui transition-all active:scale-95"
              style={{ background: 'var(--accent-color)', color: '#000' }}>
              Create Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Unlock vault
  if (!vaultToken) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="vault-unlock-page">
        <div className="max-w-md mx-auto mt-16 animate-fade-in-up">
          <div className="text-center mb-8">
            <Lock size={48} className="mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
            <h1 className="font-heading text-2xl font-black tracking-tighter uppercase mb-2">Vault Locked</h1>
            <p className="text-white/40 font-ui text-sm">{status?.vault_files_count || 0} files secured</p>
          </div>
          <form onSubmit={unlockVault} className="space-y-4 bg-[#0A0A0A] border border-white/5 p-6">
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Vault Password</label>
              <input data-testid="vault-unlock-password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
                placeholder="Enter vault password" required />
            </div>
            {error && <p className="text-red-400 text-xs font-body">{error}</p>}
            <button data-testid="vault-unlock-submit" type="submit"
              className="w-full py-3 uppercase tracking-widest font-bold text-xs font-ui transition-all active:scale-95"
              style={{ background: 'var(--accent-color)', color: '#000' }}>
              <Unlock size={14} className="inline mr-2" /> Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Vault opened
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="vault-files-page">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1 flex items-center gap-2">
            <ShieldCheck size={24} style={{ color: 'var(--accent-color)' }} /> Secure Vault
          </h1>
          <p className="text-white/40 font-ui text-xs">Session expires in 30 min</p>
        </div>
        <button data-testid="vault-lock-btn" onClick={lockVault}
          className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-red-400 hover:text-red-400 transition-colors">
          <Lock size={14} /> Lock
        </button>
      </div>

      {/* Upload zone */}
      <div
        data-testid="vault-upload-zone"
        className="border-2 border-dashed border-white/10 hover:border-white/20 p-6 text-center cursor-pointer mb-6 transition-colors animate-fade-in-up"
        style={{ animationDelay: '0.05s' }}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp size={32} className="mx-auto mb-2 text-white/15" />
        <p className="font-ui text-white/40 text-sm">{uploading ? 'Uploading...' : 'Upload to vault'}</p>
        <input ref={inputRef} type="file" multiple className="hidden" data-testid="vault-file-input"
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Files */}
      {files.length === 0 ? (
        <div className="text-center text-white/25 py-12 font-ui text-sm" data-testid="vault-empty">
          <Lock size={32} className="mx-auto mb-3 opacity-20" />
          <p>Vault is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {files.map(file => {
            const Icon = typeIcons[file.file_type] || File;
            return (
              <div key={file.file_id} data-testid={`vault-file-${file.file_id}`}
                className="group bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all">
                <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                  {file.file_type === 'image' ? (
                    <img src={api.getPreviewUrl(file.file_id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : file.file_type === 'video' ? (
                    <video src={api.getPreviewUrl(file.file_id)} className="w-full h-full object-cover" muted preload="metadata" />
                  ) : <Icon size={30} className="text-white/15" />}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {(file.file_type === 'image' || file.file_type === 'video') && (
                      <button onClick={() => onPreview && onPreview(file)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors"><Eye size={16} /></button>
                    )}
                    <a href={api.getDownloadUrl(file.file_id)} className="p-2 bg-white/10 hover:bg-white/20 transition-colors"><Download size={16} /></a>
                    <button onClick={() => handleDelete(file.file_id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-body truncate">{file.filename}</p>
                  <p className="text-[10px] text-white/30 font-ui mt-0.5">{formatSize(file.file_size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
