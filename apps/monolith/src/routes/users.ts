import type { FastifyInstance } from "fastify";
import { inMemoryDb } from "../in-memory-db.js";

interface CreateUserBody {
  name: string;
  email: string;
}

/**
 * Registers user-related HTTP routes on the Fastify instance.
 *
 * @param app - The Fastify application instance to register routes on.
 * @returns A Promise that resolves when route registration is complete.
 */
export async function userRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateUserBody }>("/users", async (request, reply) => {
    const { name, email } = request.body;

    if (!name || !email) {
      return reply.code(400).send({ error: "name and email are required" });
    }

    try {
      const user = await inMemoryDb.createUser({
        name, email
      });
      return reply.code(201).send(user);
    } catch (err) {
      return reply.code(409).send({ error: "email already exists" });
    }
  });

  app.get("/users", async () => {
    return inMemoryDb.findUsers();
  });

  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    const user = await inMemoryDb.findUserById(request.params.id);
    if (!user) {
      return reply.code(404).send({ error: "user with id not found" });
    }
    return user;
  });
}
