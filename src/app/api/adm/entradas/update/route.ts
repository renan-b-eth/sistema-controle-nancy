import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json();

    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session || JSON.parse(session.value).profile !== 'ADM') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Atualização via PRISMA (Garante funcionamento total)
    const atualizado = await prisma.entrada.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, status: atualizado.status });

  } catch (error: any) {
    console.error('ERRO AO ATUALIZAR STATUS:', error);
    return NextResponse.json({ error: 'Erro ao atualizar no banco.' }, { status: 500 });
  }
}
