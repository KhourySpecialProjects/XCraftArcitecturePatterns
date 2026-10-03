import type {FastifyInstance} from "fastify";
import { inMemoryDb } from "../in-memory-db.js";

/**
 * Registers notification-related HTTP routes on the Fastify instance.
 *
 * @param app - The Fastify application instance to register routes on.
 * @returns A Promise that resolves when route registration is complete.
 */
export async function notificationRoutes(app: FastifyInstance) {
  app.get<{ Params: { userId: string } }>(
    "/notifications/:userId",
    async (request) => {
      return inMemoryDb.findNotificationsByUserId(request.params.userId);
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/notifications/:id/read",
    async (request, reply) => {
      try {
        return inMemoryDb.markNotificationAsRead(request.params.id);
      } catch {
        return reply.code(404).send({ error: "notification not found" });
      }
    }
  );
}
