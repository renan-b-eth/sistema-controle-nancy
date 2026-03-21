import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    console.log('Validando Banco de Dados...');

    // 1. Tentar ler as colunas atuais da tabela entradas
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'entradas';
    `);

    // 2. Se a tabela não tiver colunas, tenta consertar
    if (columns.length === 0) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "entradas" (
          "id" TEXT PRIMARY KEY,
          "protocolo" TEXT UNIQUE NOT NULL,
          "data" TEXT NOT NULL,
          "horario" TEXT NOT NULL,
          "aula_numero" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pendente',
          "nome_aluno" TEXT NOT NULL,
          "ra_aluno" TEXT NOT NULL,
          "rg_aluno" TEXT NOT NULL,
          "turma_aluno" TEXT NOT NULL,
          "aluno_id" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Banco de dados validado.',
      columns: columns.map(c => c.column_name)
    });

  } catch (error: any) {
    console.error('ERRO AO SINCRONIZAR BANCO:', error);
    return NextResponse.json({ error: 'Falha na sincronização', details: error.message }, { status: 500 });
  }
}
