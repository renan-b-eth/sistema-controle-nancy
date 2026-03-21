import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const body = await request.json();
    const user = JSON.parse(session.value);
    
    // Dados para gravação
    const payload = {
      id: randomUUID(),
      protocolo: body.protocolo,
      data: body.data,
      horario: body.horario,
      aula_numero: Number(body.aula_numero),
      status: 'pendente',
      nome_aluno: user.nome,
      ra_aluno: user.ra,
      rg_aluno: user.rg,
      turma_aluno: user.turma,
      // Se for GOD ou fallback, o aluno_id vai nulo para não quebrar a Foreign Key
      aluno_id: (user.id && !user.id.includes('test') && !user.id.includes('fallback')) ? user.id : null
    };

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro interno: Supabase não configurado.' }, { status: 500 });
    }

    // GRAVAÇÃO VIA CLIENTE SUPABASE (Muito mais resiliente que Prisma)
    const { error: dbError } = await supabaseAdmin
      .from('entradas')
      .insert([payload]);

    if (dbError) {
      console.error('ERRO SUPABASE DIRETO:', dbError);
      throw new Error(`[Supabase Error] ${dbError.message} (Código: ${dbError.code})`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('FALHA CRÍTICA NO REGISTRO:', error.message);
    return NextResponse.json({ 
      error: 'Falha ao registrar no banco de dados.',
      details: error.message,
      tip: 'Verifique se a tabela "entradas" existe no Supabase com as colunas corretas.'
    }, { status: 500 });
  }
}
