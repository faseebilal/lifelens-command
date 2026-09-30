'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Trash2,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Radio,
} from 'lucide-react';
import {
  DiagnosticLog,
  getAuthTraces,
  subscribeToAuthTraces,
  clearAuthTraces,
  getServiceWorkerDiagnostic,
  unregisterAllServiceWorkers,
  testSupabaseConnectivity,
  ServiceWorkerDiagnostic,
} from '@/lib/auth-diagnostic';
import { isSupabaseConfigured, getSupabaseHost } from '@/lib/supabase/client';

export const AuthDiagnosticModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [swDiag, setSwDiag] = useState<ServiceWorkerDiagnostic | null>(null);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const supabaseHost = getSupabaseHost();
  const supabaseActive = isSupabaseConfigured();

  const refreshSW = async () => {
    const diag = await getServiceWorkerDiagnostic();
    setSwDiag(diag);
  };

  useEffect(() => {
    refreshSW();
    const unsubscribe = subscribeToAuthTraces((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleUnregisterSW = async () => {
    setIsUnregistering(true);
    setActionNotice(null);
    const result = await unregisterAllServiceWorkers();
    setIsUnregistering(false);
    setActionNotice(result.message);
    await refreshSW();
    setTimeout(() => setActionNotice(null), 8000);
  };

  const handlePingSupabase = async () => {
    setIsPinging(true);
    setActionNotice(null);
    const result = await testSupabaseConnectivity();
    setIsPinging(false);
    setActionNotice(
      result.success
        ? `Connectivity verified! Supabase is reachable (${result.durationMs}ms)`
        : `Connectivity failed: ${result.message}`
    );
    setTimeout(() => setActionNotice(null), 8000);
  };

  return (
    <div className="w-full mt-4 pt-3 border-t border-white/10 text-xs">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refreshSW();
        }}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors border border-white/5"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] font-semibold">
            Mobile Auth Diagnostic & SW Inspector
          </span>
          {logs.some((l) => l.type === 'ERROR') && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3 rounded-xl bg-[#03060A] border border-cyan-500/20 space-y-3 animate-in fade-in duration-150">
          {/* Status Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-400 block font-mono">Supabase Auth Host:</span>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span className="font-bold text-white truncate">{supabaseHost}</span>
              </div>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  supabaseActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                }`}
              >
                {supabaseActive ? 'CONFIGURED & ACTIVE' : 'LOCAL OPERATOR FALLBACK'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-400 block font-mono">Service Worker State:</span>
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-purple-400" />
                <span className="font-bold text-white">
                  {swDiag?.registrationCount ? `${swDiag.registrationCount} Active` : 'None Active'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                Controller: {swDiag?.controller ? 'Active (/sw.js)' : 'None'}
              </span>
            </div>
          </div>

          {/* Quick Troubleshooting Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleUnregisterSW}
              disabled={isUnregistering}
              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Unregister all Service Workers to test if SW is blocking auth requests"
            >
              <Trash2 className="w-3 h-3" />
              <span>{isUnregistering ? 'Unregistering...' : 'Unregister SW & Clear Cache'}</span>
            </button>

            <button
              type="button"
              onClick={handlePingSupabase}
              disabled={isPinging}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Pinging...' : 'Ping Supabase Host'}</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={clearAuthTraces}
                className="px-2 py-1 text-slate-500 hover:text-slate-300 text-[10px]"
              >
                Clear logs
              </button>
            )}
          </div>

          {actionNotice && (
            <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-200 text-[11px]">
              {actionNotice}
            </div>
          )}

          {/* Live Telemetry Log Console */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>LIVE TELEMETRY TRACE:</span>
              <span>{logs.length} events</span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg bg-black/60 border border-white/5 p-2 font-mono text-[10px] space-y-1.5">
              {logs.length === 0 ? (
                <span className="text-slate-600 block italic">
                  No auth requests recorded yet. Attempt login or registration to view live trace.
                </span>
              ) : (
                logs.map((log) => {
                  const colorClass =
                    log.type === 'ERROR'
                      ? 'text-red-400'
                      : log.type === 'RECEIVED'
                      ? 'text-emerald-400'
                      : log.type === 'SENT'
                      ? 'text-cyan-400'
                      : 'text-slate-300';

                  return (
                    <div key={log.id} className="border-b border-white/[0.03] pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">[{log.timestamp}]</span>
                        <span className={`font-bold ${colorClass}`}>[{log.type}]</span>
                        <span className="text-slate-200">{log.title}</span>
                      </div>
                      {log.details && (
                        <pre className="text-[9px] text-slate-400 pl-4 mt-0.5 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
