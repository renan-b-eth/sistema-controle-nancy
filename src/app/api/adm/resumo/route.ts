import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const hoje = new Date().toISOString().split('T')[0];
    
    // Estatísticas do dia
    const entradasHoje = await prisma.entrada.count({
      where: { data: hoje }
    });

    const entradasPendentes = await prisma.entrada.count({
      where: { data: hoje, status: 'pendente' }
    });

    const entradasAutorizadas = await prisma.entrada.count({
      where: { data: hoje, status: 'autorizado' }
    });

    const entradasLiberadas = await prisma.entrada.count({
      where: { data: hoje, status: 'liberado' }
    });

    const entradasBloqueadas = await prisma.entrada.count({
      where: { data: hoje, status: 'direcao' }
    });

    // Total de alunos cadastrados
    const totalAlunos = await prisma.aluno.count();

    // Última entrada registrada
    const ultimaEntrada = await prisma.entrada.findFirst({
      orderBy: { created_at: 'desc' },
      take: 1
    });

    // Entradas dos últimos 7 dias (para gráfico)
    const ultimos7Dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      const count = await prisma.entrada.count({ where: { data: dataStr } });
      ultimos7Dias.push({ data: dataStr, count });
    }

    return NextResponse.json({
      sucesso: true,
      estatisticas: {
        hoje: {
          total: entradasHoje,
          pendentes: entradasPendentes,
          autorizadas: entradasAutorizadas,
          liberadas: entradasLiberadas,
          bloqueadas: entradasBloqueadas
        },
        total_alunos: totalAlunos,
        ultima_entrada: ultimaEntrada ? {
          nome: ultimaEntrada.nome_aluno,
          horario: ultimaEntrada.horario,
          status: ultimaEntrada.status
        } : null,
        grafico_7_dias: ultimos7Dias
      }
    });

  } catch (error: any) {
    console.error('ERRO NA API RESUMO:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
