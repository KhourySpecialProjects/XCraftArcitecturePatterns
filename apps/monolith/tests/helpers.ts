// apps/monolith/tests/helpers.ts
import { inMemoryDb } from "../src/in-memory-db.js";

export async function cleanDb() {
  inMemoryDb.clear();
}

export async function closeDb() {
  // No persistent database connection to close when using in-memory store
}
