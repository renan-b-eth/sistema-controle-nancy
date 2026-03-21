import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('Tentativa de login:', { username });

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    let userData = null;

    // 1. Tentar Login como Administrador (Email)
    // Para administradores, comparamos o email e senha exatamente como fornecidos
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

    // 2. Tentar Login como Aluno (RG/RA)
    if (!userData) {
      // De acordo com a LISTA_LOGINS_COMPLETA.txt, o login/senha é o RG.
      // Alguns RGs contêm hífens e letras (ex: 000111738164-X).
      // Vamos tentar buscar o aluno pelo RA ou RG usando o username fornecido.
      
      const aluno = await prisma.aluno.findFirst({
        where: {
          OR: [
            { ra: username },
            { rg: username }
          ]
        }
      });

      // A senha deve ser igual ao username (RG) conforme a regra da lista
      if (aluno && (username === password)) {
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
    console.error('ERRO CRÍTICO NO LOGIN:', error);
    return NextResponse.json({ 
      error: 'Erro de processamento no servidor.',
      details: error.message 
    }, { status: 500 });
  }
}
