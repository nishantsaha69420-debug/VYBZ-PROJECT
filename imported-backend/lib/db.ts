// Prisma Client & PostgreSQL Database Singleton for VYBZ // ARCADE SYSTEM
// Automatically handles live PostgreSQL connection when DATABASE_URL is set,
// and provides a resilient in-memory store during development when DATABASE_URL is empty.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __vybzMemoryDb?: InMemoryDatabase;
};

export const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
    process.env.DATABASE_URL.trim().length > 0 &&
    !process.env.DATABASE_URL.includes("placeholder")
);

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ── IN-MEMORY REPOSITORY FALLBACK (For offline/dev testing) ─────────────────
export interface MemoryRecord {
  id: string;
  [key: string]: any;
}

export class InMemoryDatabase {
  users = new Map<string, any>();
  chatSessions = new Map<string, any>();
  chatParticipants = new Map<string, any>();
  chatMessages = new Map<string, any>();
  playerProfiles = new Map<string, any>();
  games = new Map<string, any>();
  gameQuestions = new Map<string, any>();
  gameAnswers = new Map<string, any>();
  gameRooms = new Map<string, any>();
  roomPlayers = new Map<string, any>();
  roomAnswers = new Map<string, any>();
  gameEvents = new Map<string, any>();
}

if (!globalForPrisma.__vybzMemoryDb) {
  globalForPrisma.__vybzMemoryDb = new InMemoryDatabase();
}

export const memoryDb = globalForPrisma.__vybzMemoryDb;
