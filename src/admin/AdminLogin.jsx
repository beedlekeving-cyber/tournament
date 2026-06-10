import { useState } from 'react';
import { useAdmin } from './AdminContext';
import { Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react';

export default function AdminLogin() {
  const { state, login } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  return (
    <div className="min-h-screen bg-[#060610] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-700/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-purple-700/15 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mb-4 shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white">Admin Panel</h1>
          <p className="text-gray-500 mt-1 text-sm">Quiz Arena</p>
        </div>

        {/* Login card */}
        <div className="glass rounded-3xl p-8 border border-indigo-500/20">
          <h2 className="text-white font-bold text-lg mb-6 text-center">Secure Access</h2>

          <div className="relative mb-4">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login(email, password)}
              placeholder="Admin email"
              className="w-full bg-white/5 border-2 border-white/10 focus:border-indigo-500 rounded-2xl pl-11 pr-4 py-4 text-white outline-none transition-all duration-300"
            />
          </div>

          <div className="relative mb-4">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login(email, password)}
              placeholder="Admin password"
              className="w-full bg-white/5 border-2 border-white/10 focus:border-indigo-500 rounded-2xl pl-11 pr-11 py-4 text-white outline-none transition-all duration-300"
            />
            <button
              onClick={() => setShow(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {state.authError && (
            <p className="text-red-400 text-sm mb-4 flex items-center gap-2">
              <span>⚠️</span> {state.authError}
            </p>
          )}

          <button
            onClick={() => login(email, password)}
            disabled={state.loginLoading}
            className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
          >
            {state.loginLoading ? '⏳ Signing in…' : '🔐 Enter Dashboard'}
          </button>


        </div>
      </div>
    </div>
  );
}
