// apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-notification.repository.ts
import { randomUUID } from "node:crypto";
import { Notification } from "../../../core/entities/notification.entity.js";
import {
  CreateNotificationDTO,
  NotificationRepositoryPort,
} from "../../../core/ports/driven/notification-repository.port.js";

export class InMemoryNotificationRepository implements NotificationRepositoryPort {
  private notifications = new Map<string, Notification>();

  async save(
    notification: CreateNotificationDTO | Notification
  ): Promise<Notification> {
    if ("id" in notification && notification.id) {
      const existing = this.notifications.get(notification.id);
      const updated: Notification = {
        id: notification.id,
        userId: notification.userId,
        message: notification.message,
        read: notification.read,
        createdAt: existing ? existing.createdAt : new Date(),
      };
      this.notifications.set(notification.id, updated);
      return updated;
    }

    const newNotification: Notification = {
      id: randomUUID(),
      userId: notification.userId,
      message: notification.message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) ?? null;
  }

  async update(notification: Notification): Promise<Notification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }
}
