import { PrismaClient } from "../../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires an adapter (e.g. @prisma/adapter-pg) or accelerateUrl at
// the type level, but the adapter is wired up at the server bootstrap level.
// The `as any` cast here avoids duplicating adapter construction; the adapter
// will be provided before any database calls are made.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientOptions: any = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(clientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
