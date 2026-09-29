'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { CriticalRisksCard } from '@/components/dashboard/CriticalRisksCard';
import { ImpactPreviewCard } from '@/components/dashboard/ImpactPreviewCard';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { ProjectHealthCard } from '@/components/dashboard/ProjectHealthCard';
import { Sparkles, ShieldAlert, ArrowRight, Plus, Zap, GitFork } from 'lucide-react';
import Link from 'next/link';
import { useLifeLens } from '@/lib/store';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { hasData, isDemoMode, projects, tasks } = useLifeLens();
  const { user, enterDemoMode } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = isDemoMode
    ? 'LifeLens Demo'
    : user?.full_name || 'Commander';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, {displayName}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Here’s what needs your attention across your active projects and dependencies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/life-map"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all hover:scale-105 active:scale-95"
            >
              <GitFork className="w-4 h-4 text-cyan-400" />
              <span>Launch Life Map</span>
            </Link>

            <Link
              href="/ai-command"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <span>Ask AI Advisor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Summary Metrics (Real database values) */}
        <MetricsGrid />

        {/* 2. New User Onboarding State (When workspace is empty in normal mode) */}
        {!hasData && !isDemoMode && (
          <div className="p-8 md:p-12 rounded-2xl glass-panel border border-cyan-500/30 text-center space-y-4 shadow-2xl bg-gradient-to-b from-cyan-950/20 to-transparent">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                WELCOME TO LIFELENS COMMAND
              </h2>
              <p className="text-sm text-cyan-400 font-mono font-medium">
                “Your decision map starts here.”
              </p>
            </div>

            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              No active projects yet. Create your first project and link tasks with dependencies to enable automated consequence analysis, cascading risk propagation, and what-if simulation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/projects"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ CREATE FIRST PROJECT</span>
              </Link>

              <button
                onClick={() => enterDemoMode()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold text-xs transition-colors hover:border-white/20"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>TRY DEMO WORKSPACE</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Visual Cascading Impact Chain (When tasks exist) */}
        {hasData && <ImpactPreviewCard />}

        {/* 4. Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Risks (2 cols on large) */}
          <div className="lg:col-span-2">
            <CriticalRisksCard />
          </div>

          {/* Project Health */}
          <div>
            <ProjectHealthCard />
          </div>
        </div>

        {/* 5. Schedule & Timeline */}
        <div className="grid grid-cols-1 gap-6">
          <TodaySchedule />
        </div>
      </div>
    </AppLayout>
  );
}
