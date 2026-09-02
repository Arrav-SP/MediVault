import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "../prisma/contract.json";
import type { Contract } from "../prisma/contract";

const contract = contractJson as unknown as Contract;

const db = postgres({
  contract,
  url: process.env.DATABASE_URL!,
});

export default db;