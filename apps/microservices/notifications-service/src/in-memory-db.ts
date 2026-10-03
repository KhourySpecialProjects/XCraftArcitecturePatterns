// apps/microservices/notifications-service/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface NotificationRecord {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class InMemoryNotificationStore {
  private notifications = new Map<string, NotificationRecord>();

  async create(data: { userId: string; message: string }): Promise<NotificationRecord> {
    const item: NotificationRecord = {
      id: randomUUID(),
      userId: data.userId,
      message: data.message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(item.id, item);
    return item;
  }

  async findByUserId(userId: string): Promise<NotificationRecord[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(id: string): Promise<NotificationRecord | null> {
    const item = this.notifications.get(id);
    if (!item) return null;
    item.read = true;
    this.notifications.set(id, item);
    return item;
  }

  clear(): void {
    this.notifications.clear();
  }
}

export const notificationStore = new InMemoryNotificationStore();
