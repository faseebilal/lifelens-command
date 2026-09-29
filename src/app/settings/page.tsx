'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import {
  Settings,
  Database,
  RotateCcw,
  ShieldCheck,
  Cpu,
  User,
  CheckCircle2,
  Download,
  LogOut,
  Key,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const { tasks, projects, dependencies, events, resetToDemo, isDemoMode } = useLifeLens();
  const { user, logout } = useAuth();
  const [savedNotice, setSavedNotice] = useState(false);

  const handleExportState = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ projects, tasks, dependencies, events }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'lifelens_telemetry_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetDemo = () => {
    if (confirm('Reset demo data back to the default "AI Campus Assistant" baseline?')) {
      resetToDemo();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  const displayName = isDemoMode
    ? 'LifeLens Demo'
    : user?.full_name || 'Commander';
  const displayEmail = isDemoMode
    ? 'demo@lifelens.io'
    : user?.email || 'authenticated@user';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">System Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure telemetry parameters, database connectivity, and workspace profile telemetry.
          </p>
        </div>

        {savedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Workspace successfully reset to canonical hackathon baseline.</span>
          </div>
        )}

        {/* 1. User Profile Telemetry */}
        <Card className="p-5">
          <CardHeader
            title="Authenticated Operator Profile"
            subtitle="Real Supabase Auth & Session Telemetry"
            icon={<User className="w-5 h-5 text-cyan-400" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
            <div>
              <span className="text-slate-400 block mb-1">Operator Name:</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-medium">
                {displayName}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Operator Email:</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-medium">
                {displayEmail}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Active Mode:</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-cyan-400 font-mono font-medium">
                {isDemoMode ? 'DEMO WORKSPACE (Showcase)' : 'NORMAL MODE (RLS Isolated)'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">User Identifier (UID):</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-slate-300 font-mono text-[11px] truncate">
                {user?.id || 'demo-user-id'}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-slate-400">
              Account Security: Session protected by Row Level Security (RLS)
            </span>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / Log Out</span>
            </button>
          </div>
        </Card>

        {/* 2. Database & Supabase Status */}
        <Card className="p-5">
          <CardHeader
            title="Database & Storage Architecture"
            subtitle="PostgreSQL schema with Row Level Security (RLS) policies"
            icon={<Database className="w-5 h-5 text-cyan-400" />}
          />

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="font-semibold text-white block">PostgreSQL / Supabase Schema</span>
                <span className="text-[11px] text-slate-400">
                  9 tables: profiles, projects, tasks, dependencies, events, risks, simulations, ai_conversations, ai_messages
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                RLS ENABLED
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="font-semibold text-white block">Offline / Edge Resilience</span>
                <span className="text-[11px] text-slate-400">
                  Zero-latency graph evaluation with in-memory execution and isolated user caching
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
          </div>
        </Card>

        {/* 3. Demo Data Management */}
        <Card className="p-5">
          <CardHeader
            title="Hackathon Workspace Telemetry"
            subtitle="Export live workspace data or reset demo benchmarks"
            icon={<Cpu className="w-5 h-5 text-purple-400" />}
          />

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Export the current DAG state and metrics as JSON, or reset the workspace to the canonical judging scenario:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isDemoMode && (
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to AI Campus Assistant Demo</span>
              </button>
            )}

            <button
              onClick={handleExportState}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Workspace JSON</span>
            </button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
