import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    // 1. Criar a tabela Entrada se ela estiver quebrada ou não existir
    // Usamos SQL puro para garantir que as colunas NOME_ALUNO, RA_ALUNO, etc existam
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
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Garantir que a tabela Admin exista
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "admins" (
        "id" TEXT PRIMARY KEY,
        "nome" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "senha" TEXT NOT NULL
      );
    `);

    return NextResponse.json({ success: true, message: 'Banco de dados sincronizado e corrigido com sucesso!' });
  } catch (error: any) {
    console.error('ERRO AO CORRIGIR BANCO:', error);
    return NextResponse.json({ error: 'Falha ao corrigir banco', details: error.message }, { status: 500 });
  }
}
