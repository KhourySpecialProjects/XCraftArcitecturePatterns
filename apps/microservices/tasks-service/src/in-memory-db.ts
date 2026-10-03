// apps/microservices/tasks-service/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  createdAt: Date;
}

export interface ReplicatedUserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class InMemoryTaskStore {
  private tasks = new Map<string, TaskRecord>();
  private users = new Map<string, ReplicatedUserRecord>();

  async upsertUser(user: ReplicatedUserRecord): Promise<void> {
    this.users.set(user.id, user);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.users.has(userId);
  }

  async createTask(data: {
    title: string;
    description?: string;
    assigneeId?: string;
  }): Promise<TaskRecord> {
    const task: TaskRecord = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findTasks(): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findTaskById(id: string): Promise<TaskRecord | null> {
    return this.tasks.get(id) ?? null;
  }

  async updateAssignee(id: string, assigneeId: string): Promise<TaskRecord | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    return task;
  }

  clear(): void {
    this.tasks.clear();
    this.users.clear();
  }
}

export const taskStore = new InMemoryTaskStore();
