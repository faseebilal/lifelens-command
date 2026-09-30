'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  Lock,
} from 'lucide-react';
import {
  NotificationStatus,
  getNotificationPermission,
  getDetailedNotificationStatus,
  subscribeToPush,
  unsubscribeFromPush,
  verifyAndSyncSubscription,
  listenToPermissionChanges,
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
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('permission_required');
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(false);
  const [showUnblockGuide, setShowUnblockGuide] = useState(false);
  const [pushNotice, setPushNotice] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

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

  // Verify and sync push subscription state
  const refreshNotificationStatus = useCallback(
    async (isManualCheck = false) => {
      if (typeof window === 'undefined') return;

      if (isManualCheck) {
        setCheckingPushStatus(true);
      }

      try {
        const detail = await getDetailedNotificationStatus(userId);
        setPushPermission(detail.permission);

        if (detail.status === 'unsupported') {
          setNotificationStatus('unsupported');
          if (isManualCheck) {
            setPushNotice({
              type: 'info',
              message: 'Web Push Notifications are not supported by this browser engine.',
            });
          }
          return;
        }

        if (detail.status === 'blocked') {
          setNotificationStatus('blocked');
          setShowUnblockGuide(true);
          if (isManualCheck) {
            setPushNotice({
              type: 'info',
              message:
                'Notifications are blocked in your browser settings. Follow the steps below to change permission to Allow, then click Check Notification Status.',
            });
          }
          return;
        }

        if (detail.status === 'permission_required') {
          setNotificationStatus('permission_required');
          setShowUnblockGuide(false);
          if (isManualCheck) {
            setPushNotice({
              type: 'info',
              message: 'Browser permission is in default state. Click "Enable Notifications" below to activate.',
            });
          }
          return;
        }

        // Permission is granted: automatically verify service worker, PushSubscription, and Supabase sync
        const syncResult = await verifyAndSyncSubscription(userId);

        if (syncResult.success) {
          setNotificationStatus('enabled');
          setPreferences((prev) => ({ ...prev, push_enabled: true }));
          setShowUnblockGuide(false);
          if (isManualCheck) {
            setPushNotice({
              type: 'success',
              message: 'Notification status verified: Real Web Push is active and connected to Supabase!',
            });
          }
        } else {
          setNotificationStatus('subscription_error');
          if (isManualCheck) {
            setPushNotice({
              type: 'error',
              message: syncResult.error || 'Push subscription could not be established.',
            });
          }
        }
      } catch (err: any) {
        console.warn('Status verification notice:', err);
      } finally {
        if (isManualCheck) {
          setCheckingPushStatus(false);
        }
      }
    },
    [userId]
  );

  // Check push support and register permission change listener on mount
  useEffect(() => {
    refreshNotificationStatus(false);

    // Listen to real-time browser permission changes (e.g. user toggling site settings icon in URL bar)
    const cleanup = listenToPermissionChanges(() => {
      refreshNotificationStatus(false);
    });

    return () => cleanup();
  }, [refreshNotificationStatus]);

  // Load preferences from API
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

  // Enable Notifications Action
  const handleEnablePush = async () => {
    // If permission is denied, do not repeatedly call requestPermission()
    if (notificationStatus === 'blocked') {
      setShowUnblockGuide(true);
      setPushNotice({
        type: 'info',
        message:
          'Notifications are currently blocked in your browser. Follow the step-by-step guide below to toggle permission to Allow.',
      });
      return;
    }

    setPushLoading(true);
    setPushNotice(null);

    const res = await subscribeToPush(userId);
    setPushLoading(false);

    if (res.success) {
      setNotificationStatus('enabled');
      setPushPermission('granted');
      setPreferences((prev) => ({ ...prev, push_enabled: true }));
      setPushNotice({
        type: 'success',
        message: 'Web Push Notifications successfully enabled! Dispatching a test alert...',
      });
      await sendTestNotification(userId);
      setTimeout(() => setPushNotice(null), 6000);
    } else {
      setPushPermission(getNotificationPermission());
      setNotificationStatus(res.status);

      if (res.status === 'blocked') {
        setShowUnblockGuide(true);
        setPushNotice({
          type: 'info',
          message:
            'Notifications were blocked in your browser. LifeLens Command will continue functioning normally. To enable push alerts, follow the steps below.',
        });
      } else if (res.status === 'permission_required') {
        setPushNotice({
          type: 'info',
          message: 'Permission prompt was dismissed. Click "Enable Notifications" whenever you are ready.',
        });
      } else {
        setPushNotice({
          type: 'error',
          message: res.error || 'Failed to complete push notification setup.',
        });
      }
    }
  };

  // Disable Notifications Action
  const handleDisablePush = async () => {
    setPushLoading(true);
    await unsubscribeFromPush(userId);
    setPushLoading(false);
    setPreferences((prev) => ({ ...prev, push_enabled: false }));
    setNotificationStatus('permission_required');
    setPushNotice({
      type: 'info',
      message: 'Push notifications have been disabled on this browser.',
    });
    setTimeout(() => setPushNotice(null), 4000);
  };

  // Send Test Push
  const handleSendTestPush = async () => {
    setPushNotice({ type: 'info', message: 'Dispatching test Web Push alert...' });
    const res = await sendTestNotification(userId);
    if (res.success) {
      setPushNotice({
        type: 'success',
        message: res.message || 'Test notification sent to your registered device!',
      });
    } else {
      setPushNotice({
        type: 'error',
        message: res.error || 'Failed to dispatch test notification.',
      });
    }
    setTimeout(() => setPushNotice(null), 6000);
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

  // Badge configuration based on actual browser state
  const getStatusBadgeConfig = () => {
    switch (notificationStatus) {
      case 'enabled':
        return {
          label: 'NOTIFICATIONS ENABLED',
          badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_#34D399]',
          description:
            'Browser push notifications are active. You will receive deadline alerts even when LifeLens Command is closed.',
        };
      case 'blocked':
        return {
          label: 'NOTIFICATIONS BLOCKED',
          badgeClass: 'bg-amber-950/80 text-amber-400 border-amber-500/40',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_#FBBF24]',
          description:
            'Notifications are blocked in your browser settings. LifeLens Command will operate normally, but background push alerts require permission.',
        };
      case 'permission_required':
        return {
          label: 'PERMISSION REQUIRED',
          badgeClass: 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40',
          dotClass: 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]',
          description:
            'Browser notification permission has not been requested yet. Click Enable Notifications to activate background alerts.',
        };
      case 'subscription_error':
        return {
          label: 'SUBSCRIPTION ERROR',
          badgeClass: 'bg-red-950/80 text-red-400 border-red-500/40',
          dotClass: 'bg-red-400 shadow-[0_0_8px_#EF4444]',
          description:
            'Permission is granted, but push registration needs repair. Click Repair Subscription to re-synchronize with the server.',
        };
      case 'unsupported':
      default:
        return {
          label: 'UNSUPPORTED BROWSER',
          badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
          dotClass: 'bg-slate-500',
          description:
            'Web Push API is not supported on this browser engine. In-app notifications will continue to work normally in the notification center.',
        };
    }
  };

  const statusConfig = getStatusBadgeConfig();

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

                    {/* Accurate Real-Time Device Status */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-slate-400">Device Status:</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 max-w-xl leading-relaxed">
                      {statusConfig.description}
                    </p>
                  </div>

                  {/* Dynamic Action Buttons Based on Permission State */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {notificationStatus === 'enabled' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDisablePush}
                          disabled={pushLoading}
                          className="px-3.5 py-2 rounded-xl font-bold text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-all disabled:opacity-50"
                        >
                          {pushLoading ? 'Disabling...' : 'Disable Push'}
                        </button>

                        <button
                          type="button"
                          onClick={handleSendTestPush}
                          className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Send test push notification"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Send Test Alert</span>
                        </button>
                      </>
                    ) : notificationStatus === 'blocked' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => refreshNotificationStatus(true)}
                          disabled={checkingPushStatus}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${checkingPushStatus ? 'animate-spin' : ''}`} />
                          <span>{checkingPushStatus ? 'Checking...' : 'Check Notification Status'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowUnblockGuide(!showUnblockGuide)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{showUnblockGuide ? 'Hide Instructions' : 'How to Unblock'}</span>
                        </button>
                      </>
                    ) : notificationStatus === 'subscription_error' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleEnablePush}
                          disabled={pushLoading}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${pushLoading ? 'animate-spin' : ''}`} />
                          <span>{pushLoading ? 'Repairing...' : 'Repair Push Subscription'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => refreshNotificationStatus(true)}
                          disabled={checkingPushStatus}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-colors"
                        >
                          <span>Check Status</span>
                        </button>
                      </>
                    ) : notificationStatus === 'permission_required' ? (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{pushLoading ? 'Prompting...' : 'Enable Notifications'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-2 rounded-xl bg-slate-800 text-slate-500 border border-slate-700 text-xs font-medium cursor-not-allowed"
                      >
                        Unsupported on Browser
                      </button>
                    )}

                    {notificationStatus !== 'blocked' && (
                      <button
                        type="button"
                        onClick={() => refreshNotificationStatus(true)}
                        disabled={checkingPushStatus}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                        title="Re-check browser notification permission"
                        aria-label="Refresh notification status"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingPushStatus ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Notice Feedback */}
                {pushNotice && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                      pushNotice.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        : pushNotice.type === 'error'
                        ? 'bg-red-950/80 border-red-500/40 text-red-300'
                        : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    {pushNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : pushNotice.type === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span>{pushNotice.message}</span>
                    </div>
                  </div>
                )}

                {/* Clear Step-by-Step Unblock Guide for Android Chrome and Desktop Chrome */}
                {showUnblockGuide && notificationStatus === 'blocked' && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs">
                        How to Unblock Notifications in Your Browser
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Your browser currently has notifications set to &quot;Block&quot; for this website. Because of browser security, websites cannot automatically overturn a blocked setting. Follow these quick steps to allow alerts:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      {/* Desktop Instructions */}
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                        <span className="font-bold text-cyan-300 block text-[11px]">
                          💻 Desktop Chrome / Edge / Brave
                        </span>
                        <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 pl-1">
                          <li>
                            Click the <strong className="text-white">site settings icon</strong> (tune 🎛️ or lock 🔒) to the left of the URL in the address bar.
                          </li>
                          <li>
                            Find <strong className="text-white">Notifications</strong> and toggle it from <span className="text-amber-300">Block</span> to <span className="text-emerald-300">Allow</span>.
                          </li>
                          <li>
                            Return here and click <strong className="text-white">Check Notification Status</strong> below.
                          </li>
                        </ol>
                      </div>

                      {/* Android / Mobile Instructions */}
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                        <span className="font-bold text-purple-300 block text-[11px]">
                          📱 Android Chrome / Mobile Browser
                        </span>
                        <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 pl-1">
                          <li>
                            Tap the <strong className="text-white">tune / lock icon</strong> next to the web address or Chrome menu (⋮) $\rightarrow$ <strong className="text-white">Permissions</strong>.
                          </li>
                          <li>
                            Tap <strong className="text-white">Notifications</strong> and switch to <span className="text-emerald-300">Allow</span>.
                          </li>
                          <li>
                            Tap <strong className="text-white">Check Notification Status</strong> below to start receiving alerts.
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400">
                        LifeLens Command remains completely functional in your browser even if notifications are blocked.
                      </span>

                      <button
                        type="button"
                        onClick={() => refreshNotificationStatus(true)}
                        disabled={checkingPushStatus}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3 h-3 ${checkingPushStatus ? 'animate-spin' : ''}`} />
                        <span>Check Notification Status Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Task Deadlines */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white flex items-center gap-1.5 cursor-pointer">
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
                    <label className="font-semibold text-white flex items-center gap-1.5 cursor-pointer">
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
                    <label className="font-semibold text-white flex items-center gap-1.5 cursor-pointer">
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
                    <label className="font-semibold text-white flex items-center gap-1.5 cursor-pointer">
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
                    <label className="text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer">
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
