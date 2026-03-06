import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Zap, Shield, Check, X, Lock, Mail, User, ArrowLeft } from 'lucide-react';
import { api } from '../api';

const STRENGTH_COLORS = { weak: '#FF2A6D', fair: '#FAFF00', good: '#05D9E8', strong: '#39FF14', very_strong: '#39FF14' };
const STRENGTH_LABELS = { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong', very_strong: 'Very Strong' };

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 8) s++; if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++; if (/[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++; if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const l = ['weak','weak','fair','fair','good','strong','very_strong'];
  return { score: s, level: l[Math.min(s, 6)] };
}

export default function AuthPage() {
  const { login, register, loginWithToken } = useAuth();
  const [mode, setMode] = useState('login'); // login, register, forgot, reset
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [strength, setStrength] = useState({ score: 0, level: 'weak' });
  const [resetToken, setResetToken] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (mode === 'register') setStrength(getStrength(form.password));
  }, [form.password, mode]);

  // Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    if (sid) {
      window.history.replaceState({}, '', window.location.pathname);
      handleGoogleCallback(sid);
    }
  }, []);

  const handleGoogleCallback = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.googleAuth(sessionId);
      localStorage.setItem('token', res.token);
      if (loginWithToken) loginWithToken(res.token, res.user);
      else window.location.reload();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      setError('');
      setForm({ username: '', email: '', password: '', confirmPassword: '' });
      setTimeout(() => setAnimating(false), 50);
    }, 150);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (form.username.length < 3) { setError('Username min 3 chars'); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) { setError('Username: letters, numbers, _'); return; }
      if (form.password.length < 8) { setError('Password min 8 chars'); return; }
      if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) {
        setError('Password needs upper, lower, number'); return;
      }
      if (form.password !== form.confirmPassword) { setError('Passwords don\'t match'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else if (mode === 'register') await register({ username: form.username, email: form.email, password: form.password });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(form.email);
      if (res.reset_token) {
        setResetToken(res.reset_token);
        setResetCode(res.code);
        switchMode('reset');
      }
      if (res.status === 'oauth') setError(res.message);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password min 8 chars'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords don\'t match'); return; }
    setLoading(true);
    try {
      await api.resetPassword(resetToken, form.password);
      setResetSuccess(true);
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const googleLogin = () => {
    const returnUrl = window.location.origin + window.location.pathname;
    window.location.href = `${api.getGoogleAuthUrl()}?redirect_url=${encodeURIComponent(returnUrl)}`;
  };

  const passChecks = [
    { label: '8+ chars', ok: form.password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(form.password) },
    { label: 'Lowercase', ok: /[a-z]/.test(form.password) },
    { label: 'Number', ok: /\d/.test(form.password) },
  ];

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black overflow-hidden" data-testid="auth-page">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)', filter: 'blur(120px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 mb-2">
            <Zap size={32} style={{ color: 'var(--accent-color)' }} />
            <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter uppercase">CyberVoid</h1>
          </div>
          <p className="font-ui text-white/40 tracking-[0.3em] text-[10px] uppercase">Secure File Hub</p>
        </div>

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <div className={`transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100'}`}>
            <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-ui mb-4 transition-colors"
              data-testid="back-to-login"><ArrowLeft size={14} /> Back to login</button>
            <h2 className="font-heading text-lg font-bold tracking-tight uppercase mb-1">Reset Password</h2>
            <p className="text-white/40 text-xs font-ui mb-6">Enter your email to get a reset code</p>
            <form onSubmit={handleForgot} className="space-y-4">
              <input data-testid="forgot-email" type="email" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} placeholder="Email"
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body" required />
              {error && <p className="text-red-400 text-xs font-body">{error}</p>}
              <button data-testid="forgot-submit" type="submit" disabled={loading}
                className="w-full py-3.5 uppercase tracking-[0.2em] font-bold text-xs font-ui"
                style={{background:'var(--accent-color)',color:'#000'}}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </div>
        )}

        {/* Reset Password */}
        {mode === 'reset' && (
          <div className={`transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100'}`}>
            {resetSuccess ? (
              <div className="text-center animate-fade-in-up">
                <Check size={48} className="mx-auto mb-4 text-green-400" />
                <p className="font-heading text-lg font-bold">Password Reset!</p>
                <p className="text-white/40 text-xs font-ui mt-2">Redirecting to login...</p>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-lg font-bold tracking-tight uppercase mb-1">New Password</h2>
                <p className="text-xs font-ui mb-1 text-white/40">Your reset code: <span style={{color:'var(--accent-color)'}}>{resetCode}</span></p>
                <p className="text-[10px] font-body text-white/25 mb-6">In production, this code is sent to your email</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="New password" data-testid="reset-password"
                    className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body" required />
                  <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})}
                    placeholder="Confirm password" data-testid="reset-confirm"
                    className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body" required />
                  {error && <p className="text-red-400 text-xs font-body">{error}</p>}
                  <button type="submit" disabled={loading} data-testid="reset-submit"
                    className="w-full py-3.5 uppercase tracking-[0.2em] font-bold text-xs font-ui"
                    style={{background:'var(--accent-color)',color:'#000'}}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Login / Register */}
        {(mode === 'login' || mode === 'register') && (
          <>
            {/* Tabs */}
            <div className="flex mb-6 border border-white/10 animate-fade-in-up" style={{animationDelay:'0.05s'}}>
              <button data-testid="tab-login" onClick={() => mode !== 'login' && switchMode('login')}
                className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-ui font-bold transition-all ${mode==='login'?'text-black':'text-white/40'}`}
                style={mode==='login'?{background:'var(--accent-color)'}:{}}>Login</button>
              <button data-testid="tab-register" onClick={() => mode !== 'register' && switchMode('register')}
                className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-ui font-bold transition-all ${mode==='register'?'text-black':'text-white/40'}`}
                style={mode==='register'?{background:'var(--accent-color)'}:{}}>Register</button>
            </div>

            {/* Google Login */}
            <button onClick={googleLogin} data-testid="google-login-btn"
              className="w-full flex items-center justify-center gap-3 py-3 mb-4 bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all font-ui text-sm text-white/70 hover:text-white animate-fade-in-up"
              style={{animationDelay:'0.08s'}}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
              <div className="flex-1 border-t border-white/10" />
              <span className="text-[10px] font-ui text-white/30 uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}
              className={`space-y-4 transition-all duration-200 ${animating?'opacity-0 translate-y-2':'opacity-100'}`}
              data-testid="auth-form">
              {mode === 'register' && (
                <div>
                  <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5 block flex items-center gap-1.5"><User size={11}/>Username</label>
                  <input data-testid="register-username-input" type="text" value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body"
                    placeholder="cyberuser" required minLength={3} maxLength={24} />
                </div>
              )}
              <div>
                <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5 block flex items-center gap-1.5"><Mail size={11}/>Email</label>
                <input data-testid="login-email-input" type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body"
                  placeholder="user@void.net" required />
              </div>
              <div>
                <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5 block flex items-center gap-1.5"><Lock size={11}/>Password</label>
                <div className="relative">
                  <input data-testid="login-password-input" type={showPass?'text':'password'} value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body pr-10"
                    placeholder="********" required />
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 p-1">
                    {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
                {mode==='register' && form.password.length>0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i=>(
                        <div key={i} className="h-0.5 flex-1 transition-all"
                          style={{background:i<=strength.score?STRENGTH_COLORS[strength.level]:'rgba(255,255,255,0.1)'}}/>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] font-ui uppercase tracking-widest" style={{color:STRENGTH_COLORS[strength.level]}}>{STRENGTH_LABELS[strength.level]}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5 mt-1">
                      {passChecks.map((c,i)=>(
                        <div key={i} className="flex items-center gap-1">
                          {c.ok?<Check size={9} className="text-green-400"/>:<X size={9} className="text-white/20"/>}
                          <span className={`text-[9px] font-body ${c.ok?'text-white/50':'text-white/20'}`}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {mode==='register' && (
                <div>
                  <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5 block flex items-center gap-1.5"><Lock size={11}/>Confirm</label>
                  <input data-testid="register-confirm-password" type="password" value={form.confirmPassword}
                    onChange={e => setForm({...form, confirmPassword: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-color)] font-body"
                    placeholder="********" required />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-[9px] text-red-400 font-body mt-1"><X size={9} className="inline"/> Don't match</p>
                  )}
                </div>
              )}
              {error && (
                <div data-testid="auth-error" className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20">
                  <X size={12} className="text-red-400 shrink-0"/><p className="text-red-400 text-xs font-body">{error}</p>
                </div>
              )}
              <button data-testid="auth-submit-button" type="submit" disabled={loading}
                className="w-full py-3.5 uppercase tracking-[0.2em] font-bold text-xs font-ui transition-all active:scale-[0.98] disabled:opacity-40"
                style={{background:'var(--accent-color)',color:'#000'}}>
                {loading?<span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"/>Processing...</span>
                  :mode==='login'?'Access Hub':'Create Account'}
              </button>
              {mode==='login' && (
                <p className="text-center">
                  <button type="button" onClick={()=>switchMode('forgot')} data-testid="forgot-password-btn"
                    className="text-[11px] font-ui hover:underline transition-colors" style={{color:'var(--accent-color)'}}>
                    Forgot password?
                  </button>
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
