import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// O Prisma 7 exige um "driver adapter" explícito em vez da conexão implícita
// via `datasource.url` (mudança de arquitetura da própria Prisma nesta major).
// Usamos o adapter oficial para node-postgres (`pg`), compatível tanto com
// PostgreSQL local (desenvolvimento) quanto com Supabase (produção).
//
// Padrão singleton via `globalThis`: em desenvolvimento, o Next.js recarrega
// módulos a cada mudança de arquivo (Fast Refresh). Sem esse cache, cada reload
// criaria uma nova pool de conexões, esgotando rapidamente o limite do Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
