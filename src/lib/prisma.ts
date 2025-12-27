import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

// Database path for SQLite
const databasePath = path.join(process.cwd(), "prisma", "dev.db");

// Create Prisma adapter with URL config
const adapter = new PrismaBetterSqlite3({
    url: `file:${databasePath}`,
});

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
});

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
