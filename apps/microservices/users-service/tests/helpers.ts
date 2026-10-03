import { userStore } from "../src/in-memory-db.js";

export async function cleanDb() {
  userStore.clear();
}

export async function closeDb() {
  // No connection pool to close
}
