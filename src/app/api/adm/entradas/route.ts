import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataFiltro = searchParams.get('data');

    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session || JSON.parse(session.value).profile !== 'ADM') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    if (!dataFiltro) {
      return NextResponse.json({ error: 'Data não informada.' }, { status: 400 });
    }

    // Busca via PRISMA (Ignora qualquer erro de RLS do Supabase)
    const entradas = await prisma.entrada.findMany({
      where: { data: dataFiltro },
      orderBy: { horario: 'desc' }
    });

    return NextResponse.json(entradas);

  } catch (error: any) {
    console.error('ERRO AO BUSCAR ENTRADAS:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados.' }, { status: 500 });
  }
}
