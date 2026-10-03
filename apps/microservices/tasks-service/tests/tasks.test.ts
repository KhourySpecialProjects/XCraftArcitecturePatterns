import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";
import {publishEvent} from "@taskflow/shared";
import { taskStore } from "../src/in-memory-db.js";

jest.mock("@taskflow/shared", () => ({
  connectMessaging: jest.fn(),
  publishEvent: jest.fn(),
  subscribeEvent: jest.fn(),
  closeMessaging: jest.fn(),
}));

describe("Tasks Service", () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(async () => {
    await cleanDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  describe("POST /tasks", () => {
    it("creates a task without assignee", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Buy Milk" },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().title).toBe("Buy Milk");
    });

    it("creates a task with valid assignee", async () => {
      // Seed local user
      await taskStore.upsertUser({
        id: "user-1",
        name: "Ada",
        email: "ada@example.com",
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Buy Milk", assigneeId: "user-1" },
      });

      expect(response.statusCode).toBe(201);
      expect(publishEvent).toHaveBeenCalledWith(
        "notification-exchange",
        "notification.send",
        expect.objectContaining({ userId: "user-1" })
      );
    });

    it("returns 400 with invalid assignee", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Buy Milk", assigneeId: "invalid-user" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("assigneeId does not exist");
    });
  });
});
