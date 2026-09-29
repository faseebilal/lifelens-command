'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { useLifeLens } from '@/lib/store';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CalendarEvent } from '@/types/database';

export default function CalendarPage() {
  const { events, tasks, projects, createEvent, deleteEvent } = useLifeLens();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    const now = new Date();
    setStartTime(now.toISOString().slice(0, 16));
    const later = new Date(now.getTime() + 1.5 * 3600 * 1000);
    setEndTime(later.toISOString().slice(0, 16));
    setLocation('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createEvent({
      user_id: '',
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      location,
    });
    setModalOpen(false);
  };

  // Compile combined chronological schedule
  const scheduleItems: Array<{
    id: string;
    type: 'EVENT' | 'TASK_DEADLINE' | 'PROJECT_DEADLINE';
    title: string;
    startTime: Date;
    endTime: Date;
    details: string;
    location?: string;
  }> = [];

  events.forEach((ev) => {
    scheduleItems.push({
      id: ev.id,
      type: 'EVENT',
      title: ev.title,
      startTime: new Date(ev.start_time),
      endTime: new Date(ev.end_time),
      details: ev.description,
      location: ev.location,
    });
  });

  tasks.forEach((t) => {
    const tDeadline = new Date(t.deadline);
    scheduleItems.push({
      id: t.id,
      type: 'TASK_DEADLINE',
      title: `Task Deadline: ${t.title}`,
      startTime: tDeadline,
      endTime: new Date(tDeadline.getTime() + 30 * 60 * 1000),
      details: `${t.estimated_hours}h estimated work remaining (${t.assigned_to})`,
    });
  });

  projects.forEach((p) => {
    const pDeadline = new Date(p.deadline);
    scheduleItems.push({
      id: p.id,
      type: 'PROJECT_DEADLINE',
      title: `Project Milestone: ${p.name}`,
      startTime: pDeadline,
      endTime: new Date(pDeadline.getTime() + 30 * 60 * 1000),
      details: p.description,
    });
  });

  scheduleItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Detect Collisions
  const collisions: Array<{ itemA: string; itemB: string; time: string }> = [];
  for (let i = 0; i < scheduleItems.length; i++) {
    for (let j = i + 1; j < scheduleItems.length; j++) {
      const a = scheduleItems[i];
      const b = scheduleItems[j];
      const diffMinutes = Math.abs(a.startTime.getTime() - b.startTime.getTime()) / (1000 * 60);

      if (diffMinutes <= 60) {
        collisions.push({
          itemA: a.title,
          itemB: b.title,
          time: formatDate(a.startTime),
        });
      }
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Calendar & Schedule</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Temporal mapping of classes, meetings, and hard task deadlines with automated collision analysis.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>

        {/* Collision Detection Banner */}
        {collisions.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>SCHEDULE COLLISIONS DETECTED ({collisions.length})</span>
            </div>
            <p className="text-slate-300">
              The following events and delivery deadlines directly overlap within a 1-hour window:
            </p>
            <div className="space-y-1.5 mt-2">
              {collisions.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-amber-500/20 text-xs"
                >
                  <span className="font-semibold text-white">
                    ⚠️ {c.itemA} <span className="text-amber-400">vs</span> {c.itemB}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{c.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule List */}
        <Card className="p-5">
          <CardHeader
            title="Chronological Schedule Feed"
            subtitle="Real-time events, task deliverables, and hackathon judging checkpoints"
            icon={<Clock className="w-5 h-5 text-cyan-400" />}
          />

          <div className="space-y-3">
            {scheduleItems.map((item) => {
              const isEvent = item.type === 'EVENT';
              const isTask = item.type === 'TASK_DEADLINE';

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isEvent
                          ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/30'
                          : isTask
                          ? 'bg-purple-950/70 text-purple-400 border border-purple-500/30'
                          : 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-slate-400 mt-1">{item.details}</p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="text-cyan-400 font-mono font-medium">
                          {formatDate(item.startTime)}
                        </span>
                        {item.location && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-purple-400" />
                            <span>{item.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEvent && (
                    <button
                      onClick={() => deleteEvent(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Calendar Event"
        subtitle="Add classes, syncs, or presentations to monitor time collisions"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Event Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mentor Checkpoint Review"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting goals or preparation notes..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Location / Link</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Discord Voice #room-1 or Room 204"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
              Add Event
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
