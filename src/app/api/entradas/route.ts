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
    
    // Usamos randomUUID() para evitar problemas com bibliotecas externas no Vercel
    const id = randomUUID();

    // Gravação via Prisma (Desta vez mapeando campo por campo explicitamente)
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
        aluno_id: user.id.includes('fallback') ? null : user.id
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ERRO NO REGISTRO:', error);
    
    // Retornamos o erro exato para você me passar e eu saber o que o banco disse
    return NextResponse.json({ 
      error: 'Erro de banco de dados. Verifique os detalhes abaixo.',
      details: error.message,
      code: error.code // Código de erro do Prisma (ex: P2002, P2003)
    }, { status: 500 });
  }
}
