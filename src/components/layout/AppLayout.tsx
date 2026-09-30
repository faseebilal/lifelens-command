'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChaosModal } from '../chaos/ChaosModal';
import { cn } from '@/lib/utils';
import {
  X,
  ArrowRight,
  LayoutDashboard,
  GitFork,
  CheckSquare,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLifeLens } from '@/lib/store';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isDemoMode, isLoading, exitDemoMode } = useAuth();
  const { criticalRisksCount } = useLifeLens();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chaosModalOpen, setChaosModalOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Protected route check: Unauthenticated users are redirected to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isDemoMode) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isDemoMode, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center p-4">
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
        <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-950 via-blue-950 to-cyan-950 border-b border-cyan-500/40 px-3 sm:px-4 py-2 text-xs flex items-center justify-between text-cyan-200 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase font-mono flex-shrink-0">
              DEMO
            </span>
            <span className="font-medium text-slate-200 text-[11px] sm:text-xs truncate">
              Showcase Workspace: <strong className="text-white">AI Campus Assistant</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => exitDemoMode()}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-white underline hover:no-underline transition-colors"
            >
              <span>Exit Demo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar (Automatically hidden on screen < md) */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#070A0F] border-r border-white/10 z-10 flex flex-col animate-in slide-in-from-left duration-250 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-bold text-xs tracking-wider text-white uppercase font-mono">
                LIFELENS NAVIGATION
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                isMobile
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0 w-full',
          collapsed ? 'md:pl-20' : 'md:pl-64'
        )}
      >
        <TopBar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenChaosModal={() => setChaosModalOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fast 1-tap thumb navigation for mobile phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070A0F]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1 flex items-center justify-around safe-bottom">
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-colors min-h-[44px] min-w-[56px]',
            pathname === '/dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/life-map"
          className={cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-colors min-h-[44px] min-w-[56px]',
            pathname === '/life-map' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <GitFork className="w-5 h-5 mb-0.5" />
          <span>Life Map</span>
        </Link>

        <Link
          href="/tasks"
          className={cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-colors min-h-[44px] min-w-[56px]',
            pathname === '/tasks' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <CheckSquare className="w-5 h-5 mb-0.5" />
          <span>Tasks</span>
        </Link>

        <Link
          href="/risk-center"
          className={cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-colors relative min-h-[44px] min-w-[56px]',
            pathname === '/risk-center' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span>Risks</span>
          {criticalRisksCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </Link>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[56px]"
          aria-label="Open full menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Global Cinematic Chaos Disruption Modal */}
      <ChaosModal
        isOpen={chaosModalOpen}
        onClose={() => setChaosModalOpen(false)}
      />
    </div>
  );
};
