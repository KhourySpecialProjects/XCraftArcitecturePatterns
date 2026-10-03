// apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-task.repository.ts
import { randomUUID } from "node:crypto";
import { CreateTaskDTO, Task, TaskWithAssignee } from "../../../core/entities/task.entity.js";
import { TaskRepositoryPort } from "../../../core/ports/driven/task-repository.port.js";
import { UserRepositoryPort } from "../../../core/ports/driven/user-repository.port.js";

export class InMemoryTaskRepository implements TaskRepositoryPort {
  private tasks = new Map<string, Task>();

  constructor(private readonly userRepo?: UserRepositoryPort) {}

  async save(task: CreateTaskDTO | Task): Promise<Task> {
    if ("id" in task && task.id) {
      const existing = this.tasks.get(task.id);
      const updated: Task = {
        id: task.id,
        title: task.title,
        description: task.description ?? null,
        status: "status" in task ? task.status : "todo",
        assigneeId: task.assigneeId ?? null,
        createdAt: existing ? existing.createdAt : new Date(),
        updatedAt: new Date(),
      };
      this.tasks.set(task.id, updated);
      return updated;
    }

    const newTask: Task = {
      id: randomUUID(),
      title: task.title,
      description: task.description ?? null,
      status: "todo",
      assigneeId: task.assigneeId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async findAll(): Promise<TaskWithAssignee[]> {
    const list = Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    return Promise.all(
      list.map(async (task) => {
        const assignee = task.assigneeId && this.userRepo
          ? await this.userRepo.findById(task.assigneeId)
          : null;
        return { ...task, assignee };
      })
    );
  }

  async findById(id: string): Promise<TaskWithAssignee | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const assignee = task.assigneeId && this.userRepo
      ? await this.userRepo.findById(task.assigneeId)
      : null;
    return { ...task, assignee };
  }

  async updateAssignee(id: string, assigneeId: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.assigneeId = assigneeId;
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    return task;
  }
}
