'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LifeMapGraph } from '@/components/life-map/LifeMapGraph';
import { GitFork, Info } from 'lucide-react';

export default function LifeMapPage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <GitFork className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Life Map — Dependency Graph
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Interactive topological DAG showing tasks, directional blocks, and dynamic cascading risk propagation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/[0.02] border border-white/10 px-3 py-1.5 rounded-xl">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Click any node to inspect upstream prerequisites & downstream impact</span>
          </div>
        </div>

        {/* Life Map Interactive React Flow Graph Canvas */}
        <LifeMapGraph />
      </div>
    </AppLayout>
  );
}
