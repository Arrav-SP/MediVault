import { Temporal } from "@js-temporal/polyfill";
import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "../prisma/contract.json";
import type { Contract } from "../prisma/contract";

const globalWithTemporal = globalThis as typeof globalThis & {
  Temporal?: typeof Temporal;
};

if (!globalWithTemporal.Temporal) {
  globalWithTemporal.Temporal = Temporal;
}

const db = postgres<Contract>({
  contractJson,
});

let connectionPromise: ReturnType<typeof db.connect> | null = null;

export async function ensureDbConnected() {
  if (!connectionPromise) {
    connectionPromise = db.connect({
      url: process.env.DATABASE_URL!,
    });
  }

  await connectionPromise;
}

export default db;