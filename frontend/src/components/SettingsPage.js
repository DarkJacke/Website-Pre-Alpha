import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import { Check, Palette, ImageIcon, User, Save, Lock, Eye, EyeOff, Copy, Shield, Camera } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { accentColor, wallpaperUrl, changeAccent, changeWallpaper, ACCENT_PRESETS, WALLPAPERS } = useTheme();
  const [profile, setProfile] = useState({ display_name: user?.display_name || '', bio: user?.bio || '' });
  const [customWallpaper, setCustomWallpaper] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Change password
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile(profile);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const changePass = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (pwForm.new_password.length < 8) { setPwError('Min 8 characters'); return; }
    if (!/[A-Z]/.test(pwForm.new_password) || !/[a-z]/.test(pwForm.new_password) || !/\d/.test(pwForm.new_password)) {
      setPwError('Needs uppercase, lowercase, and number'); return;
    }
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords don\'t match'); return; }
    setPwLoading(true);
    try {
      await api.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess(true);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.message);
    }
    setPwLoading(false);
  };

  const copyId = () => {
    navigator.clipboard.writeText(user?.user_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const updated = await api.uploadAvatar(fd);
      updateUser(updated);
    } catch {}
    setAvatarUploading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="settings-page">
      <div className="max-w-2xl">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Settings</h1>
          <p className="text-white/40 font-ui text-sm">Customize your experience</p>
        </div>

        {/* Profile */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={16} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Profile</h2>
          </div>
          <div className="space-y-4 bg-[#0A0A0A] border border-white/5 p-4 md:p-6">
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-2">
              <div className="relative group">
                <img src={user?.avatar_url} alt="" className="w-16 h-16 rounded-sm bg-white/10" data-testid="settings-avatar" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  data-testid="avatar-upload-label">
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white/80" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}
                    data-testid="avatar-upload-input" />
                </label>
              </div>
              <div>
                <p className="font-ui text-sm font-bold">{user?.display_name}</p>
                <p className="text-[10px] font-body" style={{ color: 'var(--accent-color)' }}>@{user?.username}</p>
                <p className="text-[10px] text-white/30 font-body mt-0.5">Click image to change avatar (max 5MB)</p>
              </div>
            </div>

            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Display Name</label>
              <input
                data-testid="settings-display-name"
                value={profile.display_name}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                maxLength={50}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
              />
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Bio</label>
              <textarea
                data-testid="settings-bio"
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                rows={2}
                maxLength={500}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body resize-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40">Your ID:</label>
              <code className="font-body text-[11px] px-2 py-1 bg-white/5 border border-white/10 truncate max-w-[200px]"
                data-testid="user-id-display">{user?.user_id}</code>
              <button onClick={copyId} className="text-white/30 hover:text-white transition-colors" data-testid="copy-id-btn">
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              data-testid="save-profile-btn"
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 uppercase tracking-widest font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 font-ui"
              style={{ background: 'var(--accent-color)', color: '#000' }}
            >
              {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saving ? '...' : 'Save'}</>}
            </button>
          </div>
        </section>

        {/* Security */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Security</h2>
          </div>
          <form onSubmit={changePass} className="bg-[#0A0A0A] border border-white/5 p-4 md:p-6 space-y-4">
            <div className="relative">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Current Password</label>
              <input
                data-testid="current-password-input"
                type={showCurrent ? 'text' : 'password'}
                value={pwForm.current_password}
                onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body pr-8"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-0 bottom-2.5 text-white/20 hover:text-white/50 transition-colors">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">New Password</label>
              <input
                data-testid="new-password-input"
                type={showNew ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body pr-8"
                required minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-0 bottom-2.5 text-white/20 hover:text-white/50 transition-colors">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Confirm New Password</label>
              <input
                data-testid="confirm-new-password"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
                required
              />
            </div>
            {pwError && <p className="text-red-400 text-xs font-body">{pwError}</p>}
            {pwSuccess && <p className="text-green-400 text-xs font-body flex items-center gap-1"><Check size={12} /> Password changed</p>}
            <button
              data-testid="change-password-btn"
              type="submit"
              disabled={pwLoading}
              className="flex items-center gap-2 px-5 py-2.5 uppercase tracking-widest font-bold text-xs border border-white/20 text-white hover:border-white transition-all font-ui disabled:opacity-50"
            >
              <Lock size={14} /> {pwLoading ? '...' : 'Change Password'}
            </button>
          </form>
        </section>

        {/* Accent Color */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Accent Color</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4 md:p-6">
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {ACCENT_PRESETS.map(preset => (
                <button key={preset.color}
                  data-testid={`accent-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => changeAccent(preset.color)}
                  className="flex flex-col items-center gap-1.5 p-2 md:p-3 border transition-all hover:border-white/30"
                  style={{
                    borderColor: accentColor === preset.color ? preset.color : 'rgba(255,255,255,0.05)',
                    boxShadow: accentColor === preset.color ? `0 0 12px ${preset.color}30` : 'none'
                  }}
                >
                  <div className="w-6 h-6 md:w-8 md:h-8 relative" style={{ background: preset.color }}>
                    {accentColor === preset.color && (
                      <Check size={14} className="absolute inset-0 m-auto text-black" />
                    )}
                  </div>
                  <span className="text-[9px] md:text-[10px] font-ui text-white/40 uppercase tracking-wider">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Wallpaper */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={16} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Wallpaper</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4 md:p-6">
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
              {WALLPAPERS.map(wp => (
                <button key={wp.name}
                  data-testid={`wallpaper-${wp.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => changeWallpaper(wp.url)}
                  className="relative overflow-hidden h-20 md:h-24 border transition-all hover:border-white/30"
                  style={{ borderColor: wallpaperUrl === wp.url ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)' }}
                >
                  {wp.url ? (
                    <img src={wp.url} alt={wp.name} className="w-full h-full object-cover opacity-50" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <span className="text-white/30 text-xs font-ui">NONE</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 left-2 text-[10px] font-ui text-white/70">{wp.name}</span>
                  {wallpaperUrl === wp.url && (
                    <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center"
                      style={{ background: 'var(--accent-color)' }}>
                      <Check size={12} className="text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                data-testid="custom-wallpaper-input"
                value={customWallpaper}
                onChange={e => setCustomWallpaper(e.target.value)}
                placeholder="Custom wallpaper URL..."
                className="flex-1 bg-transparent border-b border-white/20 px-0 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 transition-colors font-body"
              />
              <button
                data-testid="apply-custom-wallpaper"
                onClick={() => { if (customWallpaper.trim()) changeWallpaper(customWallpaper.trim()); }}
                className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-white transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
