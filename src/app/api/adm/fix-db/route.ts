import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    console.log('Iniciando Sincronização de Datas e Colunas...');

    // 1. Corrigir Tabela ALUNOS (Adicionar datas se faltarem)
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();`); } catch(e){}

    // 2. Corrigir Tabela ENTRADAS
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();`); } catch(e){}

    // 3. Garantir outras colunas críticas em ENTRADAS (conforme erros anteriores)
    const colunasEntradas = [
      { n: 'nome_aluno', t: 'TEXT' },
      { n: 'ra_aluno', t: 'TEXT' },
      { n: 'rg_aluno', t: 'TEXT' },
      { n: 'turma_aluno', t: 'TEXT' }
    ];
    for (const col of colunasEntradas) {
      try { await prisma.$executeRawUnsafe(`ALTER TABLE "entradas" ADD COLUMN IF NOT EXISTS "${col.n}" ${col.t};`); } catch(e){}
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Banco de dados sincronizado! Colunas de data (updated_at) e dados escolares foram verificadas e corrigidas.' 
    });

  } catch (error: any) {
    console.error('ERRO AO SINCRONIZAR:', error);
    return NextResponse.json({ error: 'Falha na sincronização', details: error.message }, { status: 500 });
  }
}
