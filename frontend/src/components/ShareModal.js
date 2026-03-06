import React, { useState } from 'react';
import { api } from '../api';
import { Link2, Copy, Check, Clock, X } from 'lucide-react';

export default function ShareModal({ file, onClose }) {
  const [hours, setHours] = useState(24);
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      const share = await api.createShareLink(file.file_id, hours);
      setLink(share);
    } catch {}
    setLoading(false);
  };

  const copyLink = () => {
    const url = `${api.getBaseUrl()}/api/share/${link.link_id}/download`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeOptions = [
    { label: '1 hour', value: 1 },
    { label: '6 hours', value: 6 },
    { label: '24 hours', value: 24 },
    { label: '7 days', value: 168 },
    { label: '30 days', value: 720 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      data-testid="share-modal" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-[#0A0A0A] border border-white/10 p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base font-bold tracking-tight uppercase flex items-center gap-2">
            <Link2 size={16} style={{ color: 'var(--accent-color)' }} /> Share Link
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" data-testid="share-close">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-body text-white/50 mb-4 truncate">{file.filename}</p>

        {!link ? (
          <>
            <div className="mb-4">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2 block flex items-center gap-1">
                <Clock size={11} /> Expires in
              </label>
              <div className="flex gap-1 flex-wrap">
                {timeOptions.map(opt => (
                  <button key={opt.value} data-testid={`share-time-${opt.value}`}
                    onClick={() => setHours(opt.value)}
                    className={`px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-ui transition-all ${
                      hours === opt.value ? 'text-black font-bold' : 'text-white/40 border border-white/10 hover:text-white'
                    }`}
                    style={hours === opt.value ? { background: 'var(--accent-color)' } : {}}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <button data-testid="share-create-btn" onClick={create} disabled={loading}
              className="w-full py-3 uppercase tracking-widest font-bold text-xs font-ui transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--accent-color)', color: '#000' }}>
              {loading ? 'Creating...' : 'Generate Link'}
            </button>
          </>
        ) : (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3 p-3 bg-white/5 border border-white/10">
              <code className="flex-1 text-[10px] font-body text-white/70 truncate" data-testid="share-link-url">
                {api.getBaseUrl()}/api/share/{link.link_id}/download
              </code>
              <button onClick={copyLink} data-testid="share-copy-btn"
                className="shrink-0 p-1.5 hover:bg-white/10 transition-colors">
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/50" />}
              </button>
            </div>
            <p className="text-[10px] font-ui text-white/30 text-center">
              Expires: {new Date(link.expires_at).toLocaleString('es-ES')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
