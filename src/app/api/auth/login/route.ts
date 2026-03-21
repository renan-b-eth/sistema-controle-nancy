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

    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtual = horaBrasilia.getHours();

    let userData = null;

    // 1. Administrador (Sempre permitido)
    const admin = await prisma.admin.findUnique({ where: { email: username } });
    if (admin && admin.senha === password) {
      userData = { id: admin.id, nome: admin.nome, email: admin.email, profile: 'ADM' };
    }

    // 2. Aluno (Regra de Horário)
    if (!userData) {
      // Caso especial: LOGIN GOD (Ignora horário)
      if (username === '00000000000' && password === '00000000000') {
        userData = {
          id: 'god-test',
          nome: 'ALUNO GOD TESTE',
          ra: '00000000000',
          rg: '00000000000',
          turma: 'TESTE-ADM',
          profile: 'Aluno',
          liberadoSegundaAula: true
        };
      } else {
        // Alunos Normais
        const aluno = await prisma.aluno.findFirst({
          where: { OR: [{ ra: username }, { rg: username }] }
        });

        if (aluno && (username === password)) {
          if (horaAtual < 19) {
            return NextResponse.json({ 
              error: 'O login só vai funcionar quando estiver em horário escolar por segurança (a partir das 19:00).' 
            }, { status: 403 });
          }
          userData = {
            id: aluno.id, nome: aluno.nome, ra: aluno.ra, rg: aluno.rg,
            turma: aluno.turma, profile: 'Aluno', liberadoSegundaAula: aluno.liberado_segunda_aula
          };
        }
      }
    }

    // 3. Fallback JSON (Se o banco falhar)
    if (!userData) {
       // ... lógica de fallback ADM e Aluno normal já existente ...
       const student = studentsData.find(s => (s.rg === username || s.ra === username) && username === password);
       if (student) {
          if (horaAtual < 19 && username !== '00000000000') {
            return NextResponse.json({ error: 'O login só vai funcionar quando estiver em horário escolar por segurança.' }, { status: 403 });
          }
          userData = {
            id: `fallback-${student.ra}`, nome: student.nome, ra: student.ra, rg: student.rg,
            turma: student.turma, profile: 'Aluno', liberadoSegundaAula: student.liberadoSegundaAula
          };
       }
    }

    if (userData) {
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24
      });
      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro crítico.', message: error.message }, { status: 500 });
  }
}
