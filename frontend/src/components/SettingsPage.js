import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import { Check, Palette, ImageIcon, User, Save, Lock, Eye, EyeOff, Copy, Shield, Camera, Bell, HardDrive } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { accentColor, wallpaperUrl, changeAccent, changeWallpaper, ACCENT_PRESETS, WALLPAPERS } = useTheme();
  const [profile, setProfile] = useState({ display_name: user?.display_name || '', bio: user?.bio || '' });
  const [customWallpaper, setCustomWallpaper] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const [notifs, setNotifs] = useState({ push_enabled: true, chat_notifications: true, file_notifications: true });
  const [storage, setStorage] = useState({ used: 0, quota: 1073741824, count: 0, percent: 0 });

  useEffect(() => {
    api.getNotificationSettings().then(setNotifs).catch(() => {});
    api.getStorage().then(setStorage).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try { const u = await api.updateProfile(profile); updateUser(u); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {}
    setSaving(false);
  };

  const changePass = async (e) => {
    e.preventDefault(); setPwError(''); setPwSuccess(false);
    if (pwForm.new_password.length < 8) { setPwError('Min 8 chars'); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Don't match"); return; }
    setPwLoading(true);
    try { await api.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password }); setPwSuccess(true); setPwForm({ current_password: '', new_password: '', confirm: '' }); } catch (err) { setPwError(err.message); }
    setPwLoading(false);
  };

  const copyId = () => { navigator.clipboard.writeText(user?.user_id || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarUploading(true);
    try { const fd = new FormData(); fd.append('file', file); const u = await api.uploadAvatar(fd); updateUser(u); } catch {}
    setAvatarUploading(false);
  };

  const toggleNotif = async (key) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    try { await api.updateNotificationSettings({ [key]: updated[key] }); } catch {}
    if (updated.push_enabled && key === 'push_enabled' && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  const formatBytes = (b) => b < 1048576 ? (b/1024).toFixed(1)+' KB' : b < 1073741824 ? (b/1048576).toFixed(1)+' MB' : (b/1073741824).toFixed(2)+' GB';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="settings-page">
      <div className="max-w-2xl">
        <div className="mb-6 animate-fade-in-up">
          <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Settings</h1>
        </div>

        {/* Storage */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.02s'}}>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} style={{color:'var(--accent-color)'}}/> 
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Storage</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4">
            <div className="flex justify-between text-xs font-ui text-white/50 mb-2">
              <span>{formatBytes(storage.used)} used</span>
              <span>{formatBytes(storage.quota)} total</span>
            </div>
            <div className="h-1.5 bg-white/5 mb-2">
              <div className="h-full transition-all" style={{width:`${Math.min(storage.percent,100)}%`, background:'var(--accent-color)'}}/>
            </div>
            <p className="text-[10px] font-body text-white/30">{storage.count} files / {storage.percent}% used</p>
          </div>
        </section>

        {/* Profile */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.05s'}}>
          <div className="flex items-center gap-2 mb-3">
            <User size={16} style={{color:'var(--accent-color)'}}/> 
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Profile</h2>
          </div>
          <div className="space-y-4 bg-[#0A0A0A] border border-white/5 p-4 md:p-5">
            <div className="flex items-center gap-4 mb-2">
              <div className="relative group">
                <img src={user?.avatar_url} alt="" className="w-14 h-14 rounded-sm bg-white/10" data-testid="settings-avatar"/>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {avatarUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Camera size={16} className="text-white/80"/>}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} data-testid="avatar-upload-input"/>
                </label>
              </div>
              <div>
                <p className="font-ui text-sm font-bold">{user?.display_name}</p>
                <p className="text-[10px] font-body" style={{color:'var(--accent-color)'}}>@{user?.username}</p>
                <p className="text-[9px] text-white/25 font-body mt-0.5">Click to change (max 5MB)</p>
              </div>
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Display Name</label>
              <input data-testid="settings-display-name" value={profile.display_name}
                onChange={e=>setProfile({...profile, display_name: e.target.value})} maxLength={50}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body"/>
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Bio</label>
              <textarea data-testid="settings-bio" value={profile.bio}
                onChange={e=>setProfile({...profile, bio: e.target.value})} rows={2} maxLength={500}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body resize-none"/>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40">ID:</label>
              <code className="font-body text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 truncate max-w-[180px]" data-testid="user-id-display">{user?.user_id}</code>
              <button onClick={copyId} className="text-white/30 hover:text-white transition-colors" data-testid="copy-id-btn">
                {copied?<Check size={12} className="text-green-400"/>:<Copy size={12}/>}
              </button>
            </div>
            <button data-testid="save-profile-btn" onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 uppercase tracking-widest font-bold text-xs font-ui active:scale-95 disabled:opacity-50"
              style={{background:'var(--accent-color)',color:'#000'}}>
              {saved?<><Check size={12}/>Saved</>:<><Save size={12}/>{saving?'...':'Save'}</>}
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.08s'}}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} style={{color:'var(--accent-color)'}}/>
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Notifications</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4 space-y-3">
            {[
              { key: 'push_enabled', label: 'Push Notifications', desc: 'Browser notifications' },
              { key: 'chat_notifications', label: 'Chat Messages', desc: 'New message alerts' },
              { key: 'file_notifications', label: 'File Activity', desc: 'Comments and shares' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-sm">{n.label}</p>
                  <p className="text-[10px] text-white/30 font-body">{n.desc}</p>
                </div>
                <button data-testid={`notif-${n.key}`} onClick={() => toggleNotif(n.key)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${notifs[n.key]?'':'bg-white/20'}`}
                  style={notifs[n.key]?{background:'var(--accent-color)'}:{}}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifs[n.key]?'left-5':'left-0.5'}`}/>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{color:'var(--accent-color)'}}/>
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Security</h2>
          </div>
          <form onSubmit={changePass} className="bg-[#0A0A0A] border border-white/5 p-4 md:p-5 space-y-3">
            <div className="relative">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Current Password</label>
              <input data-testid="current-password-input" type={showCurrent?'text':'password'}
                value={pwForm.current_password} onChange={e=>setPwForm({...pwForm, current_password: e.target.value})}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body pr-8" required/>
              <button type="button" onClick={()=>setShowCurrent(!showCurrent)} className="absolute right-0 bottom-2 text-white/20 hover:text-white/50">
                {showCurrent?<EyeOff size={13}/>:<Eye size={13}/>}
              </button>
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">New Password</label>
              <input data-testid="new-password-input" type="password" value={pwForm.new_password}
                onChange={e=>setPwForm({...pwForm, new_password: e.target.value})}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body" required minLength={8}/>
            </div>
            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1 block">Confirm</label>
              <input data-testid="confirm-new-password" type="password" value={pwForm.confirm}
                onChange={e=>setPwForm({...pwForm, confirm: e.target.value})}
                className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body" required/>
            </div>
            {pwError && <p className="text-red-400 text-xs font-body">{pwError}</p>}
            {pwSuccess && <p className="text-green-400 text-xs font-body flex items-center gap-1"><Check size={11}/>Changed</p>}
            <button data-testid="change-password-btn" type="submit" disabled={pwLoading}
              className="flex items-center gap-2 px-5 py-2 uppercase tracking-widest font-bold text-xs border border-white/20 text-white hover:border-white font-ui disabled:opacity-50">
              <Lock size={13}/>{pwLoading?'...':'Change Password'}
            </button>
          </form>
        </section>

        {/* Accent Color */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.12s'}}>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} style={{color:'var(--accent-color)'}}/> 
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Accent Color</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4">
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_PRESETS.map(p=>(
                <button key={p.color} data-testid={`accent-${p.name.toLowerCase().replace(/\s/g,'-')}`}
                  onClick={()=>changeAccent(p.color)}
                  className="flex flex-col items-center gap-1 p-2 border transition-all hover:border-white/30"
                  style={{borderColor:accentColor===p.color?p.color:'rgba(255,255,255,0.05)', boxShadow:accentColor===p.color?`0 0 10px ${p.color}30`:'none'}}>
                  <div className="w-6 h-6 relative" style={{background:p.color}}>
                    {accentColor===p.color && <Check size={12} className="absolute inset-0 m-auto text-black"/>}
                  </div>
                  <span className="text-[9px] font-ui text-white/40 uppercase">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Wallpaper */}
        <section className="mb-6 animate-fade-in-up" style={{animationDelay:'0.15s'}}>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={16} style={{color:'var(--accent-color)'}}/>
            <h2 className="font-heading text-base font-bold tracking-tight uppercase">Wallpaper</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {WALLPAPERS.map(wp=>(
                <button key={wp.name} onClick={()=>changeWallpaper(wp.url)}
                  className="relative overflow-hidden h-16 md:h-20 border transition-all hover:border-white/30"
                  style={{borderColor:wallpaperUrl===wp.url?'var(--accent-color)':'rgba(255,255,255,0.05)'}}>
                  {wp.url?<img src={wp.url} alt="" className="w-full h-full object-cover opacity-50" loading="lazy"/>
                    :<div className="w-full h-full bg-black flex items-center justify-center"><span className="text-white/30 text-[10px] font-ui">NONE</span></div>}
                  <span className="absolute bottom-0.5 left-1.5 text-[9px] font-ui text-white/60">{wp.name}</span>
                  {wallpaperUrl===wp.url && <div className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center" style={{background:'var(--accent-color)'}}><Check size={10} className="text-black"/></div>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input data-testid="custom-wallpaper-input" value={customWallpaper}
                onChange={e=>setCustomWallpaper(e.target.value)} placeholder="Custom URL..."
                className="flex-1 bg-transparent border-b border-white/20 px-0 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 font-body"/>
              <button data-testid="apply-custom-wallpaper" onClick={()=>{if(customWallpaper.trim())changeWallpaper(customWallpaper.trim())}}
                className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold font-ui border border-white/20 text-white hover:border-white">Apply</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
