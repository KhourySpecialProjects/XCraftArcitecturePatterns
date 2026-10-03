import Fastify, { FastifyInstance } from "fastify";
import { registerNotificationRoutes } from "./adapters/driving/http/notifications.routes.js";
import { registerTaskRoutes } from "./adapters/driving/http/tasks.routes.js";
import { registerUserRoutes } from "./adapters/driving/http/users.routes.js";
import { InProcessEventBusAdapter } from "./adapters/driven/messaging/in-process-event-bus.adapter.js";
import { TaskAssignedEvent } from "./core/entities/events.js";
import { EventPublisherPort } from "./core/ports/driven/event-publisher.port.js";
import { NotificationRepositoryPort } from "./core/ports/driven/notification-repository.port.js";
import { TaskRepositoryPort } from "./core/ports/driven/task-repository.port.js";
import { UserRepositoryPort } from "./core/ports/driven/user-repository.port.js";
import { NotificationUseCasePort } from "./core/ports/driving/notification-use-case.port.js";
import { TaskUseCasePort } from "./core/ports/driving/task-use-case.port.js";
import { UserUseCasePort } from "./core/ports/driving/user-use-case.port.js";
import { NotificationService } from "./core/services/notification.service.js";
import { TaskService } from "./core/services/task.service.js";
import { UserService } from "./core/services/user.service.js";
import { InMemoryUserRepository } from "./adapters/driven/persistence/in-memory-user.repository.js";
import { InMemoryTaskRepository } from "./adapters/driven/persistence/in-memory-task.repository.js";
import { InMemoryNotificationRepository } from "./adapters/driven/persistence/in-memory-notification.repository.js";


/**
 * Dependency injection container configuration interface used to build the Fastify application.
 * Allows injecting custom or mock ports and services for testing and composition.
 */
export interface AppDependencies {
  /** Optional user repository port implementation. */
  userRepository?: UserRepositoryPort;
  /** Optional task repository port implementation. */
  taskRepository?: TaskRepositoryPort;
  /** Optional notification repository port implementation. */
  notificationRepository?: NotificationRepositoryPort;
  /** Optional event publisher port implementation with an optional subscribe method. */
  eventPublisher?: EventPublisherPort & {
    subscribe?: <T extends TaskAssignedEvent>(
      eventType: string,
      handler: (event: T) => Promise<void> | void
    ) => void;
  };
  /** Optional user use case port implementation. */
  userService?: UserUseCasePort;
  /** Optional task use case port implementation. */
  taskService?: TaskUseCasePort;
  /** Optional notification use case port implementation. */
  notificationService?: NotificationUseCasePort;
}

/**
 * Builds and configures the Fastify application instance with hexagonal architecture wiring.
 * Injects default or provided driven persistence/messaging adapters, instantiates domain services,
 * wires event bus subscriptions, and registers driving HTTP route plugins and health checks.
 *
 * @param dependencies - Optional dependency overrides for testing or custom configuration.
 * @returns Configured FastifyInstance ready to listen for incoming HTTP requests.
 */
export function buildApp(dependencies: AppDependencies = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  // 1. Driven Adapters (Persistence & Event Bus)
  const userRepository =
    dependencies.userRepository ?? new InMemoryUserRepository();
  const taskRepository =
    dependencies.taskRepository ?? new InMemoryTaskRepository(userRepository);
  const notificationRepository =
    dependencies.notificationRepository ?? new InMemoryNotificationRepository();
  const eventPublisher =
    dependencies.eventPublisher ?? new InProcessEventBusAdapter();

  // 2. Domain Services (Implementing Driving Ports)
  const userService =
    dependencies.userService ?? new UserService(userRepository);
  const notificationService =
    dependencies.notificationService ??
    new NotificationService(notificationRepository, userRepository);
  const taskService =
    dependencies.taskService ??
    new TaskService(taskRepository, userRepository, eventPublisher);

  // 3. Wire In-Process Event Subscription (Decoupled Cross-Domain Flow)
  if (typeof eventPublisher.subscribe === "function") {
    eventPublisher.subscribe("TaskAssigned", async (event: TaskAssignedEvent) => {
      await notificationService.handleTaskAssigned(event);
    });
  }

  // 4. Health and root endpoints
  app.get("/", async () => {
    return { status: "ok", message: "taskflow hexagonal monolith" };
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  // 5. Register Driving Adapters (HTTP Routes)
  app.register(registerUserRoutes(userService));
  app.register(registerTaskRoutes(taskService));
  app.register(registerNotificationRoutes(notificationService));

  return app;
}
