import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const body = await request.json();
    const user = JSON.parse(session.value);

    // Tentativa robusta de salvar
    try {
      await prisma.entrada.create({
        data: {
          id: nanoid(),
          protocolo: body.protocolo,
          data: body.data,
          horario: body.horario,
          aula_numero: Number(body.aula_numero),
          status: 'pendente',
          nome_aluno: user.nome,
          ra_aluno: user.ra,
          rg_aluno: user.rg,
          turma_aluno: user.turma,
          aluno_id: user.id.startsWith('fallback') ? null : user.id 
        }
      });
    } catch (dbError: any) {
       // TENTATIVA DE AUTO-REPARO: Se der erro de coluna não encontrada, tentamos rodar o SQL de fix
       console.warn('BANCO QUEBRADO? TENTANDO AUTO-REPARO...');
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
       
       // Tenta novamente após o reparo
       await prisma.entrada.create({
          data: {
            id: nanoid(),
            protocolo: body.protocolo,
            data: body.data,
            horario: body.horario,
            aula_numero: Number(body.aula_numero),
            status: 'pendente',
            nome_aluno: user.nome,
            ra_aluno: user.ra,
            rg_aluno: user.rg,
            turma_aluno: user.turma,
            aluno_id: user.id.startsWith('fallback') ? null : user.id 
          }
       });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('FALHA CRÍTICA APÓS AUTO-REPARO:', error);
    return NextResponse.json({ 
      error: 'O banco de dados do Supabase está com as colunas desatualizadas no servidor. Entre no painel ADM e use o botão "Fix Database" se disponível, ou contate o suporte.',
      details: error.message 
    }, { status: 500 });
  }
}
