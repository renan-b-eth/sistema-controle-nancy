import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const termo = searchParams.get('q') || '';

    if (termo.length < 2) {
      return NextResponse.json([]);
    }

    // Busca por nome, RA ou RG
    const alunos = await prisma.aluno.findMany({
      where: {
        OR: [
          { nome: { contains: termo, mode: 'insensitive' } },
          { ra: { contains: termo, mode: 'insensitive' } },
          { rg: { contains: termo, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { nome: 'asc' }
    });

    return NextResponse.json(alunos);

  } catch (error: any) {
    console.error('ERRO NA API BUSCA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
