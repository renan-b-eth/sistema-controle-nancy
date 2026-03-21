import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json(); // status agora pode ser 'autorizado' (pela gestão) ou 'liberado' (final)

    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session || JSON.parse(session.value).profile !== 'ADM') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const adminData = JSON.parse(session.value);
    const autorizadoPor = adminData.nome; 

    const atualizado = await prisma.entrada.update({
      where: { id },
      data: { 
        status, // 'autorizado' ou 'direcao'
        autorizado_por: status === 'autorizado' || status === 'direcao' ? autorizadoPor : null
      }
    });

    return NextResponse.json({ success: true, status: atualizado.status });

  } catch (error: any) {
    console.error('ERRO AO ATUALIZAR STATUS:', error);
    return NextResponse.json({ error: 'Erro ao atualizar no banco.' }, { status: 500 });
  }
}
