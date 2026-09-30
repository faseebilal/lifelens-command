'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Menu,
  Bell,
  Sparkles,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useLifeLens } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '../notifications/NotificationCenter';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  onOpenChaosModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu, onOpenChaosModal }) => {
  const { overallRiskScore, projectHealth, criticalRisksCount, resetToDemo, isDemoMode } = useLifeLens();
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || 'demo-user-id';

  const fetchUnread = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        const unread = (data.notifications || []).filter((n: any) => !n.read_at).length;
        setUnreadCount(unread);
      }
    } catch {
      // Ignore network errors in polling
    }
  }, [userId]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReset = () => {
    if (confirm('Reset workspace to the canonical "AI Campus Assistant" demo baseline?')) {
      resetToDemo();
    }
  };

  const getHealthBadge = () => {
    if (projectHealth >= 75) {
      return {
        label: `${projectHealth}% Health`,
        style: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
        icon: ShieldCheck,
      };
    }
    if (projectHealth >= 50) {
      return {
        label: `${projectHealth}% Health`,
        style: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
      };
    }
    return {
      label: `${projectHealth}% Health`,
      style: 'bg-red-950/60 text-red-300 border-red-500/40 animate-pulse',
      icon: AlertTriangle,
    };
  };

  const health = getHealthBadge();
  const HealthIcon = health.icon;

  const displayName = isDemoMode
    ? 'LifeLens Demo'
    : user?.full_name || 'Commander';
  const displayEmail = isDemoMode
    ? 'demo@lifelens.io'
    : user?.email || 'authenticated@user';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-4 md:px-6 bg-[#070A0F]/80 backdrop-blur-xl border-b border-white/10 select-none">
        {/* Left: Mobile Toggle & System Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-2 h-2">
              <span className="absolute w-3 h-3 rounded-full bg-cyan-400 opacity-75 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-xs font-mono font-medium text-slate-400 hidden sm:inline">
              SYSTEM ONLINE // <span className="text-cyan-400">{isDemoMode ? 'DEMO TELEMETRY' : 'REAL-TIME DATA'}</span>
            </span>
          </div>
        </div>

        {/* Center/Right: Health, Chaos, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Project Health Pill */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-semibold',
              health.style
            )}
            title="Overall Project Health Index"
          >
            <HealthIcon className="w-3.5 h-3.5" />
            <span>{health.label}</span>
          </div>

          {/* Critical Risks Counter */}
          {criticalRisksCount > 0 && (
            <Link
              href="/risk-center"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-950/60 text-red-300 text-xs font-semibold hover:border-red-400 transition-colors shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>{criticalRisksCount} Critical {criticalRisksCount === 1 ? 'Risk' : 'Risks'}</span>
            </Link>
          )}

          {/* Chaos Mode Button */}
          <button
            onClick={onOpenChaosModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all hover:scale-105 active:scale-95 min-h-[40px]"
            title="Simulate Real-time Project Disruption"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Chaos Mode</span>
          </button>

          {/* Reset Demo Data (if demo mode) */}
          {isDemoMode && (
            <button
              onClick={handleReset}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
              title="Reset to 36h Hackathon Demo Dataset"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset Demo</span>
            </button>
          )}

          {/* Notification Bell 🔔 */}
          <button
            onClick={() => setNotificationCenterOpen(true)}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Notification Center"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-cyan-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white font-mono font-bold text-[10px] flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative pl-1 sm:pl-2 border-l border-white/10" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors focus:outline-none min-h-[44px]"
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                {initials || 'OP'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  <span>{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </span>
                <span className="text-[10px] text-cyan-400 leading-tight font-mono">
                  {isDemoMode ? 'Showcase Demo' : 'Isolated Operator'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-white/10 mb-1">
                  <span className="font-semibold text-white block text-sm">{displayName}</span>
                  <span className="text-slate-400 text-[11px] block truncate">{displayEmail}</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {isDemoMode ? 'DEMO MODE // UNRESTRICTED' : 'OPERATOR WORKSPACE'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setNotificationCenterOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span>Notification Center</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto text-[10px] font-mono font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-500/30">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <Link
                    href="/projects"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Projects & Scope</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Workspace Settings</span>
                  </Link>

                  <button
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out / Terminate Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* In-App Notification Center Drawer */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => {
          setNotificationCenterOpen(false);
          fetchUnread();
        }}
      />
    </>
  );
};
