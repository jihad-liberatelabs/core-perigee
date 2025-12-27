import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton Prisma client instance configured
 * with the better-sqlite3 adapter for SQLite database access.
 * 
 * The singleton pattern ensures we reuse the same Prisma client instance
 * across hot reloads during development, preventing connection exhaustion.
 */

// Database file path
const databasePath = path.join(process.cwd(), "prisma", "dev.db");

// Create Prisma adapter for better-sqlite3
// We use better-sqlite3 instead of the default driver because it provides
// better performance and synchronous API for SQLite
const adapter = new PrismaBetterSqlite3({
    url: `file:${databasePath}`,
});

/**
 * Global singleton storage for Prisma client
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * Prisma client instance
 * 
 * In development, this instance is stored globally to prevent multiple
 * instances from being created during hot module replacement.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
});

// Store in global singleton in non-production environments
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
