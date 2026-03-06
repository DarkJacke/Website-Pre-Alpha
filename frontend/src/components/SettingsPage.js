import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import { Check, Palette, ImageIcon, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { accentColor, wallpaperUrl, changeAccent, changeWallpaper, ACCENT_PRESETS, WALLPAPERS } = useTheme();
  const [profile, setProfile] = useState({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
  });
  const [customWallpaper, setCustomWallpaper] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid="settings-page">
      <div className="max-w-2xl">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="font-heading text-3xl font-black tracking-tighter uppercase mb-2">Settings</h1>
          <p className="text-white/40 font-ui text-sm">Customize your experience</p>
        </div>

        {/* Profile Section */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2 mb-4">
            <User size={18} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-lg font-bold tracking-tight uppercase">Profile</h2>
          </div>
          <div className="space-y-4 bg-[#0A0A0A] border border-white/5 p-6">
            <div>
              <label className="font-ui text-xs tracking-widest uppercase text-white/50 mb-1 block">Display Name</label>
              <input
                data-testid="settings-display-name"
                value={profile.display_name}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body"
              />
            </div>
            <div>
              <label className="font-ui text-xs tracking-widest uppercase text-white/50 mb-1 block">Bio</label>
              <textarea
                data-testid="settings-bio"
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[var(--accent-color)] transition-colors font-body resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-ui text-xs tracking-widest uppercase text-white/50">Your ID:</label>
              <code className="font-body text-xs px-2 py-1 bg-white/5 border border-white/10"
                data-testid="user-id-display">
                {user?.user_id}
              </code>
            </div>
            <button
              data-testid="save-profile-btn"
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 uppercase tracking-widest font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 font-ui"
              style={{ background: 'var(--accent-color)', color: '#000' }}
            >
              {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {saving ? 'Saving...' : 'Save'}</>}
            </button>
          </div>
        </section>

        {/* Theme Section */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-lg font-bold tracking-tight uppercase">Accent Color</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-6">
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_PRESETS.map(preset => (
                <button key={preset.color}
                  data-testid={`accent-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => changeAccent(preset.color)}
                  className="flex flex-col items-center gap-2 p-3 border transition-all hover:border-white/30"
                  style={{
                    borderColor: accentColor === preset.color ? preset.color : 'rgba(255,255,255,0.05)',
                    boxShadow: accentColor === preset.color ? `0 0 15px ${preset.color}40` : 'none'
                  }}
                >
                  <div className="w-8 h-8 relative" style={{ background: preset.color }}>
                    {accentColor === preset.color && (
                      <Check size={16} className="absolute inset-0 m-auto text-black" />
                    )}
                  </div>
                  <span className="text-[10px] font-ui text-white/50 uppercase tracking-wider">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Wallpaper Section */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={18} style={{ color: 'var(--accent-color)' }} />
            <h2 className="font-heading text-lg font-bold tracking-tight uppercase">Wallpaper</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {WALLPAPERS.map(wp => (
                <button key={wp.name}
                  data-testid={`wallpaper-${wp.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => changeWallpaper(wp.url)}
                  className="relative overflow-hidden h-24 border transition-all hover:border-white/30"
                  style={{
                    borderColor: wallpaperUrl === wp.url ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {wp.url ? (
                    <img src={wp.url} alt={wp.name} className="w-full h-full object-cover opacity-50" />
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
            {/* Custom wallpaper URL */}
            <div className="flex gap-2">
              <input
                data-testid="custom-wallpaper-input"
                value={customWallpaper}
                onChange={e => setCustomWallpaper(e.target.value)}
                placeholder="Custom wallpaper URL..."
                className="flex-1 bg-transparent border-b border-white/20 px-0 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 transition-colors font-body"
              />
              <button
                data-testid="apply-custom-wallpaper"
                onClick={() => { if (customWallpaper.trim()) changeWallpaper(customWallpaper.trim()); }}
                className="px-4 py-2 text-xs uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-white transition-colors"
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
