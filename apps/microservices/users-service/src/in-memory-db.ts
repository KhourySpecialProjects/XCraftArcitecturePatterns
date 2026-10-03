// apps/microservices/users-service/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class InMemoryUserStore {
  private users = new Map<string, UserRecord>();

  async create(data: { name: string; email: string }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findAll(): Promise<UserRecord[]> {
    return Array.from(this.users.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }

  clear(): void {
    this.users.clear();
  }
}

export const userStore = new InMemoryUserStore();
