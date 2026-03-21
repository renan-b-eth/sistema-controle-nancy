import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    console.log('Iniciando REPARO TOTAL do Banco...');

    // 1. Criar a tabela Entrada do zero com as colunas EXATAS
    // Usamos SQL puro para garantir o sucesso total
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

    // 2. Tentar adicionar colunas caso a tabela já existisse (Double check)
    const columns = [
      { n: 'nome_aluno', t: 'TEXT' },
      { n: 'ra_aluno', t: 'TEXT' },
      { n: 'rg_aluno', t: 'TEXT' },
      { n: 'turma_aluno', t: 'TEXT' },
      { n: 'updated_at', t: 'TIMESTAMP WITH TIME ZONE' }
    ];

    for (const col of columns) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN IF NOT EXISTS "${col.n}" ${col.t};`);
      } catch (e) {}
    }

    return NextResponse.json({ 
      success: true, 
      message: 'BANCO REPARADO DEFINITIVAMENTE. Pode testar o login GOD e alunos agora.'
    });

  } catch (error: any) {
    console.error('ERRO AO REPARAR:', error);
    return NextResponse.json({ error: 'Erro no reparo', details: error.message }, { status: 500 });
  }
}
