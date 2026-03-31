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
    const minutoAtual = horaBrasilia.getMinutes();
    const horarioMinutos = horaAtual * 60 + minutoAtual; // Converter para minutos desde meia-noite
    const dataHoje = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

    // Check for bypass config
    const config = await prisma.config.findUnique({ where: { key: 'BYPASS_TIME_RESTRICTION' } });
    const isBypassActive = config?.value === 'true';

    // HORÁRIO DE ENTRADA: 19:00 (1185 min) até 20:10 (1210 min)
    const HORARIO_ENTRADA_INICIO = 19 * 60 + 45; // 19:00 = 1185 minutos
    const HORARIO_ENTRADA_FIM = 20 * 60 + 10;    // 20:10 = 1210 minutos
    
    let horarioStatus: 'permitido' | 'direcao' | 'fora_horario' = 'fora_horario';
    
    if (horarioMinutos >= HORARIO_ENTRADA_INICIO && horarioMinutos <= HORARIO_ENTRADA_FIM) {
      horarioStatus = 'permitido';
    } else if (horarioMinutos > HORARIO_ENTRADA_FIM) {
      horarioStatus = 'direcao';
    } else {
      horarioStatus = 'fora_horario';
    }

    let userData = null;

    // 1. LOGIN "GOD"
    if (cleanUser === '00000000000' && cleanPass === '00000000000') {
      userData = { id: 'god-test', nome: 'ALUNO GOD TESTE', ra: '00000000000', rg: '00000000000', turma: 'TESTE-ADM', profile: 'Aluno', liberadoSegundaAula: true };
    }

    // 2. Tentar Login via Banco de Dados
    if (!userData) {
      try {
        // Administrador
        const admin = await prisma.admin.findUnique({ where: { email: username } }); 
        if (admin && admin.senha === password) {
          userData = { id: admin.id, nome: admin.nome, email: admin.email, profile: 'ADM' };
        }

        // Aluno (Usando login LIMPO)
        if (!userData) {
          const aluno = await prisma.aluno.findFirst({
            where: { OR: [{ ra: cleanUser }, { rg: cleanUser }] }
          });

          if (aluno && (cleanUser === cleanPass)) {
            // VERIFICAÇÃO DE DUPLICIDADE (TRAVA DIÁRIA)
            const jaEntrou = await prisma.entrada.findFirst({
              where: { 
                ra_aluno: aluno.ra,
                data: dataHoje
              }
            });

            if (jaEntrou) {
              return NextResponse.json({ error: 'Você já realizou seu registro de entrada hoje. O acesso ao sistema só será permitido amanhã.' }, { status: 403 });
            }

            // VERIFICAÇÃO DE HORÁRIO (19:00 - 20:10)
            if (!isBypassActive) {
              if (horarioStatus === 'fora_horario') {
                return NextResponse.json({ 
                  error: '⏰ O login só funciona entre 19:00 e 20:10. Horário atual fora do período de entrada permitido.' 
                }, { status: 403 });
              }
              
              if (horarioStatus === 'direcao') {
                // Retorna dados com flag para direção
                return NextResponse.json({ 
                  redirectDirecao: true,
                  message: '🚨 Após 20:10, você deve se dirigir à DIREÇÃO/SECRETARIA para registrar sua entrada.',
                  aluno: {
                    nome: aluno.nome,
                    ra: aluno.ra,
                    turma: aluno.turma
                  }
                }, { status: 200 });
              }
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
          // VERIFICAÇÃO DE DUPLICIDADE FALLBACK
          const jaEntrouFallback = await prisma.entrada.findFirst({
            where: { 
              ra_aluno: student.ra,
              data: dataHoje
            }
          });

          if (jaEntrouFallback) {
            return NextResponse.json({ error: 'Você já realizou seu registro de entrada hoje. O acesso ao sistema só será permitido amanhã.' }, { status: 403 });
          }

          // VERIFICAÇÃO DE HORÁRIO FALLBACK
          if (!isBypassActive) {
            if (horarioStatus === 'fora_horario') {
              return NextResponse.json({ 
                error: '⏰ O login só funciona entre 19:00 e 20:10. Horário atual fora do período de entrada permitido.' 
              }, { status: 403 });
            }
            
            if (horarioStatus === 'direcao') {
              return NextResponse.json({ 
                redirectDirecao: true,
                message: '🚨 Após 20:10, você deve se dirigir à DIREÇÃO/SECRETARIA para registrar sua entrada.',
                aluno: {
                  nome: student.nome,
                  ra: student.ra,
                  turma: student.turma
                }
              }, { status: 200 });
            }
          }

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
