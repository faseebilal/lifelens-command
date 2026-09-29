export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DependencyType = 'BLOCKS' | 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number;
  deadline: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export interface Dependency {
  id: string;
  source_task_id: string; // The predecessor (must finish first)
  target_task_id: string; // The successor (depends on source)
  dependency_type: DependencyType;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at: string;
}

export interface RiskAnalysis {
  id: string;
  task_id: string;
  project_id: string;
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  deadline_pressure: number; // 0 - 100
  dependency_impact: number; // 0 - 100
  remaining_work_pressure: number; // 0 - 100
  schedule_conflict_score: number; // 0 - 100
  reason: string;
  why: string;
  affected: string[];
  action: string;
  propagated_from?: string[];
  downstream_tasks: string[];
  created_at: string;
  updated_at: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  type: 'DELAY_TASK' | 'MOVE_DEADLINE' | 'UNAVAILABLE_RESOURCE' | 'ADD_EVENT' | 'CHANGE_PRIORITY';
  payload: {
    taskId?: string;
    delayHours?: number;
    delayDays?: number;
    newDeadline?: string;
    resourceName?: string;
    hoursUnavailable?: number;
    newPriority?: TaskPriority;
    newEvent?: Partial<CalendarEvent>;
  };
}

export interface SimulationResult {
  id: string;
  user_id: string;
  name: string;
  scenario: SimulationScenario;
  original_state: {
    tasks: Task[];
    risks: Record<string, RiskAnalysis>;
    overall_risk_score: number;
    project_health: number;
    critical_count: number;
  };
  simulated_state: {
    tasks: Task[];
    risks: Record<string, RiskAnalysis>;
    overall_risk_score: number;
    project_health: number;
    critical_count: number;
  };
  impact_summary: {
    affected_task_ids: string[];
    affected_task_names: string[];
    downstream_task_ids: string[];
    downstream_task_names: string[];
    risk_score_delta: number;
    project_health_delta: number;
    newly_critical_tasks: string[];
    why_it_matters: string;
    narrative: string;
    recommended_action: string;
    schedule_conflicts?: Array<{ eventTitle: string; taskTitle: string }>;
  };
  created_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  structured_data?: {
    priority_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    why?: string;
    affected_tasks?: string[];
    tactical_action?: string;
    suggested_commands?: string[];
  };
}
