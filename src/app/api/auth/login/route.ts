import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const normalizedUser = username.replace(/\D/g, '');
    const normalizedPass = password.replace(/\D/g, '');

    let userData = null;

    // 1. Administrador
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

    // 2. Aluno
    if (!userData && normalizedUser === normalizedPass && normalizedUser.length > 0) {
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
    }

    if (userData) {
      // Configurar Cookie Seguro
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 horas
      });

      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
