'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Lock, Mail, User, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const { signup, enterDemoMode } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setConfirmationNotice(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const res = await signup(fullName, email, password);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed. Please try again.');
      return;
    }

    if (res.requiresConfirmation) {
      setConfirmationNotice(res.message || 'Account created. Check your email to confirm your account, then log in.');
      return;
    }

    // Authenticated session established -> redirect to dashboard
    router.push('/dashboard');
  };

  const handleLaunchDemo = () => {
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
          <h1 className="text-xl font-extrabold text-white tracking-tight">Create Operator Account</h1>
          <p className="text-xs text-slate-400">
            Sign up to build your own isolated decision workspace with Supabase RLS.
          </p>
        </div>

        {/* Demo Mode Shortcut */}
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
              JUDGING SHORTCUT
            </span>
            <span className="text-slate-300 text-[11px]">Explore preloaded AI Campus Assistant:</span>
          </div>
          <button
            onClick={handleLaunchDemo}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-colors flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Try Demo</span>
          </button>
        </div>

        {confirmationNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{confirmationNotice}</p>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start gap-2">
            <span className="text-red-400 font-bold">!</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Bilal Lead"
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Email</label>
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
            <label className="block text-slate-300 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Creating Profile & Workspace...' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline font-semibold">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
