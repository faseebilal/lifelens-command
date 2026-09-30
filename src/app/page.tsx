'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ArrowRight,
  GitFork,
  Zap,
  SlidersHorizontal,
  Bot,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowDown,
  ShieldCheck,
  LogIn,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LandingPage() {
  const router = useRouter();
  const { enterDemoMode } = useAuth();

  const handleTryDemo = () => {
    enterDemoMode();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation */}
      <nav className="h-16 sm:h-20 border-b border-white/10 px-3 sm:px-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.4)] flex-shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-black font-bold" />
          </div>
          <span className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase">
            LIFELENS <span className="text-cyan-400 font-mono text-[10px] sm:text-xs bg-cyan-950 px-1.5 sm:px-2 py-0.5 rounded border border-cyan-500/30">CMD</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Login
          </Link>
          <button
            onClick={handleTryDemo}
            className="hidden xs:flex sm:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] sm:text-xs font-bold hover:bg-cyan-900/80 transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
          >
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
            <span>Try Demo</span>
          </button>
          <Link
            href="/signup"
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-14 md:py-20 flex flex-col items-center text-center space-y-8">
        {/* Domain Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>WEB & APP DEVELOPMENT // 36-HOUR HACKATHON</span>
        </div>

        {/* Hero Title & Exact Tagline */}
        <div className="space-y-4 max-w-4xl">
          <div className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
            LIFELENS COMMAND
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
            See the consequences <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent glow-cyan-text">
              before they become problems.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            An intelligent decision-awareness system that maps dependencies, detects cascading risks, and lets you
            simulate changes before they affect your real plans.
          </p>
        </div>

        {/* Required Primary Buttons: GET STARTED, LOGIN, TRY DEMO */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>GET STARTED</span>
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-sm font-semibold transition-all hover:border-white/20"
          >
            <LogIn className="w-4 h-4 text-slate-300" />
            <span>LOGIN</span>
          </Link>

          <button
            onClick={handleTryDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-300 text-sm font-bold shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>TRY DEMO</span>
          </button>
        </div>

        {/* Visual Dependency Flow: Task ↓ Dependency ↓ Risk ↓ Impact */}
        <div className="w-full pt-10">
          <div className="p-6 md:p-8 rounded-2xl glass-panel border border-white/10 text-left space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                  CORE INNOVATION // VISUAL DEPENDENCY PIPELINE
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  How Delays Cascade Across Connected Tasks
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-500/40">
                <Flame className="w-3.5 h-3.5" />
                <span>REAL-TIME GRAPH PROPAGATION</span>
              </div>
            </div>

            {/* Visual Workflow: TASK -> DEPENDENCY -> RISK -> IMPACT */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Step 1: Task */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5 relative group">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">1. TASK</span>
                <h4 className="text-sm font-bold text-white">Database Setup</h4>
                <p className="text-[11px] text-slate-400">PostgreSQL schema & RLS tables established.</p>
                <div className="flex items-center justify-between text-xs text-emerald-400 pt-1">
                  <span>Completed</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Step 2: Dependency */}
              <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-500/50 space-y-1.5">
                <span className="text-[10px] font-mono text-blue-300 uppercase font-bold">
                  2. DEPENDENCY
                </span>
                <h4 className="text-sm font-bold text-white">API Development</h4>
                <p className="text-[11px] text-slate-300">Blocks Frontend Integration & Testing.</p>
                <div className="flex items-center justify-between text-xs text-blue-300 pt-1 font-mono">
                  <span>Blocks 4 Tasks</span>
                  <GitFork className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>

              {/* Step 3: Risk */}
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/80 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] space-y-1.5 animate-pulse">
                <span className="text-[10px] font-mono text-red-300 uppercase font-bold">
                  3. RISK DETECTED
                </span>
                <h4 className="text-sm font-bold text-white">Critical Bottleneck</h4>
                <p className="text-[11px] text-red-200">5.5h estimated work / 3.5h remaining time.</p>
                <div className="flex items-center justify-between text-xs text-red-300 pt-1 font-mono">
                  <span className="font-bold">RISK SCORE 88</span>
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                </div>
              </div>

              {/* Step 4: Impact */}
              <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 space-y-1.5">
                <span className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                  4. IMPACT
                </span>
                <h4 className="text-sm font-bold text-white">Milestone Compression</h4>
                <p className="text-[11px] text-amber-200">Final submission buffer reduced by 75%.</p>
                <div className="flex items-center justify-between text-xs text-amber-300 pt-1 font-mono">
                  <span>Downstream Risk: High</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>LifeLens calculates this chain dynamically and recommends unblocking mitigations.</span>
              </span>
              <button
                onClick={handleTryDemo}
                className="text-cyan-400 font-semibold hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Launch Live Demo Workflow</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-6 text-left">
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <GitFork className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dependency Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directional graph representation of projects and tasks with cycle deadlock prevention and BFS blast radius
              traversal.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-500/40 text-red-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Transparent Risk Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deterministic multi-factor scoring (deadline pressure, remaining work, dependency multiplier, calendar
              collisions) with human explanations.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">What-If & Chaos Mode</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simulate 24-hour delays, team member absence, or shifted deadlines in memory. Inspect before vs after
              metrics before committing.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 px-4 sm:px-6 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 text-center sm:text-left">
        <span>LifeLens Command — Decision Intelligence Platform</span>
        <span>Next.js 14 • PostgreSQL • Supabase • Web Push</span>
      </footer>
    </div>
  );
}
