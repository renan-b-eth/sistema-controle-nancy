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

    // --- TRAVA DE SEGURANÇA POR HORÁRIO ---
    // Obtém a hora atual no fuso de Brasília (GMT-3)
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtual = horaBrasilia.getHours();

    let userData = null;

    // 1. Tentar Login via Banco de Dados (Produção)
    try {
      // Login ADM (Sempre permitido)
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

      // Login Aluno via DB (Apenas após as 19h)
      if (!userData) {
        const aluno = await prisma.aluno.findFirst({
          where: {
            OR: [{ ra: username }, { rg: username }]
          }
        });

        if (aluno && (username === password)) {
          // Validar horário para alunos
          if (horaAtual < 19) {
            return NextResponse.json({ 
              error: 'O login só vai funcionar quando estiver em horário escolar por segurança (a partir das 19:00).' 
            }, { status: 403 });
          }

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
    }

    // 2. Redundância: Tentar Login via JSON (Fallback)
    if (!userData) {
      // Fallback ADM
      if ((username === 'carlos@adm.com' && password === 'carlos123') || 
          (username === 'ivone@adm.com' && password === 'ivone123')) {
        userData = {
          id: 'fallback-adm',
          nome: username === 'carlos@adm.com' ? 'Carlos' : 'Ivone',
          email: username,
          profile: 'ADM'
        };
      }

      // Fallback Aluno via students.json (Apenas após as 19h)
      if (!userData) {
        const student = studentsData.find(s => (s.rg === username || s.ra === username) && username === password);
        if (student) {
          // Validar horário para alunos no fallback também
          if (horaAtual < 19) {
            return NextResponse.json({ 
              error: 'O login só vai funcionar quando estiver em horário escolar por segurança (a partir das 19:00).' 
            }, { status: 403 });
          }

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
