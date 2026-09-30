'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Zap, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthDiagnosticModal } from '@/components/auth/AuthDiagnosticModal';

export default function LoginPage() {
  const router = useRouter();
  const { login, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await login(email, password);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials. Please verify your email and password.');
      return;
    }

    // Success -> redirect to dashboard
    router.push('/dashboard');
  };

  const handleQuickDemoLogin = () => {
    enterDemoMode();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center p-4 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,229,255,0.4)]">
            <ShieldAlert className="w-6 h-6 text-black font-bold" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Access Command Center</h1>
          <p className="text-xs text-slate-400">
            Sign in to access your dependency graphs and risk telemetry.
          </p>
        </div>

        {/* Quick Demo Access for Hackathon Judges */}
        <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-center space-y-2">
          <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider block font-bold">
            HACKATHON DEMO SHORTCUT
          </span>
          <p className="text-slate-300 text-[11px]">
            Evaluate with the pre-seeded demo workspace (AI Campus Assistant) immediately:
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Launch Demo Mode (AI Campus Assistant)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Operator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@lifelens.io"
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Security Key / Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Need an account?{' '}
          <Link href="/signup" className="text-cyan-400 hover:underline font-semibold">
            Register here
          </Link>
        </div>

        <AuthDiagnosticModal />
      </div>
    </div>
  );
}
