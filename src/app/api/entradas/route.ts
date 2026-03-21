import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const body = await request.json();
    const user = JSON.parse(session.value);
    const id = randomUUID();

    // Verificação robusta: só vinculamos aluno_id se for um ID real do banco (UUID)
    // IDs como 'god-test' ou 'fallback-...' são ignorados na vinculação para evitar erro de Foreign Key
    const isRealUser = user.id && !user.id.includes('test') && !user.id.includes('fallback');

    await prisma.entrada.create({
      data: {
        id: id,
        protocolo: body.protocolo,
        data: body.data,
        horario: body.horario,
        aula_numero: Number(body.aula_numero),
        status: 'pendente',
        nome_aluno: user.nome,
        ra_aluno: user.ra,
        rg_aluno: user.rg,
        turma_aluno: user.turma,
        aluno_id: isRealUser ? user.id : null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ERRO NO REGISTRO DE ENTRADA:', error);
    return NextResponse.json({ 
      error: 'Erro de banco de dados.',
      details: error.message,
      tip: 'Se você está usando o login GOD, o sistema agora permite a gravação sem ID vinculado.'
    }, { status: 500 });
  }
}
