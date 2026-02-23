import { ChildProcess } from "child_process";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  total: number;
  message: string;
  result: string | null;
  error: string | null;
  process?: ChildProcess;
  createdAt: number;
  updatedAt: number;
}

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private nextId = 1;

  createTask(name: string): Task {
    const id = `task_${Date.now()}_${this.nextId++}`;
    const task: Task = {
      id,
      name,
      status: "pending",
      progress: 0,
      total: 100,
      message: "Task created",
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.tasks.set(id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates);
      task.updatedAt = Date.now();
    }
  }

  completeTask(id: string, result: string): void {
    this.updateTask(id, {
      status: "completed",
      result,
      progress: 100,
      message: "Task completed successfully"
    });
  }

  failTask(id: string, error: string): void {
    this.updateTask(id, {
      status: "failed",
      error,
      message: "Task failed"
    });
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}

export const taskManager = new TaskManager();
