'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useLifeLens } from '@/lib/store';
import { TaskNode, TaskNodeData } from './TaskNode';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import { DependencyEngine } from '@/lib/dependency-engine';
import {
  Filter,
  Maximize2,
  Minimize2,
  Route,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeTypes: any = {
  taskNode: TaskNode,
};

export const LifeMapGraph: React.FC = () => {
  const {
    tasks,
    dependencies,
    risks,
    selectedTaskId,
    setSelectedTaskId,
    createDependency,
  } = useLifeLens();

  const [highlightCriticalPath, setHighlightCriticalPath] = useState(false);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  const depEngine = useMemo(() => new DependencyEngine(tasks, dependencies), [tasks, dependencies]);
  const criticalPath = useMemo(() => depEngine.getCriticalPath(), [depEngine]);

  // Determine connected upstream and downstream sets for the selected node
  const { upstreamSet, downstreamSet } = useMemo(() => {
    if (!selectedTaskId) return { upstreamSet: new Set<string>(), downstreamSet: new Set<string>() };
    const up = depEngine.getAllUpstream(selectedTaskId).map((u) => u.task.id);
    const down = depEngine.getAllDownstream(selectedTaskId).map((d) => d.task.id);
    return {
      upstreamSet: new Set(up),
      downstreamSet: new Set(down),
    };
  }, [selectedTaskId, depEngine]);

  // Compute Layout positions for nodes
  // Layout in a clean top-to-bottom layered flow based on topological levels
  const initialNodes: any[] = useMemo(() => {
    const topo = depEngine.getTopologicalOrder();
    const levelMap = new Map<string, number>();

    // Calculate level of each task (longest path from any root)
    topo.forEach((t) => {
      const directUp = depEngine.getDirectUpstream(t.id);
      if (directUp.length === 0) {
        levelMap.set(t.id, 0);
      } else {
        let maxL = 0;
        directUp.forEach((u) => {
          maxL = Math.max(maxL, (levelMap.get(u.id) || 0) + 1);
        });
        levelMap.set(t.id, maxL);
      }
    });

    // Group tasks by level
    const levelGroups: Map<number, string[]> = new Map();
    tasks.forEach((t) => {
      const lvl = levelMap.get(t.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(t.id);
    });

    return tasks.map((task) => {
      const lvl = levelMap.get(task.id) || 0;
      const tasksInLevel = levelGroups.get(lvl) || [task.id];
      const indexInLevel = tasksInLevel.indexOf(task.id);
      const totalInLevel = tasksInLevel.length;

      // Center nodes in each layer
      const xSpacing = 300;
      const ySpacing = 160;
      const xOffset = (indexInLevel - (totalInLevel - 1) / 2) * xSpacing + 400;
      const yOffset = lvl * ySpacing + 50;

      const risk = risks[task.id];
      const isSelected = selectedTaskId === task.id;
      const isUp = upstreamSet.has(task.id);
      const isDown = downstreamSet.has(task.id);

      return {
        id: task.id,
        type: 'taskNode',
        position: { x: xOffset, y: yOffset },
        data: {
          task,
          risk,
          isSelected,
          isUpstream: isUp,
          isDownstream: isDown,
        },
      };
    });
  }, [tasks, depEngine, risks, selectedTaskId, upstreamSet, downstreamSet]);

  // Compute Edges
  const initialEdges: Edge[] = useMemo(() => {
    return dependencies.map((dep) => {
      const isCritical =
        (risks[dep.source_task_id]?.risk_score || 0) >= 61 ||
        (risks[dep.target_task_id]?.risk_score || 0) >= 61;

      const isChainSelected =
        selectedTaskId === dep.source_task_id ||
        selectedTaskId === dep.target_task_id ||
        (upstreamSet.has(dep.source_task_id) && upstreamSet.has(dep.target_task_id)) ||
        (downstreamSet.has(dep.source_task_id) && downstreamSet.has(dep.target_task_id));

      const isCriticalPathEdge =
        highlightCriticalPath &&
        criticalPath.includes(dep.source_task_id) &&
        criticalPath.includes(dep.target_task_id);

      let strokeColor = '#334155';
      let strokeWidth = 2;
      let animated = false;

      if (isCriticalPathEdge) {
        strokeColor = '#00E5FF';
        strokeWidth = 3.5;
        animated = true;
      } else if (isChainSelected) {
        strokeColor = '#F59E0B';
        strokeWidth = 3;
        animated = true;
      } else if (isCritical) {
        strokeColor = '#EF4444';
        strokeWidth = 2.5;
        animated = true;
      }

      return {
        id: dep.id,
        source: dep.source_task_id,
        target: dep.target_task_id,
        type: 'smoothstep',
        animated,
        style: {
          stroke: strokeColor,
          strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 16,
          height: 16,
        },
      };
    });
  }, [dependencies, risks, selectedTaskId, upstreamSet, downstreamSet, highlightCriticalPath, criticalPath]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync internal state when dependencies or layout changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        createDependency(params.source, params.target);
      }
    },
    [createDependency]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedTaskId(node.id);
    },
    [setSelectedTaskId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedTaskId(null);
  }, [setSelectedTaskId]);

  return (
    <div className="relative w-full h-[78vh] rounded-2xl border border-white/10 overflow-hidden bg-[#070A0F] flex shadow-2xl">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
        {/* Critical Path Toggle */}
        <button
          onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            highlightCriticalPath
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
          )}
        >
          <Route className="w-3.5 h-3.5 text-cyan-400" />
          <span>Critical Path</span>
        </button>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> Critical
          </span>
        </div>
      </div>

      {/* Main React Flow Graph Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
        >
          <Background color="#1E293B" gap={24} size={1} />
          <Controls className="!bg-slate-900 !border-white/10 !rounded-xl !fill-white [&>button]:!bg-slate-900 [&>button]:!border-white/10 [&>button]:!text-slate-300" />
          <MiniMap
            nodeColor={(n) => {
              const r = risks[n.id]?.risk_score || 0;
              if (r >= 61) return '#EF4444';
              if (r >= 31) return '#F59E0B';
              return '#10B981';
            }}
            maskColor="rgba(7, 10, 15, 0.7)"
            className="!bg-slate-950/80 !border-white/10 !rounded-xl hidden sm:block"
          />
        </ReactFlow>
      </div>

      {/* Node Detail Inspection Drawer */}
      {selectedTaskId && (
        <NodeDetailDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};
