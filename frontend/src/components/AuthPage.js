import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black" data-testid="auth-page">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)', filter: 'blur(100px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 mb-4">
            <Zap size={32} style={{ color: 'var(--accent-color)' }} />
            <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">
              CyberVoid
            </h1>
          </div>
          <p className="font-ui text-white/40 tracking-widest text-sm uppercase">
            File Storage Hub
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {!isLogin && (
            <div>
              <label className="font-ui text-xs tracking-widest uppercase text-white/50 mb-1 block">Username</label>
              <input
                data-testid="register-username-input"
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 transition-colors font-body"
                placeholder="cyberuser"
                required
              />
            </div>
          )}
          <div>
            <label className="font-ui text-xs tracking-widest uppercase text-white/50 mb-1 block">Email</label>
            <input
              data-testid="login-email-input"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 transition-colors font-body"
              placeholder="user@void.net"
              required
            />
          </div>
          <div className="relative">
            <label className="font-ui text-xs tracking-widest uppercase text-white/50 mb-1 block">Password</label>
            <input
              data-testid="login-password-input"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[var(--accent-color)] placeholder:text-white/20 transition-colors font-body pr-10"
              placeholder="********"
              required
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-0 bottom-3 text-white/30 hover:text-white transition-colors">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p data-testid="auth-error" className="text-red-500 text-sm font-body">{error}</p>
          )}

          <button
            data-testid="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-4 uppercase tracking-widest font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{
              background: 'var(--accent-color)',
              color: '#000',
              boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.3)',
            }}
          >
            {loading ? '...' : isLogin ? 'Access Hub' : 'Create Account'}
          </button>

          <p className="text-center text-white/40 text-sm font-ui">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              data-testid="auth-toggle-button"
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="hover:text-white transition-colors"
              style={{ color: 'var(--accent-color)' }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
