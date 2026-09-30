'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitFork,
  FolderKanban,
  CheckSquare,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  Bot,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useLifeLens } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  isMobile = false,
  onNavigate,
}) => {
  const pathname = usePathname();
  const { criticalRisksCount } = useLifeLens();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Life Map', href: '/life-map', icon: GitFork, highlight: true },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    {
      label: 'Risk Center',
      href: '/risk-center',
      icon: AlertTriangle,
      badge: criticalRisksCount > 0 ? criticalRisksCount : undefined,
      badgeColor: 'red',
    },
    { label: 'What-If Simulation', href: '/what-if', icon: SlidersHorizontal, glow: true },
    { label: 'AI Command', href: '/ai-command', icon: Bot, pulse: true },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full w-full">
      {/* Brand Logo & Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 flex-shrink-0">
        <Link
          href="/dashboard"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(0,229,255,0.4)] flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-black font-bold" />
            <div className="absolute inset-0 rounded-xl border border-white/40 pointer-events-none" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                LifeLens <span className="text-cyan-400 font-mono text-[10px] bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">CMD</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">Consequence Engine</span>
            </div>
          )}
        </Link>
        {!isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200',
                  item.glow && 'text-cyan-400'
                )}
              />

              {(!collapsed || isMobile) && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}

              {/* Status Badges */}
              {(!collapsed || isMobile) && item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                  {item.badge}
                </span>
              )}

              {(!collapsed || isMobile) && item.pulse && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick Chaos trigger banner */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <Link
          href="/what-if"
          onClick={() => onNavigate?.()}
          className={cn(
            'flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent border border-amber-500/30 text-amber-300 hover:border-amber-400 transition-all text-xs font-semibold group min-h-[44px]',
            collapsed && !isMobile ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Disruption Mode</span>}
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-[10px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/30">
              SIM
            </span>
          )}
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return <div className="h-full w-full">{content}</div>;
  }

  return (
    <aside
      className={cn(
        'hidden md:flex fixed top-0 bottom-0 left-0 z-40 flex-col bg-[#070A0F]/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {content}
    </aside>
  );
};
