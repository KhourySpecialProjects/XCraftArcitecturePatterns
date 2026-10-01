# Architectural Patterns Exercise

Welcome to the Architectural Patterns exercise. This exercise explores and compares four key architectural styles and concepts using a demo task management system (**TaskFlow**):

- **Monolith Architecture** (`apps/monolith`)(URL: http://nchrlnscbptilbkcuddbjka4.104.248.59.237.sslip.io/)
- **Microservices Architecture** (`apps/microservices`)(URL: http://jpdrjovuw6qrtqjuryntb4sd.104.248.59.237.sslip.io/)
- **Hexagonal Architecture / Ports & Adapters** (`apps/hexagonal-with-ui/hexagonal`)(URL: http://2ugjmtfkpcr4p2af31ftfsps.104.248.59.237.sslip.io/)
- **Layered React UI Architecture** (`apps/hexagonal-with-ui/ui`)

> **Note on Running Code & Tests:**  
> Please follow the instructions in the `README.md` located in each pattern's directory under `apps/` (e.g., `apps/monolith/README.md`, `apps/microservices/README.md`, and `apps/hexagonal-with-ui/README.md`) to run the applications and execute test suites.

---

## Part 1: Comprehension

### 1. Monolith Architecture

In the **Monolith Architecture**, all domain features (Users, Tasks, Notifications) are compiled, deployed, and executed within a single, unified runtime process (a Fastify HTTP server).

- **Direct Coupling:** HTTP route handlers receive incoming requests, directly perform business logic validation, and query a single shared PostgreSQL database through the Prisma ORM client.
- **Single Deployment Unit:** A single failure or bug can bring down the entire server, and scaling requires replicating the entire application instance.

```
+-----------------------------------------------------------------------------------+
|                                MONOLITH CLIENTS                                   |
|                          Web / REST API Consumers                                 |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP Requests)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        MONOLITHIC APPLICATION PROCESS                             |
|  Fastify Server:                                                                  |
|   ├── Users Routes & Logic         (src/routes/users.ts)                          |
|   ├── Tasks Routes & Logic         (src/routes/tasks.ts)                          |
|   └── Notifications Routes & Logic (src/routes/notifications.ts)                  |
|                                                                                   |
|  Shared Database Client:                                                          |
|   └── Prisma ORM Client            (src/db.ts)                                    |
+-----------------------------------------------------------------------------------+
                                         │  (SQL Queries / Mutations)
                                         ▼
+-----------------------------------------------------------------------------------+
|                           SINGLE SHARED DATABASE                                  |
|                             PostgreSQL Database                                   |
|             (Tables: "users", "tasks", "notifications" in one schema)             |
+-----------------------------------------------------------------------------------+
```

---

### 2. Microservices Architecture

In the **Microservices Architecture**, the system is decomposed into separate, independently deployed services based on business domain boundaries:

- **Independent Services:** `users-service`, `tasks-service`, and `notifications-service` run in their own dedicated processes and containers.
- **Database-per-Service:** Each microservice manages its own isolated database instance; services never directly read or write to another service's database.
- **API Gateway:** A single entry point (`api-gateway`) reverse-proxies external client traffic to the appropriate downstream service.
- **Asynchronous Event-Driven Messaging:** Cross-service communication (e.g., task assignment triggering a notification) occurs asynchronously via a message broker (RabbitMQ).

```
+-----------------------------------------------------------------------------------+
|                               EXTERNAL CLIENTS                                    |
|                            Web Browser / REST Client                              |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP)
                                         ▼
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY                                      |
|            Routes /users, /tasks, /notifications to downstream services           |
+-----------------------------------------------------------------------------------+
              │ (HTTP Proxy)             │ (HTTP Proxy)             │ (HTTP Proxy)
              ▼                          ▼                          ▼
+-------------------------+  +-------------------------+  +-------------------------+
|      USERS SERVICE      |  |      TASKS SERVICE      |  |  NOTIFICATIONS SERVICE  |
|  Fastify (Port 3001)    |  |  Fastify (Port 3002)    |  |  Fastify (Port 3003)    |
|  src/routes.ts          |  |  src/routes.ts          |  |  src/routes.ts          |
+-------------------------+  +-------------------------+  +-------------------------+
       │              ▲             │             │              ▲             ▲
(SQL)  ▼              │(Sync)       ▼(SQL)        ▼(Publish)     │(Subscribe)  ▼(SQL)
+--------------+      │      +--------------+  +--------------------+      +--------------+
|   USERS DB   |      └──────┤   TASKS DB   |  | RABBITMQ (BROKER)  |      |NOTIFICATIONS |
|  PostgreSQL  | (Replicated |  PostgreSQL  |  | "user-exchange"    |      |      DB      |
|  (Port 5433) |  User Data) |  (Port 5434) |  | "notif-exchange"   |      |  (Port 5435) |
+--------------+             +--------------+  +--------------------+      +--------------+
```

---

### 3. Hexagonal Architecture (Ports and Adapters)

In **Hexagonal Architecture**, business domain logic is placed at the center of the application and completely decoupled from technical frameworks, UI, databases, and third-party tools.

- **Domain Core:** Contains Domain Entities (pure TypeScript interfaces/models) and Application Services (use case business logic). The core has zero external framework dependencies.
- **Driving (Primary / Inbound) Ports & Adapters:**
  - *Ports (`*UseCasePort`):* Interfaces defining what use cases the core exposes.
  - *Adapters:* Technologies driving the application (e.g., Fastify HTTP routes).
- **Driven (Secondary / Outbound) Ports & Adapters:**
  - *Ports (`*RepositoryPort`, `EventPublisherPort`):* Interfaces defining what dependencies the core requires.
  - *Adapters:* Concrete implementations providing infrastructure capabilities (e.g., Prisma repositories, in-process event bus).

```
+-----------------------------------------------------------------------------------+
|                           DRIVING (PRIMARY) ADAPTERS                              |
|   Fastify HTTP Routes (users.routes.ts, tasks.routes.ts, notifications.routes.ts) |
+-----------------------------------------------------------------------------------+
                                         │  (invokes)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             DRIVING (INBOUND) PORTS                               |
|       UserUseCasePort  │  TaskUseCasePort  │  NotificationUseCasePort             |
+-----------------------------------------------------------------------------------+
                                         │  (implemented by)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             HEXAGONAL DOMAIN CORE                                 |
|   Domain Entities: User, Task, Notification, Domain Events                        |
|   Application Services: UserService, TaskService, NotificationService             |
+-----------------------------------------------------------------------------------+
                                         │  (depends on)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             DRIVEN (OUTBOUND) PORTS                               |
|   UserRepositoryPort  │  TaskRepositoryPort  │  NotificationRepoPort  │ EventPub  |
+-----------------------------------------------------------------------------------+
                                         ▲  (implemented by)
                                         │
+-----------------------------------------------------------------------------------+
|                           DRIVEN (SECONDARY) ADAPTERS                             |
|   Prisma Repositories (prisma-*.repository.ts)  │  InProcessEventBusAdapter       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        PERSISTENCE & INFRASTRUCTURE                               |
|                           PostgreSQL Database                                     |
+-----------------------------------------------------------------------------------+
```

---

### 4. Publisher-Subscriber Pattern (Microservices vs. Hexagonal)

The **Publisher-Subscriber (Pub/Sub)** pattern decouples the sender (producer) of an event from the receiver (consumer). The publisher emits an event without knowing who or how many subscribers will handle it.

#### A. Pub/Sub in Microservices (Distributed via Message Broker)
- **Mechanism:** `tasks-service` uses `@taskflow/shared` to publish `notification.send` to RabbitMQ's `notification-exchange`.
- **Decoupling:** `tasks-service` does not make synchronous HTTP requests to `notifications-service`. If `notifications-service` is temporarily down or slow, messages are queued reliably in RabbitMQ without failing the task assignment.

#### B. Pub/Sub in Hexagonal Monolith (In-Process Event Bus)
- **Mechanism:** `TaskService` in the domain core publishes domain events (such as `TaskAssignedEvent`) via the driven `EventPublisherPort`. `InProcessEventBusAdapter` distributes the event internally using Node's event dispatching.
- **Decoupling:** `TaskService` does not directly depend on `NotificationService` or `NotificationRepositoryPort`. Cross-domain side-effects are coordinated via domain events wired in `app.ts`.

```
========================= MICROSERVICES DISTRIBUTED PUB/SUB =========================

   [Tasks Service]  ──(Publish: "notification.send")──>  [RabbitMQ Exchange]
                                                                  │
                                                          (Route to Queue)
                                                                  ▼
   [Notifications Service]  <──(Subscribe / Consume)──────  [RabbitMQ Queue]


========================== HEXAGONAL IN-PROCESS PUB/SUB =============================

   [TaskService Core] ──(Emit: TaskAssignedEvent)──> [EventPublisherPort]
                                                              │
                                                     (In-Process Dispatch)
                                                              ▼
   [NotificationService Core] <──(Event Handler)──── [InProcessEventBusAdapter]
```

---

### 5. React UI Layered Architecture

The React UI (`apps/hexagonal-with-ui/ui`) implements a clean **layered architecture** enforcing separation of concerns across three layers:

1. **Presentation Layer (Components):**  
   - Components (e.g., `UsersManager`, `UserListTable`, `UserRegistrationForm`, `Button`, `Card`) are purely concerned with visual layout, rendering markup, styling, and delegating user actions via callback props.
2. **Interaction & State Layer (Custom Hooks):**  
   - Custom hooks (e.g., `useUsers`, `useUserDetail`, `useCreateUser`) encapsulate client state (`useState`), side-effects (`useEffect`), loading/error states, form validation, and event handlers.
3. **API Service Layer (REST Transport):**  
   - Dedicated modules (`user.service.ts`, `task.service.ts`, `api-client.ts`) isolate HTTP communication, URL endpoints, request payload serialization, and error response normalization from React components and hooks.

```
+-----------------------------------------------------------------------------------+
|                        PRESENTATION LAYER (React Components)                      |
|   UsersManager  │  UserListTable  │  UserRegistrationForm  │  UserDetailCard      |
|   • Focus: Markup, layout, CSS styling, capturing user input events               |
+-----------------------------------------------------------------------------------+
                                         │  (consumes state & handlers)
                                         ▼
+-----------------------------------------------------------------------------------+
|                    INTERACTION & STATE LAYER (Custom React Hooks)                 |
|   useUsers  │  useUserDetail  │  useCreateUser  │  useTasks  │  useNotifications  |
|   • Focus: React state, loading/error lifecycle, validation, callback management  |
+-----------------------------------------------------------------------------------+
                                         │  (calls async service functions)
                                         ▼
+-----------------------------------------------------------------------------------+
|                              API SERVICE LAYER                                    |
|   user.service.ts  │  task.service.ts  │  notification.service.ts  │  api-client  |
|   • Focus: HTTP REST endpoints, fetch/JSON serialization, HTTP status handling    |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP JSON Requests)
                                         ▼
+-----------------------------------------------------------------------------------+
|                               BACKEND REST API                                    |
|                       Fastify Server (/users, /tasks, ...)                        |
+-----------------------------------------------------------------------------------+
```

---

## Part 2: Reflection

Use these guided reflection questions to explore the trade-offs of each architectural pattern:

### 1. Monolith: Simplicity vs. Modifiability and Testability
1. In the monolith codebase, how tightly coupled are the Fastify route handlers to Prisma database models?
2. When writing automated unit tests for `apps/monolith`, why is it difficult to test business validation logic in isolation without starting a live PostgreSQL database instance or heavily mocking Prisma?
3. If the data schema changes (e.g., renaming a column in the database), how many layers in the monolith are affected simultaneously?

### 2. Hexagonal Architecture: Complexity vs. Testability and Maintainability
1. Hexagonal architecture introduces ports, adapters, entities, DTOs, and dependency injection in `app.ts`. What are the benefits that justify this additional upfront complexity?
2. How does the separation of **Driving Ports** and **Driven Ports** make it possible to write unit tests for `TaskService` and `UserService` that run in milliseconds without databases or network connections?
3. If you decide to switch your persistence layer from PostgreSQL/Prisma to MongoDB or an In-Memory store, which files in the Hexagonal core domain (`src/core/`) need to be modified?

### 3. Publisher-Subscriber Pattern: Loose Coupling
1. What is the difference in coupling when `TaskService` directly calls `NotificationService.createNotification()` versus publishing a `TaskAssignedEvent`?
2. If a new requirement is introduced (e.g., "send an email and log an analytics audit whenever a task is assigned"), how does the pub/sub pattern allow you to add these features without modifying the task creation or assignment code?
3. What challenges does the pub/sub pattern introduce regarding execution flow visibility, debugging, and transaction rollbacks?

### 4. Microservices: Independent Deployment vs. Inter-Service Coordination
1. What advantages does `users-service` having its own independent database provide to a dedicated product team in terms of deployment cycles and database migrations?
2. What happens in `tasks-service` if `users-service` is down when creating a task? How does data replication or asynchronous caching via RabbitMQ mitigate synchronous service downtime?
3. How does eventual consistency impact system design compared to the ACID guarantees of a single monolithic database?

### 5. React UI: Layered Architecture and Separation of Concerns
1. Why is extracting REST API calls into `user.service.ts` cleaner than calling `fetch()` directly inside React component `useEffect` hooks?
2. If the backend API route changes from `/users` to `/api/v2/user-accounts`, how many React presentation components need to be modified?
3. How does decoupling interaction logic into custom hooks (e.g., `useUsers`) allow you to test or redesign presentation components (like changing a Table into a Card Grid) without re-writing state management or API calls?

---

## Part 3: Get Your Hands Dirty

### Task 1: Replace Prisma with a Simple In-Memory Data Store

In this task, you will replace the Prisma database layer with a simple class-based in-memory data store across the **Monolith**, **Microservices**, and **Hexagonal** architectures.

---

#### 1.1 Monolith: In-Memory Data Store

In the monolith, route handlers directly call `prisma.<model>`. To replace Prisma with an in-memory store, create an in-memory store class and update the database client module.

##### Step 1: Create the In-Memory Store
Create `apps/monolith/src/in-memory-db.ts`:

```typescript
// apps/monolith/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: "todo"
  createdAt: Date;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class InMemoryDatabase {
  private users = new Map<string, UserRecord>();
  private tasks = new Map<string, TaskRecord>();
  private notifications = new Map<string, NotificationRecord>();

  // User Operations
  async createUser(data: { name: string; email: string }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUsers(): Promise<UserRecord[]> {
    return Array.from(this.users.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }

  // Task Operations
  async createTask(data: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
  }): Promise<TaskRecord> {
    const task: TaskRecord = {
      id: randomUUID(),
      title: data.title,
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      status: "todo",
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findTasks(): Promise<Array<TaskRecord & { assignee: UserRecord | null }>> {
    const list = Array.from(this.tasks.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    return list.map((task) => ({
      ...task,
      assignee: task.assigneeId ? this.users.get(task.assigneeId) ?? null : null,
    }));
  }

  async findTaskById(
    id: string
  ): Promise<(TaskRecord & { assignee: UserRecord | null }) | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      ...task,
      assignee: task.assigneeId ? this.users.get(task.assigneeId) ?? null : null,
    };
  }

  async updateTaskAssignee(
    id: string,
    assigneeId: string
  ): Promise<TaskRecord | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    return task;
  }

  // Notification Operations
  async createNotification(data: {
    userId: string;
    message: string;
  }): Promise<NotificationRecord> {
    const notification: NotificationRecord = {
      id: randomUUID(),
      userId: data.userId,
      message: data.message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findNotificationsByUserId(
    userId: string
  ): Promise<NotificationRecord[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(id: string): Promise<NotificationRecord | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;
    notification.read = true;
    this.notifications.set(id, notification);
    return notification;
  }

  clear(): void {
    this.users.clear();
    this.tasks.clear();
    this.notifications.clear();
  }
}

export const inMemoryDb = new InMemoryDatabase();
```

##### Step 2: Update `apps/monolith/src/db.ts` or Route Files
Notice how in the monolith, because route handlers directly invoked Prisma methods like `prisma.user.findMany(...)`, you must update each route handler (`src/routes/users.ts`, `src/routes/tasks.ts`, and `src/routes/notifications.ts`) to call `inMemoryDb` instead of `prisma`.

##### Step 3: Update Test Helpers (`apps/monolith/tests/helpers.ts`)
Because tests in the monolith clean up the database between test runs using Prisma and disconnect the PostgreSQL pool, update `apps/monolith/tests/helpers.ts` to reset the in-memory store:

```typescript
// apps/monolith/tests/helpers.ts
import { inMemoryDb } from "../src/in-memory-db.js";

export async function cleanDb() {
  inMemoryDb.clear();
}

export async function closeDb() {
  // No persistent database connection to close when using in-memory store
}
```

---

#### 1.2 Microservices: In-Memory Data Stores per Service

In the microservices pattern, each service maintains its own isolated database. You replace the store in each service independently.

##### Step 1: Users Service Store
Create `apps/microservices/users-service/src/in-memory-db.ts`:

```typescript
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
```

##### Step 2: Tasks Service Store
Create `apps/microservices/tasks-service/src/in-memory-db.ts`:

```typescript
// apps/microservices/tasks-service/src/in-memory-db.ts
import { randomUUID } from "node:crypto";

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  createdAt: Date;
}

export interface ReplicatedUserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class InMemoryTaskStore {
  private tasks = new Map<string, TaskRecord>();
  private users = new Map<string, ReplicatedUserRecord>();

  async upsertUser(user: ReplicatedUserRecord): Promise<void> {
    this.users.set(user.id, user);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.users.has(userId);
  }

  async createTask(data: {
    title: string;
    description?: string;
    assigneeId?: string;
  }): Promise<TaskRecord> {
    const task: TaskRecord = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findTasks(): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findTaskById(id: string): Promise<TaskRecord | null> {
    return this.tasks.get(id) ?? null;
  }

  async updateAssignee(id: string, assigneeId: string): Promise<TaskRecord | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    return task;
  }

  clear(): void {
    this.tasks.clear();
    this.users.clear();
  }
}

export const taskStore = new InMemoryTaskStore();
```

##### Step 3: Notifications Service Store
Create `apps/microservices/notifications-service/src/in-memory-db.ts`:

```typescript
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
```

##### Step 4: Update Microservices Test Helpers & Test Suites
In the microservices pattern, each service's test suite directly cleans up its database and seeds local replicated state using Prisma. Update the following test files:

1. **Users Service Test Helpers (`apps/microservices/users-service/tests/helpers.ts`)**:
```typescript
import { userStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  userStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
```

2. **Tasks Service Test Helpers (`apps/microservices/tasks-service/tests/helpers.ts`)**:
```typescript
import { taskStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  taskStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
```

3. **Tasks Service Test Suite (`apps/microservices/tasks-service/tests/tasks.test.ts`)**:
Update the Prisma import and the replicated user seed in the `"creates a task with valid assignee"` test case:
```typescript
// Replace Prisma import at line 5:
import { taskStore } from "../src/in-memory-db.js";

// In test case "creates a task with valid assignee" (around lines 42-47):
await taskStore.upsertUser({
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date(),
});
```

4. **Notifications Service Test Helpers (`apps/microservices/notifications-service/tests/helpers.ts`)**:
```typescript
import { notificationStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  notificationStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
```

---

#### 1.3 Hexagonal Architecture: In-Memory Driven Adapters

In Hexagonal architecture, changing from Prisma to an In-Memory data store requires **zero changes** to domain services (`UserService`, `TaskService`, `NotificationService`) and **zero changes** to HTTP routes (`users.routes.ts`, `tasks.routes.ts`, `notifications.routes.ts`). You simply implement the existing **Driven Ports**.

##### Step 1: Create `InMemoryUserRepository`
Create `apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-user.repository.ts`:

```typescript
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
```

##### Step 2: Create `InMemoryTaskRepository`
Create `apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-task.repository.ts`:

```typescript
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
```

##### Step 3: Create `InMemoryNotificationRepository`
Create `apps/hexagonal-with-ui/hexagonal/src/adapters/driven/persistence/in-memory-notification.repository.ts`:

```typescript
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
```

##### Step 4: Wire in `apps/hexagonal-with-ui/hexagonal/src/app.ts`
Simply swap the instantiated driven adapters in `buildApp` (or pass them when initializing):

```typescript
// In apps/hexagonal-with-ui/hexagonal/src/app.ts:
import { InMemoryUserRepository } from "./adapters/driven/persistence/in-memory-user.repository.js";
import { InMemoryTaskRepository } from "./adapters/driven/persistence/in-memory-task.repository.js";
import { InMemoryNotificationRepository } from "./adapters/driven/persistence/in-memory-notification.repository.js";

export function buildApp(dependencies: AppDependencies = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  // Swap Prisma adapters with In-Memory adapters:
  const userRepository =
    dependencies.userRepository ?? new InMemoryUserRepository();
  const taskRepository =
    dependencies.taskRepository ?? new InMemoryTaskRepository(userRepository);
  const notificationRepository =
    dependencies.notificationRepository ?? new InMemoryNotificationRepository();
  const eventPublisher =
    dependencies.eventPublisher ?? new InProcessEventBusAdapter();

  // Domain services and driving routes remain 100% UNCHANGED!
  const userService =
    dependencies.userService ?? new UserService(userRepository);
  const notificationService =
    dependencies.notificationService ??
    new NotificationService(notificationRepository, userRepository);
  const taskService =
    dependencies.taskService ??
    new TaskService(taskRepository, userRepository, eventPublisher);

  // ... rest of wiring
  return app;
}
```

##### Step 5: Hexagonal Tests (Zero Changes Required)
Because the Hexagonal test suites rely entirely on dependency injection, Driven Repository Ports, and in-memory test doubles without direct coupling to Prisma or live database connection pools, **0 test files require changes** in `apps/hexagonal-with-ui/hexagonal/tests/`.


#### Reflection
> - Compare the number of files and lines of code you had to modify in the **Monolith** versus the **Hexagonal Architecture** to replace Prisma with an in-memory store.  
> - Why were the domain use cases, route handlers, and test files in the Hexagonal architecture completely unaffected by this database replacement?  
> - How does this architectural property simplify unit testing and technology migration?
