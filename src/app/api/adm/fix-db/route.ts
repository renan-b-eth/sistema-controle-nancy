import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    console.log('Iniciando ATUALIZAÇÃO E REPARO do Banco...');

    // 1. Criar a tabela Entrada do zero caso não exista
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "entradas" (
        "id" TEXT PRIMARY KEY,
        "aluno_id" TEXT,
        "data" TEXT NOT NULL,
        "horario" TEXT NOT NULL,
        "aula_numero" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pendente',
        "protocolo" TEXT UNIQUE NOT NULL,
        "nome_aluno" TEXT NOT NULL,
        "ra_aluno" TEXT NOT NULL,
        "rg_aluno" TEXT NOT NULL,
        "turma_aluno" TEXT NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Adicionar as NOVAS colunas fundamentais para o fluxo de autorização e assinatura
    const columns = [
      { n: 'nome_aluno', t: 'TEXT' },
      { n: 'ra_aluno', t: 'TEXT' },
      { n: 'rg_aluno', t: 'TEXT' },
      { n: 'turma_aluno', t: 'TEXT' },
      { n: 'autorizado_por', t: 'TEXT' },
      { n: 'assinatura_status', t: 'TEXT DEFAULT \'pendente\'' },
      { n: 'updated_at', t: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of columns) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN IF NOT EXISTS "${col.n}" ${col.t};`);
        console.log(`Coluna ${col.n} verificada/adicionada.`);
      } catch (e) {
        console.log(`Aviso na coluna ${col.n}:`, e);
      }
    }

    // 3. Garantir que REPLICA IDENTITY está FULL para Realtime funcionar
    await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" REPLICA IDENTITY FULL;`);

    return NextResponse.json({ 
      success: true, 
      message: 'BANCO ATUALIZADO COM SUCESSO. As colunas autorizado_por e assinatura_status foram injetadas.'
    });

  } catch (error: any) {
    console.error('ERRO AO REPARAR:', error);
    return NextResponse.json({ error: 'Erro no reparo', details: error.message }, { status: 500 });
  }
}
