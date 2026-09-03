import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "../prisma/contract.json";
import type { Contract } from "../prisma/contract";

const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL!,
});

export default db;