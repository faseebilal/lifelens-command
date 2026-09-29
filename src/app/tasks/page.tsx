'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { useLifeLens } from '@/lib/store';
import { Task, TaskPriority, TaskStatus } from '@/types/database';
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Calendar,
  Edit2,
  Trash2,
  AlertTriangle,
  GitFork,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { StatusBadge, PriorityBadge, RiskBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function TasksPage() {
  const {
    tasks,
    projects,
    risks,
    dependencies,
    createTask,
    updateTask,
    deleteTask,
    setSelectedTaskId,
  } = useLifeLens();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState(3);
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('Alex');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setEstimatedHours(3);
    const d = new Date();
    d.setHours(d.getHours() + 6);
    setDeadline(d.toISOString().slice(0, 16));
    setAssignedTo('Alex');
    setProjectId(projects[0]?.id || '');
    setModalOpen(true);
  };

  const openEditModal = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description);
    setStatus(t.status);
    setPriority(t.priority);
    setEstimatedHours(t.estimated_hours);
    setDeadline(new Date(t.deadline).toISOString().slice(0, 16));
    setAssignedTo(t.assigned_to);
    setProjectId(t.project_id);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title,
        description,
        status,
        priority,
        estimated_hours: Number(estimatedHours),
        deadline: new Date(deadline).toISOString(),
        assigned_to: assignedTo,
        project_id: projectId,
      });
    } else {
      createTask({
        user_id: '',
        project_id: projectId || projects[0]?.id || 'default-proj',
        title,
        description,
        status,
        priority,
        estimated_hours: Number(estimatedHours),
        deadline: new Date(deadline).toISOString(),
        assigned_to: assignedTo,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this task and all its dependencies?')) {
      deleteTask(id);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Tasks</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Discrete units of work mapped into topological execution nodes.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <span className="ml-auto text-slate-500 font-mono text-[11px]">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-12 rounded-2xl glass-panel border border-white/10 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Tasks In Workspace</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create discrete work units with estimated hours and deadlines to start building the topological dependency DAG.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create First Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
            const risk = risks[task.id];
            const outgoingCount = dependencies.filter((d) => d.source_task_id === task.id).length;
            const incomingCount = dependencies.filter((d) => d.target_task_id === task.id).length;

            return (
              <Card
                key={task.id}
                className="group p-4 transition-all duration-200 hover:border-cyan-500/40"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      {risk && <RiskBadge level={risk.risk_level} score={risk.risk_score} />}
                      <span className="text-[10px] font-mono text-slate-500">ID: {task.id.slice(0, 8)}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{task.estimated_hours}h estimated</span>
                      </span>

                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Due {formatDate(task.deadline)} ({formatRelativeTime(task.deadline)})</span>
                      </span>

                      <span className="flex items-center gap-1.5 text-slate-300">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>{task.assigned_to}</span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                        <GitFork className="w-3 h-3" />
                        <span>
                          {incomingCount} in / {outgoingCount} out
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link
                      href="/life-map"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-cyan-400 border border-white/10 flex items-center gap-1"
                      title="Inspect node in Life Map graph"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>Graph</span>
                    </Link>

                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 border border-white/5 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>

      {/* Task Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        subtitle="Configure workload estimations and deadline telemetry"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth Flow"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specifications, criteria, and blocker notes..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Assigned Person</label>
              <input
                type="text"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Name or handle"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Deadline</label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors"
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
