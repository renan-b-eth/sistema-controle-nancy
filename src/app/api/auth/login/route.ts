import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';
import studentsData from '@/data/students.json';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    let userData = null;

    // 1. Tentar Login via Banco de Dados (Produção)
    try {
      // Login ADM
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

      // Login Aluno via DB
      if (!userData) {
        const aluno = await prisma.aluno.findFirst({
          where: {
            OR: [{ ra: username }, { rg: username }]
          }
        });

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
    } catch (dbError: any) {
      console.error('DATABASE ERROR:', dbError.message);
      // Se o banco falhar, o userData continuará null e passaremos para a redundância JSON abaixo
    }

    // 2. Redundância: Tentar Login via JSON (Fallback caso o DB esteja offline)
    if (!userData) {
      // Fallback ADM (Hardcoded para emergências)
      if ((username === 'carlos@adm.com' && password === 'carlos123') || 
          (username === 'ivone@adm.com' && password === 'ivone123')) {
        userData = {
          id: 'fallback-adm',
          nome: username === 'carlos@adm.com' ? 'Carlos' : 'Ivone',
          email: username,
          profile: 'ADM'
        };
      }

      // Fallback Aluno via students.json
      if (!userData) {
        const student = studentsData.find(s => (s.rg === username || s.ra === username) && username === password);
        if (student) {
          userData = {
            id: `fallback-${student.ra}`,
            nome: student.nome,
            ra: student.ra,
            rg: student.rg,
            turma: student.turma,
            profile: 'Aluno',
            liberadoSegundaAula: student.liberadoSegundaAula
          };
        }
      }
    }

    if (userData) {
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24
      });

      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas. Verifique os dados da lista.' }, { status: 401 });

  } catch (error: any) {
    console.error('FATAL ERROR:', error);
    return NextResponse.json({ 
      error: 'Erro crítico no processamento.',
      message: error.message 
    }, { status: 500 });
  }
}
