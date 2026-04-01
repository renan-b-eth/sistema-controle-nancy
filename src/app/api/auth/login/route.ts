import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome } = body;

    if (!nome || nome.trim().length < 3) {
      return NextResponse.json({ error: 'Digite seu nome completo.' }, { status: 400 });
    }

    const nomeBusca = nome.toUpperCase().trim();

    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtual = horaBrasilia.getHours();
    const minutoAtual = horaBrasilia.getMinutes();
    const horarioMinutos = horaAtual * 60 + minutoAtual;
    const dataHoje = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

    // Check for bypass config
    const config = await prisma.config.findUnique({ where: { key: 'BYPASS_TIME_RESTRICTION' } });
    const isBypassActive = config?.value === 'true';

    // HORÁRIO DE ENTRADA: 19:45 - 20:10
    const HORARIO_ENTRADA_INICIO = 19 * 60 + 45;
    const HORARIO_ENTRADA_FIM = 20 * 60 + 10;
    
    let horarioStatus: 'permitido' | 'direcao' | 'fora_horario' = 'fora_horario';
    
    if (horarioMinutos >= HORARIO_ENTRADA_INICIO && horarioMinutos <= HORARIO_ENTRADA_FIM) {
      horarioStatus = 'permitido';
    } else if (horarioMinutos > HORARIO_ENTRADA_FIM) {
      horarioStatus = 'direcao';
    } else {
      horarioStatus = 'fora_horario';
    }

    // Buscar aluno pelo nome (busca parcial para ser mais flexível)
    const aluno = await prisma.aluno.findFirst({
      where: { 
        nome: { contains: nomeBusca, mode: 'insensitive' }
      }
    });

    // Se não encontrou pelo nome completo, tentar busca mais flexível
    let alunoEncontrado = aluno;
    
    if (!alunoEncontrado) {
      // Buscar por partes do nome
      const palavrasNome = nomeBusca.split(' ').filter((p: string) => p.length > 2);
      for (const palavra of palavrasNome) {
        const encontrado = await prisma.aluno.findFirst({
          where: { 
            nome: { contains: palavra, mode: 'insensitive' }
          }
        });
        if (encontrado) {
          alunoEncontrado = encontrado;
          break;
        }
      }
    }

    if (!alunoEncontrado) {
      return NextResponse.json({ 
        error: 'Aluno não encontrado. Verifique se digitou o nome completo corretamente.' 
      }, { status: 404 });
    }

    // VERIFICAÇÃO DE DUPLICIDADE (TRAVA DIÁRIA)
    const jaEntrou = await prisma.entrada.findFirst({
      where: { 
        ra_aluno: alunoEncontrado.ra,
        data: dataHoje
      }
    });

    if (jaEntrou) {
      return NextResponse.json({ 
        error: 'Você já realizou seu registro de entrada hoje. O acesso ao sistema só será permitido amanhã.' 
      }, { status: 403 });
    }

    // VERIFICAÇÃO DE HORÁRIO
    if (!isBypassActive) {
      if (horarioStatus === 'fora_horario') {
        return NextResponse.json({ 
          error: '⏰ O login só funciona entre 19:45 e 20:10. Horário atual fora do período de entrada permitido.' 
        }, { status: 403 });
      }
      
      if (horarioStatus === 'direcao') {
        return NextResponse.json({ 
          redirectDirecao: true,
          message: '🚨 Após 20:10, você deve se dirigir à DIREÇÃO/SECRETARIA para registrar sua entrada.',
          aluno: {
            nome: alunoEncontrado.nome,
            ra: alunoEncontrado.ra,
            turma: alunoEncontrado.turma
          }
        }, { status: 200 });
      }
    }

    const userData = { 
      id: alunoEncontrado.id, 
      nome: alunoEncontrado.nome, 
      ra: alunoEncontrado.ra, 
      rg: alunoEncontrado.rg, 
      turma: alunoEncontrado.turma, 
      profile: 'Aluno', 
      liberadoSegundaAula: alunoEncontrado.liberado_segunda_aula 
    };

    const cookieStore = await cookies();
    cookieStore.set('session_user', JSON.stringify(userData), { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      maxAge: 60 * 60 * 24 
    });

    return NextResponse.json({ user: userData });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro técnico.', message: error.message }, { status: 500 });
  }
}
