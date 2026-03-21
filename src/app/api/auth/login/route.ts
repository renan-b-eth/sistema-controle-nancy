import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const normalizedUser = username.replace(/\D/g, '');
    const normalizedPass = password.replace(/\D/g, '');

    let userData = null;

    // 1. Tentar Login como Administrador (Email)
    try {
      const admin = await prisma.admin.findUnique({
        where: { email: username }
      });

      if (admin && admin.senha === password) {
        userData = {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          profile: 'ADM'
        };
      }
    } catch (dbError) {
      console.error('Erro ao buscar Admin no banco:', dbError);
      // Se o erro for de conexão, continuamos para tentar o aluno ou falhar no fim
    }

    // 2. Tentar Login como Aluno (RA)
    if (!userData && normalizedUser === normalizedPass && normalizedUser.length > 0) {
      try {
        const aluno = await prisma.aluno.findUnique({
          where: { ra: normalizedUser }
        });

        if (aluno) {
          userData = {
            id: aluno.id,
            nome: aluno.nome,
            ra: aluno.ra,
            rg: aluno.rg,
            turma: aluno.turma,
            profile: 'Aluno',
            liberadoSegundaAula: aluno.liberado_segunda_aula
          };
        }
      } catch (dbError) {
        console.error('Erro ao buscar Aluno no banco:', dbError);
      }
    }

    if (userData) {
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 horas
      });

      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas. Verifique seus dados.' }, { status: 401 });

  } catch (error: any) {
    console.error('CRITICAL LOGIN ERROR:', error);
    return NextResponse.json({ 
      error: 'Erro de conexão com o banco de dados. Verifique se o banco está ativo.',
      details: error.message 
    }, { status: 500 });
  }
}
