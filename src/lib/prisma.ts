import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton Prisma client instance.
 * The singleton pattern ensures we reuse the same Prisma client instance
 * across hot reloads during development, preventing connection exhaustion.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
