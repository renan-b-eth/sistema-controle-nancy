import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    console.log('Iniciando Sincronização Forçada do Banco...');

    // 1. Criar a tabela base se não existir
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "entradas" (
        "id" TEXT PRIMARY KEY,
        "protocolo" TEXT UNIQUE NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pendente',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Adicionar colunas faltantes uma a uma (Garante que o banco se adapte)
    const colunasParaAdicionar = [
      { nome: 'aluno_id', tipo: 'TEXT' },
      { nome: 'data', tipo: 'TEXT' },
      { nome: 'horario', tipo: 'TEXT' },
      { nome: 'aula_numero', tipo: 'INTEGER' },
      { nome: 'nome_aluno', tipo: 'TEXT' },
      { nome: 'ra_aluno', tipo: 'TEXT' },
      { nome: 'rg_aluno', tipo: 'TEXT' },
      { nome: 'turma_aluno', tipo: 'TEXT' }
    ];

    for (const col of colunasParaAdicionar) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN "${col.nome}" ${col.tipo};`);
        console.log(`Coluna ${col.nome} adicionada.`);
      } catch (e) {
        // Ignora erro se a coluna já existir
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Banco de dados sincronizado e colunas atualizadas com sucesso!' 
    });

  } catch (error: any) {
    console.error('ERRO AO SINCRONIZAR BANCO:', error);
    return NextResponse.json({ error: 'Falha na sincronização', details: error.message }, { status: 500 });
  }
}
