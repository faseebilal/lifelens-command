'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Project,
  Task,
  Dependency,
  CalendarEvent,
  RiskAnalysis,
  SimulationResult,
  SimulationScenario,
  AIMessage,
} from '@/types/database';
import { getDemoData } from './demo-data';
import { RiskEngine } from './risk-engine';
import { DependencyEngine } from './dependency-engine';
import { SimulationEngine } from './simulation-engine';
import { useAuth } from './auth';
import { supabase, isSupabaseConfigured } from './supabase/client';

export interface SavedSimulation {
  id: string;
  user_id: string;
  name: string;
  scenario: SimulationScenario;
  original_state: any;
  simulated_state: any;
  impact_summary: any;
  created_at: string;
}

interface LifeLensContextType {
  // State
  projects: Project[];
  tasks: Task[];
  dependencies: Dependency[];
  events: CalendarEvent[];
  risks: Record<string, RiskAnalysis>;
  currentSimulation: SimulationResult | null;
  activeScenario: SimulationScenario | null;
  savedSimulations: SavedSimulation[];
  aiMessages: AIMessage[];
  isLoading: boolean;
  selectedTaskId: string | null;
  isDemoMode: boolean;
  hasData: boolean;
  dbError: string | null;

  // Health & Summary Metrics
  overallRiskScore: number;
  projectHealth: number;
  criticalRisksCount: number;
  mediumRisksCount: number;
  tasksAtRiskCount: number;
  activeProjectsCount: number;
  upcomingDeadlinesCount: number;

  // Actions
  setSelectedTaskId: (id: string | null) => void;
  createProject: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createDependency: (sourceTaskId: string, targetTaskId: string) => Promise<{ success: boolean; error?: string }>;
  deleteDependency: (id: string) => Promise<void>;

  createEvent: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;

  // Simulation & Chaos
  runSimulation: (scenario: SimulationScenario) => SimulationResult;
  applySimulation: () => Promise<void>;
  discardSimulation: () => void;
  saveCurrentSimulation: (name?: string) => Promise<SavedSimulation | null>;
  deleteSavedSimulation: (id: string) => Promise<void>;

  // AI
  addAIMessage: (message: Omit<AIMessage, 'id' | 'created_at'>) => void;
  clearAIChat: () => void;

  // Demo Reset
  resetToDemo: () => void;
}

const LifeLensContext = createContext<LifeLensContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'lifelens_demo_workspace_state_v3';

// Utility to generate valid UUID v4 for PostgreSQL tables or demo keys
function generateId(isDemo: boolean, prefix?: string): string {
  if (isDemo && prefix) {
    return `${prefix}-demo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const LifeLensProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemoMode, isAuthenticated } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<SimulationScenario | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initialize state based on mode
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setDbError(null);

    const loadWorkspace = async () => {
      // 1. DEMO MODE: Isolated sample workspace (AI Campus Assistant)
      if (isDemoMode) {
        if (typeof window !== 'undefined') {
          const cachedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
          if (cachedDemo) {
            try {
              const parsed = JSON.parse(cachedDemo);
              if (parsed.tasks && parsed.tasks.length > 0 && isMounted) {
                setProjects(parsed.projects || []);
                setTasks(parsed.tasks || []);
                setDependencies(parsed.dependencies || []);
                setEvents(parsed.events || []);
                setSavedSimulations(parsed.savedSimulations || []);
                setAiMessages(parsed.aiMessages || []);
                setSelectedTaskId('task-2-api-dev');
                setIsLoading(false);
                return;
              }
            } catch (err) {
              console.error('Demo parse error:', err);
            }
          }
        }

        // Initialize fresh canonical demo dataset
        const demo = getDemoData();
        if (isMounted) {
          setProjects([demo.project]);
          setTasks(demo.tasks);
          setDependencies(demo.dependencies);
          setEvents(demo.events);
          setSavedSimulations([]);
          setSelectedTaskId('task-2-api-dev');
          setAiMessages([
            {
              id: 'msg-demo-init',
              role: 'assistant',
              content:
                'Welcome to the LifeLens Command Demo Workspace. API Development is currently flagged at critical risk (88/100) due to 5.5h of work against a 3.5h deadline, directly threatening 4 downstream deliverables. What would you like to explore or simulate?',
              created_at: new Date().toISOString(),
              structured_data: {
                priority_level: 'CRITICAL',
                why: 'Workload of 5.5h exceeds remaining time buffer (3.5h left).',
                affected_tasks: ['Frontend Integration & UI', 'System & Regression Testing', 'Cloud Deployment & Monitoring', 'Final Submission & Demo Recording'],
                tactical_action: 'Stagger API endpoints and deliver mock interfaces to unblock frontend engineering.',
                suggested_commands: [
                  'What should I prioritize today?',
                  'What happens if I delay API Development?',
                  'Which task has the highest downstream impact?',
                ],
              },
            },
          ]);
          setIsLoading(false);
        }
        return;
      }

      // 2. NORMAL AUTHENTICATED USER: Real Supabase data only
      if (user && user.id) {
        if (isSupabaseConfigured()) {
          try {
            const [
              projRes,
              tasksRes,
              depsRes,
              eventsRes,
              simsRes,
            ] = await Promise.all([
              supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
              supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
              supabase.from('dependencies').select('*'),
              supabase.from('events').select('*').eq('user_id', user.id).order('start_time', { ascending: true }),
              supabase.from('simulations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            ]);

            // Check for errors explicitly - NEVER swallow Supabase errors
            if (projRes.error) throw new Error(`Projects query error: ${projRes.error.message}`);
            if (tasksRes.error) throw new Error(`Tasks query error: ${tasksRes.error.message}`);
            if (depsRes.error) throw new Error(`Dependencies query error: ${depsRes.error.message}`);
            if (eventsRes.error) throw new Error(`Events query error: ${eventsRes.error.message}`);
            if (simsRes.error) throw new Error(`Simulations query error: ${simsRes.error.message}`);

            if (isMounted) {
              const loadedTasks: Task[] = tasksRes.data || [];
              const loadedProjects: Project[] = projRes.data || [];
              const loadedDeps: Dependency[] = depsRes.data || [];
              const loadedEvents: CalendarEvent[] = eventsRes.data || [];

              // Parse saved simulations
              const loadedSims: SavedSimulation[] = (simsRes.data || []).map((s: any) => ({
                id: s.id,
                user_id: s.user_id,
                name: s.name,
                scenario: typeof s.scenario === 'string' ? { id: s.id, name: s.name, description: s.scenario, type: 'DELAY_TASK', payload: {} } : s.scenario,
                original_state: s.original_state,
                simulated_state: s.simulated_state,
                impact_summary: typeof s.impact_summary === 'string' ? { narrative: s.impact_summary, affected_task_ids: [], risk_score_delta: 0, project_health_delta: 0, newly_critical_tasks: [], recommended_action: '' } : s.impact_summary,
                created_at: s.created_at,
              }));

              setProjects(loadedProjects);
              setTasks(loadedTasks);
              setDependencies(loadedDeps);
              setEvents(loadedEvents);
              setSavedSimulations(loadedSims);
              setSelectedTaskId(loadedTasks.length > 0 ? loadedTasks[0].id : null);
              setAiMessages([]);
              setIsLoading(false);
              return;
            }
          } catch (err: any) {
            console.error('Supabase query error:', err.message);
            if (isMounted) {
              setDbError(err.message || 'Failed to load workspace data from Supabase.');
              // Do NOT silently fall back to localStorage - keep workspace clean
              setProjects([]);
              setTasks([]);
              setDependencies([]);
              setEvents([]);
              setSavedSimulations([]);
              setSelectedTaskId(null);
              setIsLoading(false);
            }
            return;
          }
        } else {
          // Supabase not configured: Load isolated workspace for this authenticated operator
          if (typeof window !== 'undefined') {
            const userStorageKey = `lifelens_workspace_${user.id}`;
            const cachedUserWorkspace = localStorage.getItem(userStorageKey);
            if (cachedUserWorkspace) {
              try {
                const parsed = JSON.parse(cachedUserWorkspace);
                if (isMounted) {
                  setProjects(parsed.projects || []);
                  setTasks(parsed.tasks || []);
                  setDependencies(parsed.dependencies || []);
                  setEvents(parsed.events || []);
                  setSavedSimulations(parsed.savedSimulations || []);
                  setAiMessages(parsed.aiMessages || []);
                  setSelectedTaskId(parsed.tasks?.length > 0 ? parsed.tasks[0].id : null);
                  setIsLoading(false);
                  return;
                }
              } catch (err) {
                console.error('Operator workspace parse error:', err);
              }
            }
          }

          if (isMounted) {
            setProjects([]);
            setTasks([]);
            setDependencies([]);
            setEvents([]);
            setSavedSimulations([]);
            setSelectedTaskId(null);
            setIsLoading(false);
          }
          return;
        }
      }

      // 3. UNAUTHENTICATED / LOGGED OUT: Clean empty state
      if (isMounted) {
        setProjects([]);
        setTasks([]);
        setDependencies([]);
        setEvents([]);
        setSavedSimulations([]);
        setAiMessages([]);
        setSelectedTaskId(null);
        setIsLoading(false);
      }
    };

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [user, isDemoMode]);

  // Persist workspace state: Demo Mode to DEMO_STORAGE_KEY, Local Operator to user-specific key
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;

    if (isDemoMode) {
      try {
        localStorage.setItem(
          DEMO_STORAGE_KEY,
          JSON.stringify({
            projects,
            tasks,
            dependencies,
            events,
            savedSimulations,
            aiMessages,
          })
        );
      } catch (err) {
        console.error('Failed to save demo workspace state:', err);
      }
    } else if (user && user.id && !isSupabaseConfigured()) {
      try {
        localStorage.setItem(
          `lifelens_workspace_${user.id}`,
          JSON.stringify({
            projects,
            tasks,
            dependencies,
            events,
            savedSimulations,
            aiMessages,
          })
        );
      } catch (err) {
        console.error('Failed to save operator workspace state:', err);
      }
    }
  }, [projects, tasks, dependencies, events, savedSimulations, aiMessages, isLoading, isDemoMode, user]);

  // Dynamic Risk Calculation (Deterministic, transparent)
  const risks = useMemo(() => {
    if (tasks.length === 0) return {};
    const engine = new RiskEngine(tasks, dependencies, events);
    return engine.calculateAllRisks();
  }, [tasks, dependencies, events]);

  // Health Metrics (Consistent across all components)
  const healthMetrics = useMemo(() => {
    if (tasks.length === 0) {
      return {
        overallRiskScore: 0,
        healthScore: 100,
        criticalCount: 0,
        mediumCount: 0,
        lowCount: 0,
      };
    }
    const engine = new RiskEngine(tasks, dependencies, events);
    return engine.calculateProjectHealth(risks);
  }, [tasks, dependencies, events, risks]);

  // Tasks at risk count (Score >= 31)
  const tasksAtRiskCount = useMemo(() => {
    return Object.values(risks).filter((r) => r.risk_score >= 31).length;
  }, [risks]);

  // Active Projects count
  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === 'ACTIVE').length;
  }, [projects]);

  // Upcoming Deadlines count (due in next 48 hours and not completed)
  const upcomingDeadlinesCount = useMemo(() => {
    const now = Date.now();
    const in48h = now + 48 * 3600 * 1000;
    return tasks.filter((t) => {
      if (t.status === 'COMPLETED') return false;
      const d = new Date(t.deadline).getTime();
      return d >= now && d <= in48h;
    }).length;
  }, [tasks]);

  const hasData = useMemo(() => {
    return projects.length > 0 || tasks.length > 0;
  }, [projects.length, tasks.length]);

  // ==========================================
  // PROJECT CRUD (With Valid UUID and Error Propagation)
  // ==========================================
  const createProject = useCallback(
    async (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> => {
      const activeUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      const newId = generateId(isDemoMode, 'proj');

      const newProj: Project = {
        ...data,
        id: newId,
        user_id: activeUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProjects((prev) => [newProj, ...prev]);

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('projects').insert([newProj]);
        if (error) {
          // Rollback optimistic state
          setProjects((prev) => prev.filter((p) => p.id !== newId));
          console.error('Supabase project insert error:', error.message);
          throw new Error(`Database error saving project: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action: 'PROJECT_CREATED',
          projectId: newProj.id,
          deadline: newProj.deadline,
        }),
      }).catch(() => {});

      return newProj;
    },
    [user, isDemoMode]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      const updatedDate = new Date().toISOString();
      const previous = projects.find((p) => p.id === id);

      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: updatedDate } : p))
      );

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase
          .from('projects')
          .update({ ...updates, updated_at: updatedDate })
          .eq('id', id);

        if (error) {
          // Rollback
          if (previous) {
            setProjects((prev) => prev.map((p) => (p.id === id ? previous : p)));
          }
          console.error('Supabase project update error:', error.message);
          throw new Error(`Database error updating project: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action:
            updates.status === 'COMPLETED'
              ? 'PROJECT_COMPLETED'
              : updates.deadline
              ? 'PROJECT_DEADLINE_CHANGED'
              : 'PROJECT_UPDATED',
          projectId: id,
          deadline: updates.deadline,
        }),
      }).catch(() => {});
    },
    [projects, user, isDemoMode]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const previousProjects = projects;
      const previousTasks = tasks;

      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.filter((t) => t.project_id !== id));

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
          // Rollback
          setProjects(previousProjects);
          setTasks(previousTasks);
          console.error('Supabase project delete error:', error.message);
          throw new Error(`Database error deleting project: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action: 'PROJECT_DELETED',
          projectId: id,
        }),
      }).catch(() => {});
    },
    [projects, tasks, user, isDemoMode]
  );

  // ==========================================
  // TASK CRUD (With Valid UUID and Error Propagation)
  // ==========================================
  const createTask = useCallback(
    async (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> => {
      const activeUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      const newId = generateId(isDemoMode, 'task');

      const newTask: Task = {
        ...data,
        id: newId,
        user_id: activeUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);
      if (!selectedTaskId) {
        setSelectedTaskId(newId);
      }

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('tasks').insert([newTask]);
        if (error) {
          // Rollback optimistic state
          setTasks((prev) => prev.filter((t) => t.id !== newId));
          console.error('Supabase task insert error:', error.message);
          throw new Error(`Database error saving task: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action: 'TASK_CREATED',
          taskId: newTask.id,
          deadline: newTask.deadline,
        }),
      }).catch(() => {});

      return newTask;
    },
    [user, isDemoMode, selectedTaskId]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const updatedDate = new Date().toISOString();
      const previous = tasks.find((t) => t.id === id);

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: updatedDate } : t))
      );

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase
          .from('tasks')
          .update({ ...updates, updated_at: updatedDate })
          .eq('id', id);

        if (error) {
          // Rollback
          if (previous) {
            setTasks((prev) => prev.map((t) => (t.id === id ? previous : t)));
          }
          console.error('Supabase task update error:', error.message);
          throw new Error(`Database error updating task: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action:
            updates.status === 'COMPLETED'
              ? 'TASK_COMPLETED'
              : updates.deadline
              ? 'TASK_DEADLINE_CHANGED'
              : 'TASK_UPDATED',
          taskId: id,
          deadline: updates.deadline,
          status: updates.status,
        }),
      }).catch(() => {});
    },
    [tasks, user, isDemoMode]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const previousTasks = tasks;
      const previousDeps = dependencies;

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDependencies((prev) =>
        prev.filter((d) => d.source_task_id !== id && d.target_task_id !== id)
      );
      if (selectedTaskId === id) {
        const remaining = tasks.filter((t) => t.id !== id);
        setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
      }

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
          // Rollback
          setTasks(previousTasks);
          setDependencies(previousDeps);
          console.error('Supabase task delete error:', error.message);
          throw new Error(`Database error deleting task: ${error.message}`);
        }
      }

      // Synchronize notification schedule non-blockingly
      const currentUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          action: 'TASK_DELETED',
          taskId: id,
        }),
      }).catch(() => {});
    },
    [tasks, dependencies, selectedTaskId, user, isDemoMode]
  );

  // ==========================================
  // DEPENDENCY CRUD (Cycle Detection & Validation)
  // ==========================================
  const createDependency = useCallback(
    async (sourceTaskId: string, targetTaskId: string) => {
      if (sourceTaskId === targetTaskId) {
        return { success: false, error: 'A task cannot depend on itself.' };
      }

      // Check if duplicate exists
      const exists = dependencies.some(
        (d) => d.source_task_id === sourceTaskId && d.target_task_id === targetTaskId
      );
      if (exists) {
        return { success: false, error: 'This dependency link already exists.' };
      }

      // Cycle check (Deadlock prevention)
      const depEngine = new DependencyEngine(tasks, dependencies);
      if (depEngine.wouldCreateCycle(sourceTaskId, targetTaskId)) {
        return {
          success: false,
          error: 'Circular dependency loop detected: This connection would cause a deadlock.',
        };
      }

      const newId = generateId(isDemoMode, 'dep');
      const newDep: Dependency = {
        id: newId,
        source_task_id: sourceTaskId,
        target_task_id: targetTaskId,
        dependency_type: 'BLOCKS',
        created_at: new Date().toISOString(),
      };

      setDependencies((prev) => [...prev, newDep]);

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('dependencies').insert([newDep]);
        if (error) {
          // Rollback optimistic state
          setDependencies((prev) => prev.filter((d) => d.id !== newId));
          console.error('Supabase dependency insert error:', error.message);
          return { success: false, error: `Database error: ${error.message}` };
        }
      }
      return { success: true };
    },
    [dependencies, tasks, isDemoMode, user]
  );

  const deleteDependency = useCallback(
    async (id: string) => {
      const previous = dependencies;
      setDependencies((prev) => prev.filter((d) => d.id !== id));

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('dependencies').delete().eq('id', id);
        if (error) {
          setDependencies(previous);
          console.error('Supabase dependency delete error:', error.message);
          throw new Error(`Database error deleting dependency: ${error.message}`);
        }
      }
    },
    [dependencies, isDemoMode, user]
  );

  // ==========================================
  // EVENTS CRUD (With Valid UUID and Error Propagation)
  // ==========================================
  const createEvent = useCallback(
    async (data: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent> => {
      const activeUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      const newId = generateId(isDemoMode, 'ev');

      const newEv: CalendarEvent = {
        ...data,
        id: newId,
        user_id: activeUserId,
        created_at: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, newEv]);

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('events').insert([newEv]);
        if (error) {
          setEvents((prev) => prev.filter((e) => e.id !== newId));
          console.error('Supabase event insert error:', error.message);
          throw new Error(`Database error creating event: ${error.message}`);
        }
      }
      return newEv;
    },
    [user, isDemoMode]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const previous = events;
      setEvents((prev) => prev.filter((e) => e.id !== id));

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) {
          setEvents(previous);
          console.error('Supabase event delete error:', error.message);
          throw new Error(`Database error deleting event: ${error.message}`);
        }
      }
    },
    [events, isDemoMode, user]
  );

  // ==========================================
  // WHAT-IF SIMULATION (Non-Destructive until Explicit Apply)
  // ==========================================
  const runSimulation = useCallback(
    (scenario: SimulationScenario): SimulationResult => {
      const simEngine = new SimulationEngine(tasks, dependencies, events);
      const result = simEngine.simulate(scenario);
      setCurrentSimulation(result);
      setActiveScenario(scenario);
      return result;
    },
    [tasks, dependencies, events]
  );

  const applySimulation = useCallback(async () => {
    if (!currentSimulation) return;
    const simulatedTasks = currentSimulation.simulated_state.tasks;
    setTasks(simulatedTasks);

    if (!isDemoMode && isSupabaseConfigured() && user) {
      try {
        await Promise.all(
          simulatedTasks.map((t) =>
            supabase
              .from('tasks')
              .update({
                deadline: t.deadline,
                estimated_hours: t.estimated_hours,
                priority: t.priority,
                status: t.status,
                updated_at: new Date().toISOString(),
              })
              .eq('id', t.id)
          )
        );
      } catch (err: any) {
        console.error('Failed to sync applied simulation to Supabase:', err.message);
      }
    }

    setCurrentSimulation(null);
    setActiveScenario(null);
  }, [currentSimulation, isDemoMode, user]);

  const discardSimulation = useCallback(() => {
    setCurrentSimulation(null);
    setActiveScenario(null);
  }, []);

  const saveCurrentSimulation = useCallback(
    async (name?: string): Promise<SavedSimulation | null> => {
      if (!currentSimulation) return null;
      const activeUserId = user?.id || (isDemoMode ? 'demo-user-id' : 'anonymous-user');
      const newId = generateId(isDemoMode, 'sim');

      const saved: SavedSimulation = {
        id: newId,
        user_id: activeUserId,
        name: name || currentSimulation.name || 'Hypothetical Scenario',
        scenario: currentSimulation.scenario,
        original_state: currentSimulation.original_state,
        simulated_state: currentSimulation.simulated_state,
        impact_summary: currentSimulation.impact_summary,
        created_at: new Date().toISOString(),
      };

      setSavedSimulations((prev) => [saved, ...prev]);

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const scenarioLabel = typeof saved.scenario === 'object'
          ? (saved.scenario.name || saved.scenario.type || 'Custom Scenario')
          : String(saved.scenario);

        const narrativeText = typeof saved.impact_summary === 'object'
          ? (saved.impact_summary.narrative || saved.name)
          : String(saved.impact_summary);

        const { error } = await supabase.from('simulations').insert([
          {
            id: saved.id,
            user_id: saved.user_id,
            name: saved.name,
            scenario: scenarioLabel,
            original_state: saved.original_state,
            simulated_state: saved.simulated_state,
            impact_summary: narrativeText,
            created_at: saved.created_at,
          },
        ]);

        if (error) {
          setSavedSimulations((prev) => prev.filter((s) => s.id !== newId));
          console.error('Supabase simulation save error:', error.message);
          throw new Error(`Database error saving simulation: ${error.message}`);
        }
      }
      return saved;
    },
    [currentSimulation, user, isDemoMode]
  );

  const deleteSavedSimulation = useCallback(
    async (id: string) => {
      const previous = savedSimulations;
      setSavedSimulations((prev) => prev.filter((s) => s.id !== id));

      if (!isDemoMode && isSupabaseConfigured() && user) {
        const { error } = await supabase.from('simulations').delete().eq('id', id);
        if (error) {
          setSavedSimulations(previous);
          console.error('Supabase simulation delete error:', error.message);
          throw new Error(`Database error deleting simulation: ${error.message}`);
        }
      }
    },
    [savedSimulations, isDemoMode, user]
  );

  // ==========================================
  // AI CHAT
  // ==========================================
  const addAIMessage = useCallback((message: Omit<AIMessage, 'id' | 'created_at'>) => {
    const newMsg: AIMessage = {
      ...message,
      id: generateId(true, 'msg'),
      created_at: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, newMsg]);
  }, []);

  const clearAIChat = useCallback(() => {
    setAiMessages([]);
  }, []);

  // ==========================================
  // DEMO RESET
  // ==========================================
  const resetToDemo = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    const demo = getDemoData();
    setProjects([demo.project]);
    setTasks(demo.tasks);
    setDependencies(demo.dependencies);
    setEvents(demo.events);
    setSelectedTaskId('task-2-api-dev');
    setCurrentSimulation(null);
    setActiveScenario(null);
    setSavedSimulations([]);
    setAiMessages([
      {
        id: generateId(true, 'msg'),
        role: 'assistant',
        content:
          'Workspace reset to canonical demo baseline: AI Campus Assistant loaded with 6 tasks and critical risk detection on API Development.',
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const value = {
    projects,
    tasks,
    dependencies,
    events,
    risks,
    currentSimulation,
    activeScenario,
    savedSimulations,
    aiMessages,
    isLoading,
    selectedTaskId,
    isDemoMode,
    hasData,
    dbError,
    overallRiskScore: healthMetrics.overallRiskScore,
    projectHealth: healthMetrics.healthScore,
    criticalRisksCount: healthMetrics.criticalCount,
    mediumRisksCount: healthMetrics.mediumCount,
    tasksAtRiskCount,
    activeProjectsCount,
    upcomingDeadlinesCount,
    setSelectedTaskId,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    createDependency,
    deleteDependency,
    createEvent,
    deleteEvent,
    runSimulation,
    applySimulation,
    discardSimulation,
    saveCurrentSimulation,
    deleteSavedSimulation,
    addAIMessage,
    clearAIChat,
    resetToDemo,
  };

  return <LifeLensContext.Provider value={value}>{children}</LifeLensContext.Provider>;
};

export function useLifeLens() {
  const context = useContext(LifeLensContext);
  if (!context) {
    throw new Error('useLifeLens must be used within a LifeLensProvider');
  }
  return context;
}
