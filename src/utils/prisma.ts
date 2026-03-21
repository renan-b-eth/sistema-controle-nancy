import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Busca a URL de qualquer uma das variáveis possíveis para evitar o erro "not found"
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: dbUrl
      }
    }
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
