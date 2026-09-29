'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChaosModal } from '../chaos/ChaosModal';
import { cn } from '@/lib/utils';
import { X, Sparkles, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isDemoMode, isLoading, exitDemoMode } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chaosModalOpen, setChaosModalOpen] = useState(false);

  // Protected route check: Unauthenticated users are redirected to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isDemoMode) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isDemoMode, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
            Verifying Operator Credentials...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isDemoMode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-950 via-blue-950 to-cyan-950 border-b border-cyan-500/40 px-4 py-2 text-xs flex items-center justify-between text-cyan-200 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase font-mono">
              DEMO MODE
            </span>
            <span className="font-medium text-slate-200 hidden sm:inline">
              Preloaded Showcase Workspace: <strong className="text-white">AI Campus Assistant</strong> (Isolated telemetry — normal accounts protected)
            </span>
            <span className="font-medium text-slate-200 sm:hidden">
              Showcase Workspace (AI Campus Assistant)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => exitDemoMode()}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-white underline hover:no-underline transition-colors"
            >
              <span>Exit Demo / Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#070A0F] border-r border-white/10 z-10 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-bold text-sm tracking-wider text-white">LIFELENS COMMAND</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                collapsed={false}
                onToggleCollapse={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0',
          collapsed ? 'md:pl-20' : 'md:pl-64'
        )}
      >
        <TopBar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenChaosModal={() => setChaosModalOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Cinematic Chaos Disruption Modal */}
      <ChaosModal
        isOpen={chaosModalOpen}
        onClose={() => setChaosModalOpen(false)}
      />
    </div>
  );
};
