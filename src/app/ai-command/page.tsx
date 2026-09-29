'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import {
  Bot,
  Send,
  Terminal,
  Sparkles,
  Zap,
  Flame,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { RiskBadge } from '@/components/common/Badge';

export default function AICommandPage() {
  const {
    tasks,
    projects,
    dependencies,
    events,
    risks,
    criticalRisksCount,
    currentSimulation,
    aiMessages,
    addAIMessage,
    clearAIChat,
  } = useLifeLens();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedCommands = tasks.length > 0
    ? [
        'What should I prioritize today?',
        'What is putting my project at risk?',
        `What happens if I delay ${tasks[0].title}?`,
        'Which task has the highest downstream impact?',
        'What events do I have today?',
      ]
    : [
        'What should I prioritize today?',
        'What is my biggest risk?',
        'What events do I have today?',
      ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, isProcessing]);

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || inputPrompt).trim();
    if (!query || isProcessing) return;

    // Append user message
    addAIMessage({
      role: 'user',
      content: query,
    });
    setInputPrompt('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context: {
            projects,
            tasks,
            dependencies,
            events,
            risks,
            simulation: currentSimulation,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addAIMessage({
          role: 'assistant',
          content: data.content,
          structured_data: data.structured_data,
        });
      } else {
        throw new Error('Server returned an error');
      }
    } catch {
      // Dynamic fallback without hallucinating fake tasks
      if (tasks.length === 0) {
        addAIMessage({
          role: 'assistant',
          content:
            '**PRIORITY ASSESSMENT**: You do not have any active tasks yet.\n\n' +
            '**ROOT CAUSE / WHY**: Your workspace is currently empty.\n\n' +
            '**DOWNSTREAM IMPACT**: Zero downstream risks detected.\n\n' +
            '**TACTICAL ACTION**: Create a project and add tasks to start tracking priorities and dependencies.',
          structured_data: {
            priority_level: 'LOW',
            why: 'Workspace is empty',
            affected_tasks: [],
            tactical_action: 'Create your first project and task.',
          },
        });
      } else {
        const topTask = tasks[0];
        addAIMessage({
          role: 'assistant',
          content:
            `**PRIORITY ASSESSMENT**: Focus attention on **${topTask.title}**.\n\n` +
            `**ROOT CAUSE / WHY**: Active deliverable with ${topTask.estimated_hours}h estimated work remaining.\n\n` +
            `**DOWNSTREAM IMPACT**: Direct predecessor to downstream tasks in the execution graph.\n\n` +
            `**TACTICAL ACTION**: Maintain focus velocity to safeguard the deadline milestone.`,
          structured_data: {
            priority_level: 'MEDIUM',
            why: 'Active task execution',
            affected_tasks: [topTask.title],
            tactical_action: 'Proceed with task execution.',
          },
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AppLayout>
      <div className="h-[84vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Terminal className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                AI Command Center
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational advisor with real-time awareness of tasks, critical path, and consequence chains.
            </p>
          </div>

          <button
            onClick={clearAIChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white border border-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>

        {/* Telemetry Status Bar */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 font-mono">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ACTIVE CONTEXT:
            </span>
            <span className="text-slate-300">{tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{dependencies.length} {dependencies.length === 1 ? 'Dependency' : 'Dependencies'}</span>
            <span className="text-slate-500">•</span>
            <span className={criticalRisksCount > 0 ? "text-red-400" : "text-emerald-400"}>
              {criticalRisksCount} Critical {criticalRisksCount === 1 ? 'Bottleneck' : 'Bottlenecks'}
            </span>
          </div>

          <div className="text-slate-400 text-[11px]">
            MODEL: <span className="text-slate-200">LIFELENS INTELLIGENCE CORE v2.4</span>
          </div>
        </div>

        {/* Main Terminal Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-black/40 border border-white/5">
          {aiMessages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-2 ${
                    isUser
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/40 rounded-br-sm'
                      : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-bl-sm shadow-xl'
                  }`}
                >
                  {/* Assistant response formatting */}
                  <div className="whitespace-pre-line text-xs font-sans text-slate-200 space-y-1">
                    {msg.content}
                  </div>

                  {/* Structured Data Badges if available */}
                  {msg.structured_data?.suggested_commands && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Quick Follow-up Directives:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.structured_data.suggested_commands.map((cmd, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(cmd)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-white text-[11px] transition-colors"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    YOU
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-slate-400 font-mono text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Evaluating critical path & cascading risk vectors...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase flex-shrink-0">SUGGESTIONS:</span>
          {suggestedCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(cmd)}
              className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{cmd}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder="Ask LifeLens about priorities, risks, downstream impact, or simulations..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isProcessing}
            className="flex items-center justify-center px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
