import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const body = await request.json();
    const user = JSON.parse(session.value);

    // Gravação via PRISMA (O mesmo método que funcionou no Seed de alunos)
    await prisma.entrada.create({
      data: {
        protocolo: body.protocolo,
        data: body.data,
        horario: body.horario,
        aula_numero: Number(body.aula_numero),
        status: 'pendente',
        nome_aluno: user.nome,
        ra_aluno: user.ra,
        rg_aluno: user.rg,
        turma_aluno: user.turma,
        // Só tenta vincular ID se for um UUID real (não 'god-test' ou 'fallback')
        aluno_id: (user.id && user.id.length > 20 && !user.id.includes('fallback')) ? user.id : null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ERRO NO PRISMA ENTRADAS:', error);
    return NextResponse.json({ 
      error: 'Falha ao registrar no banco de dados.',
      details: error.message,
      tip: 'Verifique se rodou o comando ALTER TABLE no SQL Editor.'
    }, { status: 500 });
  }
}
