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

    // REGRA DE LIMPEZA: Remove hífens e espaços do input do usuário
    const cleanUser = username.replace(/[-\s]/g, '');
    const cleanPass = password.replace(/[-\s]/g, '');

    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtual = horaBrasilia.getHours();

    let userData = null;

    // 1. LOGIN "GOD"
    if (cleanUser === '00000000000' && cleanPass === '00000000000') {
      userData = { id: 'god-test', nome: 'ALUNO GOD TESTE', ra: '00000000000', rg: '00000000000', turma: 'TESTE-ADM', profile: 'Aluno', liberadoSegundaAula: true };
    }

    // 2. Tentar Login via Banco de Dados
    if (!userData) {
      try {
        // Administrador
        const admin = await prisma.admin.findUnique({ where: { email: username } }); // Email mantém original
        if (admin && admin.senha === password) {
          userData = { id: admin.id, nome: admin.nome, email: admin.email, profile: 'ADM' };
        }

        // Aluno (Usando login LIMPO)
        if (!userData) {
          const aluno = await prisma.aluno.findFirst({
            where: { OR: [{ ra: cleanUser }, { rg: cleanUser }] }
          });

          if (aluno && (cleanUser === cleanPass)) {
            if (horaAtual < 19) {
              return NextResponse.json({ error: 'O login só vai funcionar quando estiver em horário escolar por segurança.' }, { status: 403 });
            }
            userData = { id: aluno.id, nome: aluno.nome, ra: aluno.ra, rg: aluno.rg, turma: aluno.turma, profile: 'Aluno', liberadoSegundaAula: aluno.liberado_segunda_aula };
          }
        }
      } catch (dbError) {
        console.error('Database Error:', dbError);
      }
    }

    // 3. Fallback Redundância
    if (!userData) {
      // ADM Fallback
      if ((username === 'carlos@adm.com' && password === 'carlos123') || (username === 'ivone@adm.com' && password === 'ivone123')) {
        userData = { id: 'fallback-adm', nome: username === 'carlos@adm.com' ? 'Carlos' : 'Ivone', email: username, profile: 'ADM' };
      }
      // Aluno Fallback (Usando login LIMPO)
      if (!userData) {
        const student = studentsData.find(s => {
          const sCleanRa = s.ra.replace(/[-\s]/g, '');
          const sCleanRg = s.rg.replace(/[-\s]/g, '');
          return (sCleanRa === cleanUser || sCleanRg === cleanUser) && cleanUser === cleanPass;
        });
        if (student) {
          if (horaAtual < 19) return NextResponse.json({ error: 'O login só vai funcionar em horário escolar.' }, { status: 403 });
          userData = { id: `fallback-${student.ra}`, nome: student.nome, ra: student.ra, rg: student.rg, turma: student.turma, profile: 'Aluno', liberadoSegundaAula: student.liberadoSegundaAula ?? true };
        }
      }
    }

    if (userData) {
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 });
      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro técnico.', message: error.message }, { status: 500 });
  }
}
