'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { useLifeLens } from '@/lib/store';
import { Project, ProjectStatus } from '@/types/database';
import {
  FolderKanban,
  Plus,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ProjectsPage() {
  const { projects, tasks, createProject, updateProject, deleteProject } = useLifeLens();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    // Default to tomorrow 8 PM
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    setDeadline(d.toISOString().slice(0, 16));
    setStatus('ACTIVE');
    setModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setDescription(p.description);
    setDeadline(new Date(p.deadline).toISOString().slice(0, 16));
    setStatus(p.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProject) {
      updateProject(editingProject.id, {
        name,
        description,
        deadline: new Date(deadline).toISOString(),
        status,
      });
    } else {
      createProject({
        user_id: '',
        name,
        description,
        deadline: new Date(deadline).toISOString(),
        status,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project? All associated tasks will also be deleted.')) {
      deleteProject(id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <FolderKanban className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Projects</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mission directives and scope containers with linked dependency trees.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>

        {/* Empty State or Project Cards Grid */}
        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl glass-panel border border-white/10 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Projects Active</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create your first project container to organize tasks, calculate critical paths, and detect cascading bottlenecks.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const completedCount = projectTasks.filter((t) => t.status === 'COMPLETED').length;
            const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

            return (
              <Card key={project.id} className="relative group overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                          project.status === 'ACTIVE'
                            ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40'
                            : project.status === 'COMPLETED'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-2 truncate">{project.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Edit/Delete Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(project)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      title="Edit project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Tasks Progress:</span>
                    <span className="font-mono text-slate-200">
                      {completedCount}/{projectTasks.length} ({progress}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer info */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Deadline: {formatDate(project.deadline)}</span>
                  </div>

                  <Link
                    href="/tasks"
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <span>View Tasks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>

      {/* Project Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'Create New Project'}
        subtitle="Manage mission deliverables and deadline constraints"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autonomous Delivery Drone"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary mission objectives and key performance indicators..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-slate-300 font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ON_HOLD">ON_HOLD</option>
              </select>
            </div>
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
              {editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
