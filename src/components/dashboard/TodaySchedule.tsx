'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import { Calendar, Clock, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const TodaySchedule: React.FC = () => {
  const { tasks, events } = useLifeLens();

  // Combine tasks deadlines and events into chronological timeline
  const timelineItems: Array<{
    id: string;
    type: 'EVENT' | 'TASK';
    title: string;
    time: Date;
    timeLabel: string;
    details: string;
    isCollision?: boolean;
  }> = [];

  events.forEach((ev) => {
    timelineItems.push({
      id: ev.id,
      type: 'EVENT',
      title: ev.title,
      time: new Date(ev.start_time),
      timeLabel: `${formatDate(ev.start_time)}`,
      details: ev.location || ev.description,
    });
  });

  tasks.forEach((t) => {
    if (t.status !== 'COMPLETED') {
      timelineItems.push({
        id: t.id,
        type: 'TASK',
        title: `Deadline: ${t.title}`,
        time: new Date(t.deadline),
        timeLabel: `${formatDate(t.deadline)}`,
        details: `${t.estimated_hours}h work remaining • ${t.assigned_to}`,
      });
    }
  });

  // Sort chronologically
  timelineItems.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Detect basic collisions (items within 45 minutes of each other)
  for (let i = 0; i < timelineItems.length - 1; i++) {
    const diffMins = Math.abs(timelineItems[i + 1].time.getTime() - timelineItems[i].time.getTime()) / (1000 * 60);
    if (diffMins <= 60) {
      timelineItems[i].isCollision = true;
      timelineItems[i + 1].isCollision = true;
    }
  }

  const previewItems = timelineItems.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader
        title="Schedule & Deadlines"
        subtitle="Chronological feed with automated collision and overlap detection"
        icon={<Calendar className="w-5 h-5 text-cyan-400" />}
        action={
          <Link
            href="/calendar"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <span>Full Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {previewItems.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="font-medium text-slate-300">No scheduled deadlines or events</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Create tasks or calendar events to populate your timeline.</p>
        </div>
      ) : (
        <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
          {previewItems.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3 text-xs">
              {/* Dot */}
              <div
                className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                  item.isCollision
                    ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B] ring-2 ring-amber-500/40'
                    : item.type === 'EVENT'
                    ? 'bg-cyan-400'
                    : 'bg-blue-400'
                }`}
              />

              <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{item.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{item.timeLabel}</span>
                </div>

                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>{item.details}</span>
                  {item.isCollision && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                      <AlertCircle className="w-3 h-3" />
                      <span>Collision Detected</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
