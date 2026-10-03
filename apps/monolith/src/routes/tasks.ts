import type { FastifyInstance } from "fastify";
import { inMemoryDb } from "../in-memory-db.js";

interface CreateTaskBody {
  title: string;
  description?: string;
  assigneeId?: string;
}

interface AssignTaskBody {
  assigneeId: string;
}

/**
 * Registers task-related HTTP routes on the Fastify instance.
 *
 * @param app - The Fastify application instance to register routes on.
 * @returns A Promise that resolves when route registration is complete.
 */
export async function taskRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateTaskBody }>("/tasks", async (request, reply) => {
    const { title, description, assigneeId } = request.body;

    if (!title) {
      return reply.code(400).send({ error: "title is required" });
    }

    if (assigneeId) {
      const assignee = await inMemoryDb.findUserById(assigneeId);
      if (!assignee) {
        return reply.code(400).send({ error: "assigneeId does not exist" });
      }
    }

    const task = await inMemoryDb.createTask({
      title, description, assigneeId
    });

    if (assigneeId) {
      await inMemoryDb.createNotification({
        userId: assigneeId,
        message: `Task "${title}" was assigned to you`,
      });
    }

    return reply.code(201).send(task);
  });

  app.get("/tasks", async () => {
    return inMemoryDb.findTasks();
  });

  app.get<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const task = await inMemoryDb.findTaskById(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: "task not found" });
    }
    return task;
  });

  app.patch<{ Params: { id: string }; Body: AssignTaskBody }>(
    "/tasks/:id/assign",
    async (request, reply) => {
      const { id } = request.params;
      const { assigneeId } = request.body;

      const [task, assignee] = await Promise.all([
        inMemoryDb.findTaskById(id),
        inMemoryDb.findUserById(assigneeId),
      ]);

      if (!task) {
        return reply.code(404).send({ error: "task not found" });
      }
      if (!assignee) {
        return reply.code(400).send({ error: "assigneeId does not exist" });
      }

      const updated = await inMemoryDb.updateTaskAssignee(id, assigneeId);

      await inMemoryDb.createNotification({
        userId: assigneeId,
        message: `Task "${task.title}" was assigned to you`,
      });

      return updated;
    }
  );
}
