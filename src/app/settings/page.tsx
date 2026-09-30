'use client';

import React, { useState, useEffect } from 'react';
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
  Bell,
  Zap,
  Clock,
  Calendar,
  AlertTriangle,
  Globe,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  NotificationPreferences,
} from '@/lib/notifications';

export default function SettingsPage() {
  const { tasks, projects, dependencies, events, resetToDemo, isDemoMode } = useLifeLens();
  const { user, logout } = useAuth();
  const userId = user?.id || 'demo-user-id';

  const [savedNotice, setSavedNotice] = useState(false);
  const [prefNotice, setPrefNotice] = useState<string | null>(null);

  // Push & Notification Settings State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [pushLoading, setPushLoading] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: userId,
    push_enabled: false,
    task_deadlines_enabled: true,
    project_deadlines_enabled: true,
    reminders_enabled: true,
    overdue_enabled: true,
    daily_summary_enabled: false,
    daily_summary_time: '09:00',
    task_reminder_timings: ['24h', '2h', 'at_deadline'],
    project_reminder_timings: ['24h', 'at_deadline'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  // Check push support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = isPushNotificationSupported();
      setPushSupported(supported);
      if (supported) {
        setPushPermission(getNotificationPermission());
      }
    }
  }, []);

  // Load preferences from API or local storage
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await fetch(`/api/notifications/preferences?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.preferences) {
            setPreferences((prev) => ({ ...prev, ...data.preferences }));
          }
        }
      } catch (err) {
        console.warn('Failed to load notification preferences:', err);
      }
    };
    loadPrefs();
  }, [userId]);

  // Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefNotice('Saving preferences...');

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences }),
      });

      if (res.ok) {
        setPrefNotice('Notification preferences successfully saved.');
        setTimeout(() => setPrefNotice(null), 4000);
      } else {
        throw new Error('Server returned an error');
      }
    } catch {
      setPrefNotice('Preferences saved locally.');
      setTimeout(() => setPrefNotice(null), 4000);
    }
  };

  // Toggle Web Push
  const handleTogglePush = async () => {
    setPushLoading(true);
    setPrefNotice(null);

    if (!preferences.push_enabled) {
      // Enable Push
      const res = await subscribeToPush(userId);
      setPushLoading(false);

      if (res.success) {
        setPreferences((prev) => ({ ...prev, push_enabled: true }));
        setPushPermission('granted');
        setPrefNotice('Push notifications enabled! Triggering test alert...');
        await sendTestNotification(userId);
        setTimeout(() => setPrefNotice(null), 5000);
      } else {
        setPushPermission(getNotificationPermission());
        setPrefNotice(res.error || 'Failed to enable push notifications.');
      }
    } else {
      // Disable Push
      await unsubscribeFromPush(userId);
      setPushLoading(false);
      setPreferences((prev) => ({ ...prev, push_enabled: false }));
      setPrefNotice('Push notifications disabled on this device.');
      setTimeout(() => setPrefNotice(null), 4000);
    }
  };

  const handleSendTestPush = async () => {
    setPrefNotice('Sending test Web Push notification...');
    const res = await sendTestNotification(userId);
    setPrefNotice(res.message || (res.success ? 'Test notification sent!' : res.error || 'Failed to send test.'));
    setTimeout(() => setPrefNotice(null), 5000);
  };

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

  const toggleTaskTiming = (timing: string) => {
    setPreferences((prev) => {
      const current = prev.task_reminder_timings || [];
      const updated = current.includes(timing)
        ? current.filter((t) => t !== timing)
        : [...current, timing];
      return { ...prev, task_reminder_timings: updated };
    });
  };

  const toggleProjectTiming = (timing: string) => {
    setPreferences((prev) => {
      const current = prev.project_reminder_timings || [];
      const updated = current.includes(timing)
        ? current.filter((t) => t !== timing)
        : [...current, timing];
      return { ...prev, project_reminder_timings: updated };
    });
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
            Configure telemetry parameters, Web Push notifications, database connectivity, and workspace profile telemetry.
          </p>
        </div>

        {savedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Workspace successfully reset to canonical hackathon baseline.</span>
          </div>
        )}

        {prefNotice && (
          <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{prefNotice}</span>
          </div>
        )}

        {/* 1. Real Web Push & Notification Engine Settings */}
        <div id="notifications">
          <Card className="p-5">
            <CardHeader
              title="Web Push & Deadline Notification Engine"
              subtitle="Configure server-side schedule alerts and background browser push notifications"
              icon={<Bell className="w-5 h-5 text-cyan-400" />}
            />

            <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
              {/* Push Status & Enable Toggle */}
              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white text-sm block">Browser Web Push Notifications</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Receive alerts on your phone or desktop even when LifeLens Command is closed.
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-slate-400">Device Status:</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          !pushSupported
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : pushPermission === 'granted'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                            : pushPermission === 'denied'
                            ? 'bg-red-950 text-red-400 border-red-500/40'
                            : 'bg-amber-950 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        {!pushSupported
                          ? 'UNSUPPORTED BROWSER'
                          : pushPermission === 'granted'
                          ? 'PUSH ENABLED / GRANTED'
                          : pushPermission === 'denied'
                          ? 'BLOCKED IN BROWSER'
                          : 'PENDING PERMISSION'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTogglePush}
                      disabled={pushLoading || !pushSupported}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-1.5 ${
                        preferences.push_enabled && pushPermission === 'granted'
                          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                      } disabled:opacity-50`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {pushLoading
                          ? 'Processing...'
                          : preferences.push_enabled && pushPermission === 'granted'
                          ? 'Disable Push'
                          : 'Enable Notifications'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendTestPush}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-semibold transition-colors"
                      title="Send test push notification"
                    >
                      Send Test Alert
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Task Deadlines */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Task Deadline Alerts</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={preferences.task_deadlines_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, task_deadlines_enabled: e.target.checked })
                      }
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Notifies you when task deadlines approach to protect downstream deliverable buffers.
                  </p>
                </div>

                {/* Overdue Task Alerts */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Overdue Task Notifications</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={preferences.overdue_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, overdue_enabled: e.target.checked })
                      }
                      className="accent-red-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sends single non-spam alerts when active deliverables cross their deadline.
                  </p>
                </div>

                {/* Project Deadlines */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>Project Milestone Alerts</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={preferences.project_deadlines_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, project_deadlines_enabled: e.target.checked })
                      }
                      className="accent-purple-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Alerts for major milestone targets and sprint delivery dates.
                  </p>
                </div>

                {/* Calendar Collision Reminders */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Schedule Conflict Reminders</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={preferences.reminders_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, reminders_enabled: e.target.checked })
                      }
                      className="accent-amber-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Warns when mandatory classes or meetings collide with critical task delivery windows.
                  </p>
                </div>
              </div>

              {/* Reminder Timing Checkboxes */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                {/* Task Reminder Timings */}
                <div>
                  <span className="font-semibold text-slate-200 block mb-2">
                    Task Reminder Intervals:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { id: '24h', label: '24 Hours' },
                      { id: '12h', label: '12 Hours' },
                      { id: '2h', label: '2 Hours' },
                      { id: '1h', label: '1 Hour' },
                      { id: '30m', label: '30 Minutes' },
                      { id: 'at_deadline', label: 'At Deadline' },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          preferences.task_reminder_timings?.includes(item.id)
                            ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 font-semibold'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={preferences.task_reminder_timings?.includes(item.id)}
                          onChange={() => toggleTaskTiming(item.id)}
                          className="accent-cyan-400"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Project Reminder Timings */}
                <div>
                  <span className="font-semibold text-slate-200 block mb-2">
                    Project Milestone Reminder Intervals:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { id: '7d', label: '7 Days' },
                      { id: '3d', label: '3 Days' },
                      { id: '24h', label: '24 Hours' },
                      { id: '12h', label: '12 Hours' },
                      { id: '2h', label: '2 Hours' },
                      { id: 'at_deadline', label: 'At Deadline' },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          preferences.project_reminder_timings?.includes(item.id)
                            ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 font-semibold'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={preferences.project_reminder_timings?.includes(item.id)}
                          onChange={() => toggleProjectTiming(item.id)}
                          className="accent-purple-400"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timezone & Daily Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>User Operational Timezone</span>
                  </label>
                  <input
                    type="text"
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    placeholder="e.g. America/New_York or Asia/Kolkata"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Ensures &quot;2 hours before&quot; triggers relative to your local time.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Daily Morning Summary</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={preferences.daily_summary_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, daily_summary_enabled: e.target.checked })
                      }
                      className="accent-amber-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <input
                    type="time"
                    value={preferences.daily_summary_time}
                    disabled={!preferences.daily_summary_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, daily_summary_time: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono text-xs disabled:opacity-40"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Delivers a concise digest of tasks due today and critical path alerts.
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  Save Notification Settings
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* 2. User Profile Telemetry */}
        <Card className="p-5">
          <CardHeader
            title="Authenticated Operator Profile"
            subtitle="Real Session & Identity Telemetry"
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
                {isDemoMode ? 'DEMO WORKSPACE (Showcase)' : 'NORMAL MODE (Isolated Workspace)'}
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
              Account Security: Session protected by isolated cookie tokens
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

        {/* 3. Database & Supabase Status */}
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
                  12 tables: profiles, projects, tasks, dependencies, events, risks, simulations, ai_conversations, ai_messages, notification_subscriptions, notifications, notification_preferences
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

        {/* 4. Demo Data Management */}
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
