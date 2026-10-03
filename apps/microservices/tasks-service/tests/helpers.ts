import { taskStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  taskStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
