import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'alunos' | 'entradas' | 'estatisticas'
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');

    if (tipo === 'alunos') {
      const alunos = await prisma.aluno.findMany({
        orderBy: { nome: 'asc' }
      });
      return NextResponse.json(alunos);
    }

    if (tipo === 'entradas') {
      const entradas = await prisma.entrada.findMany({
        where: {
          data: {
            gte: dataInicio || '2020-01-01',
            lte: dataFim || new Date().toISOString().split('T')[0]
          }
        },
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(entradas);
    }

    if (tipo === 'estatisticas') {
      const hoje = new Date().toISOString().split('T')[0];
      
      const totalEntradasHoje = await prisma.entrada.count({
        where: { data: hoje }
      });

      const entradasPendentes = await prisma.entrada.count({
        where: { status: 'pendente' }
      });

      const entradasLiberadas = await prisma.entrada.count({
        where: { status: 'liberado' }
      });

      const entradasDirecao = await prisma.entrada.count({
        where: { status: 'direcao' }
      });

      // Contagem por turma
      const porTurma = await prisma.entrada.groupBy({
        by: ['turma_aluno'],
        where: { data: hoje },
        _count: { id: true }
      });

      // Contagem por aula
      const porAula = await prisma.entrada.groupBy({
        by: ['aula_numero'],
        where: { data: hoje },
        _count: { id: true }
      });

      return NextResponse.json({
        hoje: {
          total: totalEntradasHoje,
          pendentes: entradasPendentes,
          liberadas: entradasLiberadas,
          direcao: entradasDirecao
        },
        porTurma: porTurma.map(t => ({ turma: t.turma_aluno, count: t._count.id })),
        porAula: porAula.map(a => ({ aula: a.aula_numero, count: a._count.id }))
      });
    }

    return NextResponse.json({ error: 'Tipo não especificado' }, { status: 400 });

  } catch (error: any) {
    console.error('ERRO NA API DADOS:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
