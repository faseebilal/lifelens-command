import { Project, Task, Dependency, CalendarEvent } from '@/types/database';

export function getDemoData(): {
  project: Project;
  tasks: Task[];
  dependencies: Dependency[];
  events: CalendarEvent[];
} {
  const now = new Date();
  
  // Base dates relative to current execution time
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0); // Tomorrow 8:00 PM

  const apiDeadline = new Date(now.getTime() + 3.5 * 3600 * 1000); // 3.5 hours from now
  const frontendDeadline = new Date(now.getTime() + 10 * 3600 * 1000); // 10 hours from now
  const testingDeadline = new Date(tomorrow.getTime() - 6 * 3600 * 1000); // Tomorrow 2:00 PM
  const deploymentDeadline = new Date(tomorrow.getTime() - 2 * 3600 * 1000); // Tomorrow 6:00 PM

  const projectId = 'proj-ai-campus-assistant';
  const userId = 'demo-user-commander';

  const project: Project = {
    id: projectId,
    user_id: userId,
    name: 'AI Campus Assistant',
    description: 'Autonomous student schedule and task intelligence platform for the 36h Hackathon.',
    deadline: tomorrow.toISOString(),
    status: 'ACTIVE',
    created_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    updated_at: now.toISOString(),
  };

  const tasks: Task[] = [
    {
      id: 'task-1-db-setup',
      project_id: projectId,
      user_id: userId,
      title: 'Database Setup & Schema',
      description: 'Design PostgreSQL tables, write migrations, configure Supabase RLS policies.',
      status: 'COMPLETED',
      priority: 'HIGH',
      estimated_hours: 3,
      deadline: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      assigned_to: 'Alex (Backend)',
      created_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'task-2-api-dev',
      project_id: projectId,
      user_id: userId,
      title: 'API Development & Endpoints',
      description: 'Implement REST and Edge functions for task dependency traversal and risk calculation.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      estimated_hours: 5.5,
      deadline: apiDeadline.toISOString(), // Only 3.5h remain for 5.5h of work -> HIGH RISK!
      assigned_to: 'Bilal (Lead)',
      created_at: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-3-frontend',
      project_id: projectId,
      user_id: userId,
      title: 'Frontend Integration & UI',
      description: 'Connect React Flow dependency graph, command center dashboard, and live telemetry.',
      status: 'TODO',
      priority: 'HIGH',
      estimated_hours: 4.5,
      deadline: frontendDeadline.toISOString(),
      assigned_to: 'Sarah (UI)',
      created_at: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-4-testing',
      project_id: projectId,
      user_id: userId,
      title: 'System & Regression Testing',
      description: 'Verify risk propagation rules, cycle prevention, and scenario simulations.',
      status: 'TODO',
      priority: 'MEDIUM',
      estimated_hours: 3,
      deadline: testingDeadline.toISOString(),
      assigned_to: 'Jordan (QA)',
      created_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-5-deployment',
      project_id: projectId,
      user_id: userId,
      title: 'Cloud Deployment & Monitoring',
      description: 'Deploy production bundle to Vercel and configure edge health checks.',
      status: 'TODO',
      priority: 'HIGH',
      estimated_hours: 2,
      deadline: deploymentDeadline.toISOString(),
      assigned_to: 'DevOps Team',
      created_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-6-submission',
      project_id: projectId,
      user_id: userId,
      title: 'Final Submission & Demo Recording',
      description: 'Record pitch video, write devpost submission, and freeze release tag.',
      status: 'TODO',
      priority: 'CRITICAL',
      estimated_hours: 1.5,
      deadline: tomorrow.toISOString(),
      assigned_to: 'Full Team',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  const dependencies: Dependency[] = [
    {
      id: 'dep-1-2',
      source_task_id: 'task-1-db-setup',
      target_task_id: 'task-2-api-dev',
      dependency_type: 'BLOCKS',
      created_at: now.toISOString(),
    },
    {
      id: 'dep-2-3',
      source_task_id: 'task-2-api-dev',
      target_task_id: 'task-3-frontend',
      dependency_type: 'BLOCKS',
      created_at: now.toISOString(),
    },
    {
      id: 'dep-3-4',
      source_task_id: 'task-3-frontend',
      target_task_id: 'task-4-testing',
      dependency_type: 'BLOCKS',
      created_at: now.toISOString(),
    },
    {
      id: 'dep-4-5',
      source_task_id: 'task-4-testing',
      target_task_id: 'task-5-deployment',
      dependency_type: 'BLOCKS',
      created_at: now.toISOString(),
    },
    {
      id: 'dep-5-6',
      source_task_id: 'task-5-deployment',
      target_task_id: 'task-6-submission',
      dependency_type: 'BLOCKS',
      created_at: now.toISOString(),
    },
  ];

  // Schedule events with a collision on task-2 deadline
  const collisionStart = new Date(apiDeadline.getTime() - 1.5 * 3600 * 1000);
  const collisionEnd = new Date(apiDeadline.getTime() + 0.5 * 3600 * 1000);

  const events: CalendarEvent[] = [
    {
      id: 'ev-1-class',
      user_id: userId,
      title: 'Web Development Class',
      description: 'Core lecture and lab attendance.',
      start_time: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      end_time: new Date(now.getTime() - 1.5 * 3600 * 1000).toISOString(),
      location: 'Hall B / Zoom',
      created_at: now.toISOString(),
    },
    {
      id: 'ev-2-team-meeting',
      user_id: userId,
      title: 'Team Sync & Blocker Review',
      description: 'Mandatory status review with hackathon mentors.',
      start_time: collisionStart.toISOString(),
      end_time: collisionEnd.toISOString(),
      location: 'Discord Voice #room-3',
      created_at: now.toISOString(),
    },
    {
      id: 'ev-3-project-review',
      user_id: userId,
      title: 'Mid-Hack Project Review',
      description: 'Checkpoint with judging mentors.',
      start_time: new Date(tomorrow.getTime() - 8 * 3600 * 1000).toISOString(),
      end_time: new Date(tomorrow.getTime() - 7 * 3600 * 1000).toISOString(),
      location: 'Main Stage Booth 12',
      created_at: now.toISOString(),
    },
    {
      id: 'ev-4-hackathon-prep',
      user_id: userId,
      title: 'Hackathon Final Expo Setup',
      description: 'Booth audio/visual checks and demo rehearsals.',
      start_time: new Date(tomorrow.getTime() - 3 * 3600 * 1000).toISOString(),
      end_time: new Date(tomorrow.getTime() - 1.5 * 3600 * 1000).toISOString(),
      location: 'Grand Auditorium',
      created_at: now.toISOString(),
    },
  ];

  return { project, tasks, dependencies, events };
}
