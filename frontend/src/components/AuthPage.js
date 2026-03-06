import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Zap, Shield, Check, X, Lock, Mail, User } from 'lucide-react';

const STRENGTH_COLORS = {
  weak: '#FF2A6D',
  fair: '#FAFF00',
  good: '#05D9E8',
  strong: '#39FF14',
  very_strong: '#39FF14',
};

const STRENGTH_LABELS = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
  very_strong: 'Very Strong',
};

function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = ['weak', 'weak', 'fair', 'fair', 'good', 'strong', 'very_strong'];
  return { score, level: levels[Math.min(score, 6)] };
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [strength, setStrength] = useState({ score: 0, level: 'weak' });
  const formRef = useRef(null);

  useEffect(() => {
    if (!isLogin) {
      setStrength(getStrength(form.password));
    }
  }, [form.password, isLogin]);

  const toggleMode = () => {
    setAnimating(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setError('');
      setForm({ username: '', email: '', password: '', confirmPassword: '' });
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (form.username.length < 3) {
        setError('Username must be at least 3 characters'); return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
        setError('Username: only letters, numbers, underscores'); return;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters'); return;
      }
      if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) {
        setError('Password needs uppercase, lowercase, and a number'); return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match'); return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ username: form.username, email: form.email, password: form.password });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const passChecks = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(form.password) },
    { label: 'Number', ok: /\d/.test(form.password) },
  ];

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black overflow-hidden" data-testid="auth-page">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)', filter: 'blur(120px)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)', filter: 'blur(100px)' }} />
      </div>

      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="relative">
              <Zap size={36} style={{ color: 'var(--accent-color)' }} />
              <div className="absolute inset-0 animate-pulse opacity-50">
                <Zap size={36} style={{ color: 'var(--accent-color)', filter: 'blur(8px)' }} />
              </div>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter uppercase">
              CyberVoid
            </h1>
          </div>
          <p className="font-ui text-white/40 tracking-[0.3em] text-xs uppercase">
            Secure File Hub
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-white/20">
            <Shield size={12} />
            <span className="font-body text-[10px] tracking-widest uppercase">End-to-end encrypted</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-8 border border-white/10 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <button
            data-testid="tab-login"
            onClick={() => isLogin ? null : toggleMode()}
            className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-ui font-bold transition-all duration-300 ${
              isLogin ? 'text-black' : 'text-white/40 hover:text-white/60'
            }`}
            style={isLogin ? { background: 'var(--accent-color)' } : {}}
          >
            Login
          </button>
          <button
            data-testid="tab-register"
            onClick={() => !isLogin ? null : toggleMode()}
            className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-ui font-bold transition-all duration-300 ${
              !isLogin ? 'text-black' : 'text-white/40 hover:text-white/60'
            }`}
            style={!isLogin ? { background: 'var(--accent-color)' } : {}}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit}
          className={`space-y-5 transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
          data-testid="auth-form"
        >
          {/* Username (register only) */}
          {!isLogin && (
            <div className="animate-fade-in-up">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2 block flex items-center gap-2">
                <User size={12} /> Username
              </label>
              <input
                data-testid="register-username-input"
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/15 transition-all font-body text-sm hover:border-white/20"
                placeholder="cyberuser"
                required
                minLength={3}
                maxLength={24}
                autoComplete="username"
              />
              {form.username && !/^[a-zA-Z0-9_]{3,24}$/.test(form.username) && (
                <p className="text-[10px] text-red-400 font-body mt-1">3-24 chars: letters, numbers, _</p>
              )}
            </div>
          )}

          {/* Email */}
          <div className={!isLogin ? 'animate-fade-in-up' : ''}>
            <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2 block flex items-center gap-2">
              <Mail size={12} /> Email
            </label>
            <input
              data-testid="login-email-input"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/15 transition-all font-body text-sm hover:border-white/20"
              placeholder="user@void.net"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2 block flex items-center gap-2">
              <Lock size={12} /> Password
            </label>
            <div className="relative">
              <input
                data-testid="login-password-input"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/15 transition-all font-body text-sm pr-12 hover:border-white/20"
                placeholder="********"
                required
                minLength={isLogin ? 1 : 8}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors p-1"
                data-testid="toggle-password-visibility">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength indicator (register) */}
            {!isLogin && form.password.length > 0 && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i}
                      className="h-1 flex-1 transition-all duration-300"
                      style={{
                        background: i <= strength.score
                          ? STRENGTH_COLORS[strength.level]
                          : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-ui uppercase tracking-widest"
                    style={{ color: STRENGTH_COLORS[strength.level] }}>
                    {STRENGTH_LABELS[strength.level]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {passChecks.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {c.ok
                        ? <Check size={10} className="text-green-400" />
                        : <X size={10} className="text-white/20" />}
                      <span className={`text-[10px] font-body ${c.ok ? 'text-white/60' : 'text-white/20'}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password (register) */}
          {!isLogin && (
            <div className="animate-fade-in-up">
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2 block flex items-center gap-2">
                <Lock size={12} /> Confirm Password
              </label>
              <div className="relative">
                <input
                  data-testid="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/15 transition-all font-body text-sm pr-12 hover:border-white/20"
                  placeholder="********"
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors p-1">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-[10px] text-red-400 font-body mt-1 flex items-center gap-1">
                  <X size={10} /> Passwords don't match
                </p>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                <p className="text-[10px] text-green-400 font-body mt-1 flex items-center gap-1">
                  <Check size={10} /> Passwords match
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div data-testid="auth-error"
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 animate-fade-in">
              <X size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-body">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            data-testid="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-4 uppercase tracking-[0.2em] font-bold text-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-40 font-ui relative overflow-hidden group"
            style={{
              background: 'var(--accent-color)',
              color: '#000',
            }}
          >
            <span className="relative z-10">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? 'Access Hub' : 'Create Account'}
            </span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/25 text-[11px] font-body mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {isLogin ? "New user?" : 'Have an account?'}{' '}
          <button
            data-testid="auth-toggle-button"
            type="button"
            onClick={toggleMode}
            className="hover:text-white transition-colors font-bold"
            style={{ color: 'var(--accent-color)' }}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
