import { notificationStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  notificationStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
