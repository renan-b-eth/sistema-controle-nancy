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
    const dataHoje = body.data;

    // VERIFICA SE JÁ EXISTE UMA ENTRADA HOJE PARA ESTE ALUNO
    const entradaExistente = await prisma.entrada.findFirst({
      where: {
        ra_aluno: user.ra,
        data: dataHoje
      }
    });

    if (entradaExistente) {
      // Se já existe, retorna o protocolo existente e não cria outro
      return NextResponse.json({ 
        success: true, 
        protocolo: entradaExistente.protocolo,
        status: entradaExistente.status
      });
    }

    // Se não existe, cria a nova
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
        aluno_id: (user.id && user.id.length >= 20 && !user.id.includes('fallback') && !user.id.includes('test')) ? user.id : null
      }
    });

    return NextResponse.json({ success: true, protocolo: body.protocolo, status: 'pendente' });

  } catch (error: any) {
    console.error('ERRO NO PRISMA ENTRADAS:', error);
    return NextResponse.json({ 
      error: 'Falha ao registrar no banco de dados.',
      details: error.message,
      tip: 'Verifique se rodou o comando ALTER TABLE no SQL Editor.'
    }, { status: 500 });
  }
}
