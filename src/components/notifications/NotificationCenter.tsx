'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  Flame,
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  NotificationRecord,
  NotificationStatus,
  getDetailedNotificationStatus,
  subscribeToPush,
  verifyAndSyncSubscription,
  listenToPermissionChanges,
  sendTestNotification,
} from '@/lib/notifications';
import { formatRelativeTime, cn } from '@/lib/utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-id';

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>('permission_required');
  const [pushLoading, setPushLoading] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Load notifications from server or local storage
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/notifications?userId=${encodeURIComponent(userId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check and refresh notification status
  const checkStatus = useCallback(
    async (isManualCheck = false) => {
      if (typeof window === 'undefined') return;
      if (isManualCheck) setCheckingPushStatus(true);

      try {
        const detail = await getDetailedNotificationStatus(userId);
        if (detail.status === 'blocked') {
          setNotificationStatus('blocked');
          if (isManualCheck) {
            setTestNotice(
              'Notifications are blocked in your browser settings. Toggle permission to Allow in site settings and check again.'
            );
          }
        } else if (detail.status === 'enabled') {
          setNotificationStatus('enabled');
          if (isManualCheck) {
            setTestNotice('Push notifications are active on this device!');
          }
        } else if (detail.status === 'subscription_error') {
          // Attempt automatic repair
          const syncRes = await verifyAndSyncSubscription(userId);
          if (syncRes.success) {
            setNotificationStatus('enabled');
          } else {
            setNotificationStatus('subscription_error');
          }
        } else {
          setNotificationStatus(detail.status);
        }
      } catch (err) {
        console.warn('Notification check error:', err);
      } finally {
        if (isManualCheck) setCheckingPushStatus(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      checkStatus(false);

      const cleanup = listenToPermissionChanges(() => {
        checkStatus(false);
      });
      return () => cleanup();
    }
  }, [isOpen, fetchNotifications, checkStatus]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId: id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllAsRead: true }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(
        `/api/notifications?userId=${encodeURIComponent(
          userId
        )}&notificationId=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    setNotifications([]);
    try {
      await fetch(
        `/api/notifications?userId=${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Enable Browser Web Push Notifications
  const handleEnablePush = async () => {
    if (notificationStatus === 'blocked') {
      setTestNotice(
        'Notifications are blocked in your browser. Click the lock/tune icon next to the URL, change Notifications to Allow, and click Check Notification Status.'
      );
      return;
    }

    setPushLoading(true);
    setTestNotice(null);
    const res = await subscribeToPush(userId);
    setPushLoading(false);

    if (res.success) {
      setNotificationStatus('enabled');
      setTestNotice(
        'Web Push Notifications successfully enabled! Dispatching a test alert...'
      );
      await sendTestNotification(userId);
      fetchNotifications();
      setTimeout(() => setTestNotice(null), 5000);
    } else {
      setNotificationStatus(res.status);
      if (res.status === 'blocked') {
        setTestNotice(
          'Notifications are blocked in your browser settings. Toggle permission to Allow in your browser site settings.'
        );
      } else {
        setTestNotice(res.error || 'Failed to complete push subscription.');
      }
      setTimeout(() => setTestNotice(null), 6000);
    }
  };

  // Send a test alert
  const handleSendTestAlert = async () => {
    setTestNotice('Dispatching real Web Push alert...');
    const res = await sendTestNotification(userId);
    setTestNotice(
      res.message ||
        (res.success
          ? 'Notification dispatched!'
          : res.error || 'Test failed.')
    );
    fetchNotifications();
    setTimeout(() => setTestNotice(null), 5000);
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const filteredList =
    filter === 'UNREAD'
      ? notifications.filter((n) => !n.read_at)
      : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_OVERDUE':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'TASK_DEADLINE':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'PROJECT_DEADLINE':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'REMINDER':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef}
        className="w-full max-w-md h-full bg-[#070A0F] border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Notification Center</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-mono animate-pulse">
                    {unreadCount} unread
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Real-Time Telemetry & Web Push
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close notification center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Web Push Banner: Blocked in Browser */}
        {notificationStatus === 'blocked' && (
          <div className="p-3.5 m-3 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Notifications are blocked in your browser
                </span>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  To receive deadline alerts when LifeLens Command is closed, click the lock/tune icon next to the address bar and change Notifications to <strong className="text-emerald-300">Allow</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => checkStatus(true)}
                disabled={checkingPushStatus}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${checkingPushStatus ? 'animate-spin' : ''}`} />
                <span>{checkingPushStatus ? 'Checking...' : 'Check Notification Status'}</span>
              </button>

              <Link
                href="/settings#notifications"
                onClick={onClose}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                <span>How to unblock</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Web Push Banner: Permission Required */}
        {notificationStatus === 'permission_required' && (
          <div className="p-3.5 m-3 rounded-xl bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-transparent border border-cyan-500/30 space-y-2">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Enable Real Web Push Notifications
                </span>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  Get reminded about critical task deadlines even when LifeLens Command is closed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
              >
                <span>{pushLoading ? 'Prompting...' : 'Enable Notifications'}</span>
              </button>
              <span className="text-[10px] text-slate-400 font-mono">
                Standard Web Push
              </span>
            </div>
          </div>
        )}

        {/* Web Push Banner: Subscription Error */}
        {notificationStatus === 'subscription_error' && (
          <div className="p-3.5 m-3 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Push Subscription Needs Repair
                </span>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  Permission is granted, but push registration needs to be re-synchronized.
                </p>
              </div>
            </div>

            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${pushLoading ? 'animate-spin' : ''}`} />
              <span>{pushLoading ? 'Repairing...' : 'Repair Push Subscription'}</span>
            </button>
          </div>
        )}

        {/* Notice message */}
        {testNotice && (
          <div className="mx-3 p-2.5 rounded-xl bg-slate-900 border border-white/10 text-cyan-200 text-xs flex items-center justify-between">
            <span>{testNotice}</span>
            <button
              onClick={() => setTestNotice(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Bar & Quick Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.01] text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors text-xs',
                filter === 'ALL'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors text-xs',
                filter === 'UNREAD'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400 text-xs">
              <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Fetching notification telemetry...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">All caught up!</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {filter === 'UNREAD'
                  ? 'No unread notifications right now.'
                  : 'No notifications recorded yet. You will be alerted before deadlines and overdue tasks.'}
              </p>
              <button
                onClick={handleSendTestAlert}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 text-xs font-semibold flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Send Test Alert</span>
              </button>
            </div>
          ) : (
            filteredList.map((notif) => {
              const isUnread = !notif.read_at;
              const linkUrl =
                notif.payload?.url ||
                (notif.task_id
                  ? '/tasks'
                  : notif.project_id
                  ? '/projects'
                  : '/dashboard');

              return (
                <div
                  key={notif.id}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all relative group',
                    isUnread
                      ? 'bg-slate-900/90 border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.06)]'
                      : 'bg-white/[0.02] border-white/5 text-slate-400'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={cn(
                            'text-xs font-bold truncate',
                            isUnread ? 'text-white' : 'text-slate-300'
                          )}
                        >
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E5FF] flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-500 border-t border-white/5">
                        <span>
                          {formatRelativeTime(
                            notif.scheduled_for || notif.created_at
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={linkUrl}
                            onClick={onClose}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>

                          {isUnread && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-slate-400 hover:text-emerald-400 p-0.5"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="text-slate-500 hover:text-red-400 p-0.5"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-white/10 bg-slate-950 flex items-center justify-between text-xs">
          <button
            onClick={handleSendTestAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-semibold transition-colors border border-white/10"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Send Test Alert</span>
          </button>

          <Link
            href="/settings#notifications"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-white underline transition-colors"
          >
            Notification Settings
          </Link>
        </div>
      </div>
    </div>
  );
};
