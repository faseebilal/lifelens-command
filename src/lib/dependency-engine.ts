import { Task, Dependency } from '@/types/database';

export interface GraphNode {
  task: Task;
  upstream: string[]; // Task IDs this node depends on
  downstream: string[]; // Task IDs that depend on this node
}

export class DependencyEngine {
  private adjacencyList: Map<string, Set<string>> = new Map(); // source -> targets
  private reverseAdjacencyList: Map<string, Set<string>> = new Map(); // target -> sources
  private tasksMap: Map<string, Task> = new Map();

  constructor(tasks: Task[], dependencies: Dependency[]) {
    // Initialize tasks map
    tasks.forEach((t) => this.tasksMap.set(t.id, t));

    // Initialize adjacency maps
    tasks.forEach((t) => {
      this.adjacencyList.set(t.id, new Set());
      this.reverseAdjacencyList.set(t.id, new Set());
    });

    // Populate edges (source_task_id -> target_task_id)
    // Target depends on Source
    dependencies.forEach((d) => {
      if (this.adjacencyList.has(d.source_task_id) && this.reverseAdjacencyList.has(d.target_task_id)) {
        this.adjacencyList.get(d.source_task_id)!.add(d.target_task_id);
        this.reverseAdjacencyList.get(d.target_task_id)!.add(d.source_task_id);
      }
    });
  }

  /**
   * Detects if adding an edge source -> target would create a cycle
   */
  public wouldCreateCycle(sourceTaskId: string, targetTaskId: string): boolean {
    if (sourceTaskId === targetTaskId) return true;

    // A cycle is created if there is already a path from targetTaskId to sourceTaskId
    const visited = new Set<string>();
    const queue = [targetTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === sourceTaskId) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = this.adjacencyList.get(current);
        if (neighbors) {
          for (const next of neighbors) {
            if (!visited.has(next)) {
              queue.push(next);
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Get direct downstream tasks (tasks that directly depend on this task)
   */
  public getDirectDownstream(taskId: string): Task[] {
    const targets = this.adjacencyList.get(taskId) || new Set();
    return Array.from(targets)
      .map((id) => this.tasksMap.get(id))
      .filter((t): t is Task => !!t);
  }

  /**
   * Get direct upstream tasks (tasks this task directly depends on)
   */
  public getDirectUpstream(taskId: string): Task[] {
    const sources = this.reverseAdjacencyList.get(taskId) || new Set();
    return Array.from(sources)
      .map((id) => this.tasksMap.get(id))
      .filter((t): t is Task => !!t);
  }

  /**
   * Get all downstream tasks recursively using Breadth-First Search
   */
  public getAllDownstream(taskId: string): { task: Task; depth: number }[] {
    const results: { task: Task; depth: number }[] = [];
    const visited = new Set<string>([taskId]);
    const queue: { id: string; depth: number }[] = [{ id: taskId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const neighbors = this.adjacencyList.get(id) || new Set();

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const task = this.tasksMap.get(neighborId);
          if (task) {
            results.push({ task, depth: depth + 1 });
            queue.push({ id: neighborId, depth: depth + 1 });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get all upstream tasks recursively
   */
  public getAllUpstream(taskId: string): { task: Task; depth: number }[] {
    const results: { task: Task; depth: number }[] = [];
    const visited = new Set<string>([taskId]);
    const queue: { id: string; depth: number }[] = [{ id: taskId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const sources = this.reverseAdjacencyList.get(id) || new Set();

      for (const sourceId of sources) {
        if (!visited.has(sourceId)) {
          visited.add(sourceId);
          const task = this.tasksMap.get(sourceId);
          if (task) {
            results.push({ task, depth: depth + 1 });
            queue.push({ id: sourceId, depth: depth + 1 });
          }
        }
      }
    }

    return results;
  }

  /**
   * Returns topological order of all tasks in the graph
   */
  public getTopologicalOrder(): Task[] {
    const inDegree: Map<string, number> = new Map();
    this.tasksMap.forEach((_, id) => inDegree.set(id, 0));

    this.adjacencyList.forEach((targets) => {
      targets.forEach((targetId) => {
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      });
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const result: Task[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const task = this.tasksMap.get(id);
      if (task) result.push(task);

      const neighbors = this.adjacencyList.get(id) || new Set();
      neighbors.forEach((nextId) => {
        const nextDeg = (inDegree.get(nextId) || 1) - 1;
        inDegree.set(nextId, nextDeg);
        if (nextDeg === 0) queue.push(nextId);
      });
    }

    return result;
  }

  /**
   * Find critical path (longest duration path through the DAG to the final deadline)
   */
  public getCriticalPath(): string[] {
    const topo = this.getTopologicalOrder();
    if (topo.length === 0) return [];

    const dist: Map<string, number> = new Map();
    const prev: Map<string, string | null> = new Map();

    topo.forEach((t) => {
      dist.set(t.id, t.estimated_hours);
      prev.set(t.id, null);
    });

    for (const u of topo) {
      const neighbors = this.adjacencyList.get(u.id) || new Set();
      const currentDist = dist.get(u.id) || 0;

      for (const vId of neighbors) {
        const v = this.tasksMap.get(vId);
        if (v) {
          const newDist = currentDist + v.estimated_hours;
          if (newDist > (dist.get(vId) || 0)) {
            dist.set(vId, newDist);
            prev.set(vId, u.id);
          }
        }
      }
    }

    // Find the task with maximum accumulated distance
    let maxDist = -1;
    let endNodeId: string | null = null;
    dist.forEach((d, id) => {
      if (d > maxDist) {
        maxDist = d;
        endNodeId = id;
      }
    });

    const path: string[] = [];
    let curr: string | null = endNodeId;
    while (curr) {
      path.unshift(curr);
      curr = prev.get(curr) || null;
    }

    return path;
  }
}
