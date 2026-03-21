import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const body = await request.json();
    const user = JSON.parse(session.value);
    const id = nanoid();

    // GRAVAÇÃO VIA SQL PURO (Resolve erro de Cache de Schema 100%)
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "entradas" (
          "id", "protocolo", "data", "horario", "aula_numero", "status", 
          "nome_aluno", "ra_aluno", "rg_aluno", "turma_aluno", "aluno_id"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
      `, 
      id, body.protocolo, body.data, body.horario, Number(body.aula_numero), 'pendente',
      user.nome, user.ra, user.rg, user.turma, user.id.startsWith('fallback') ? null : user.id
      );
    } catch (sqlError: any) {
       console.error('ERRO NO SQL PURO:', sqlError.message);
       // Tenta novamente sem o $ syntax se falhar (alguns dialetos mudam)
       await prisma.$executeRawUnsafe(`
          INSERT INTO "entradas" ("id", "protocolo", "data", "horario", "aula_numero", "status", "nome_aluno", "ra_aluno", "rg_aluno", "turma_aluno")
          VALUES ('${id}', '${body.protocolo}', '${body.data}', '${body.horario}', ${Number(body.aula_numero)}, 'pendente', '${user.nome}', '${user.ra}', '${user.rg}', '${user.turma}')
       `);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ERRO CRÍTICO NO REGISTRO:', error);
    return NextResponse.json({ 
      error: 'Erro de banco de dados. Acesse /api/adm/fix-db para sincronizar as colunas e tente novamente.',
      details: error.message 
    }, { status: 500 });
  }
}
