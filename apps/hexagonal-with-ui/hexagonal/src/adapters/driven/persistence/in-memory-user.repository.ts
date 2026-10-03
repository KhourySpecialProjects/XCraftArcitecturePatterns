// apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-user.repository.ts
import { randomUUID } from "node:crypto";
import { CreateUserDTO, User } from "../../../core/entities/user.entity.js";
import { UserRepositoryPort } from "../../../core/ports/driven/user-repository.port.js";

export class InMemoryUserRepository implements UserRepositoryPort {
  private users = new Map<string, User>();

  async save(user: CreateUserDTO | User): Promise<User> {
    if ("id" in user && user.id) {
      const existing = this.users.get(user.id);
      const updated: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: existing ? existing.createdAt : new Date(),
      };
      this.users.set(user.id, updated);
      return updated;
    }

    const newUser: User = {
      id: randomUUID(),
      name: user.name,
      email: user.email,
      createdAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }
}
