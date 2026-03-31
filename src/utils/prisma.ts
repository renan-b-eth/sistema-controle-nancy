import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Busca a URL de qualquer uma das variáveis possíveis para evitar o erro "not found"
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  // URL padrão para permitir build sem configuração (apenas para desenvolvimento)
  const fallbackUrl = process.env.NODE_ENV === 'production' 
    ? '' 
    : 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  DATABASE_URL não configurada! Configure no .env.local');
  }
  
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: dbUrl || fallbackUrl
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
