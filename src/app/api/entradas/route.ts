import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const { protocolo, aula_numero, horario, data } = body;
    const user = JSON.parse(session.value);

    // Salvar usando PRISMA (Conexão Direta - Resolve erro de Schema Cache)
    const novaEntrada = await prisma.entrada.create({
      data: {
        protocolo,
        data,
        horario,
        aula_numero: Number(aula_numero),
        status: 'pendente',
        nome_aluno: user.nome,
        ra_aluno: user.ra,
        rg_aluno: user.rg,
        turma_aluno: user.turma,
        // Se o id do aluno existir no banco, vinculamos
        aluno_id: user.id.startsWith('fallback') ? null : user.id 
      }
    });

    return NextResponse.json({ success: true, id: novaEntrada.id });

  } catch (error: any) {
    console.error('ERRO AO SALVAR ENTRADA VIA PRISMA:', error);
    return NextResponse.json({ 
      error: 'Erro ao registrar no banco de dados.',
      details: error.message 
    }, { status: 500 });
  }
}
