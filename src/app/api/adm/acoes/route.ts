import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = JSON.parse(session.value);
    const body = await request.json();
    const { acao, entradas_ids, status } = body;

    if (!entradas_ids || !Array.isArray(entradas_ids) || entradas_ids.length === 0) {
      return NextResponse.json({ error: 'Nenhuma entrada selecionada.' }, { status: 400 });
    }

    const autorizadosPor = user.nome;

    if (acao === 'aprovar_todos') {
      // Aprovar múltiplas entradas
      await prisma.entrada.updateMany({
        where: { id: { in: entradas_ids } },
        data: {
          status: 'autorizado',
          autorizado_por: autorizadosPor
        }
      });
      return NextResponse.json({ 
        success: true, 
        message: `${entradas_ids.length} entradas autorizadas.` 
      });
    }

    if (acao === 'rejeitar_todos') {
      // Rejeitar múltiplas entradas (encaminhar para direção)
      await prisma.entrada.updateMany({
        where: { id: { in: entradas_ids } },
        data: {
          status: 'direcao',
          autorizado_por: autorizadosPor
        }
      });
      return NextResponse.json({ 
        success: true, 
        message: `${entradas_ids.length} entradas encaminhadas para direção.` 
      });
    }

    if (acao === 'liberar_todos') {
      // Liberar diretamente múltiplas entradas
      await prisma.entrada.updateMany({
        where: { id: { in: entradas_ids } },
        data: {
          status: 'liberado',
          autorizado_por: autorizadosPor,
          assinatura_status: 'assinado'
        }
      });
      return NextResponse.json({ 
        success: true, 
        message: `${entradas_ids.length} entradas liberadas.` 
      });
    }

    if (acao === 'excluir_todos') {
      // Excluir múltiplas entradas
      await prisma.entrada.deleteMany({
        where: { id: { in: entradas_ids } }
      });
      return NextResponse.json({ 
        success: true, 
        message: `${entradas_ids.length} entradas excluídas.` 
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });

  } catch (error: any) {
    console.error('ERRO NA API AÇÕES EM LOTE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
