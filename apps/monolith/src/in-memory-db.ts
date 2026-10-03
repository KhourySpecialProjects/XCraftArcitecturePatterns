// apps/monolith/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: "todo"
  createdAt: Date;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class InMemoryDatabase {
  private users = new Map<string, UserRecord>();
  private tasks = new Map<string, TaskRecord>();
  private notifications = new Map<string, NotificationRecord>();

  // User Operations
  async createUser(data: { name: string; email: string }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUsers(): Promise<UserRecord[]> {
    return Array.from(this.users.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }

  // Task Operations
  async createTask(data: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
  }): Promise<TaskRecord> {
    const task: TaskRecord = {
      id: randomUUID(),
      title: data.title,
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      status: "todo",
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findTasks(): Promise<Array<TaskRecord & { assignee: UserRecord | null }>> {
    const list = Array.from(this.tasks.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    return list.map((task) => ({
      ...task,
      assignee: task.assigneeId ? this.users.get(task.assigneeId) ?? null : null,
    }));
  }

  async findTaskById(
    id: string
  ): Promise<(TaskRecord & { assignee: UserRecord | null }) | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      ...task,
      assignee: task.assigneeId ? this.users.get(task.assigneeId) ?? null : null,
    };
  }

  async updateTaskAssignee(
    id: string,
    assigneeId: string
  ): Promise<TaskRecord | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    return task;
  }

  // Notification Operations
  async createNotification(data: {
    userId: string;
    message: string;
  }): Promise<NotificationRecord> {
    const notification: NotificationRecord = {
      id: randomUUID(),
      userId: data.userId,
      message: data.message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findNotificationsByUserId(
    userId: string
  ): Promise<NotificationRecord[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(id: string): Promise<NotificationRecord | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;
    notification.read = true;
    this.notifications.set(id, notification);
    return notification;
  }

  clear(): void {
    this.users.clear();
    this.tasks.clear();
    this.notifications.clear();
  }
}

export const inMemoryDb = new InMemoryDatabase();
