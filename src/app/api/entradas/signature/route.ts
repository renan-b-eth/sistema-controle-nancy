import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { protocolo, status } = await request.json(); // status: 'assinado' | 'recusado'

    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    // Quando o aluno assina, o status global da entrada passa a ser LIBERADO (Finalizado)
    const atualizado = await prisma.entrada.update({
      where: { protocolo },
      data: { 
        assinatura_status: status,
        status: status === 'assinado' ? 'liberado' : 'direcao' // Se recusar, volta pra direção
      }
    });

    return NextResponse.json({ success: true, status: atualizado.status });

  } catch (error: any) {
    console.error('ERRO AO ATUALIZAR ASSINATURA:', error);
    return NextResponse.json({ error: 'Erro ao processar assinatura.' }, { status: 500 });
  }
}
