import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import studentsData from '@/data/students.json';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    console.log('Iniciando Seed com Limpeza de Hífens...');

    // 1. Inserir Administradores
    const admins = [
      { nome: 'Carlos', email: 'carlos@adm.com', senha: 'carlos123' },
      { nome: 'Ivone', email: 'ivone@adm.com', senha: 'ivone123' },
    ];

    for (const admin of admins) {
      await prisma.admin.upsert({
        where: { email: admin.email },
        update: { senha: admin.senha },
        create: {
          id: randomUUID(),
          nome: admin.nome,
          email: admin.email,
          senha: admin.senha
        },
      });
    }

    // 2. Inserir Alunos do JSON com Limpeza
    for (const s of studentsData) {
      // REGRA: Remover hífens e espaços (Ex: 123-X -> 123X)
      const cleanRa = s.ra.replace(/[-\s]/g, '');
      const cleanRg = s.rg.replace(/[-\s]/g, '');

      await prisma.aluno.upsert({
        where: { ra: cleanRa },
        update: {
          nome: s.nome,
          rg: cleanRg,
          turma: s.turma,
          liberado_segunda_aula: s.liberadoSegundaAula ?? true
        },
        create: {
          id: randomUUID(), // Usando UUID para evitar erro de formato
          nome: s.nome,
          rg: cleanRg,
          ra: cleanRa,
          turma: s.turma,
          liberado_segunda_aula: s.liberadoSegundaAula ?? true
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seed Limpo finalizado! Carlos, Ivone e ${studentsData.length} alunos inseridos sem hífens.` 
    });

  } catch (error: any) {
    console.error('ERRO NO SEED:', error);
    return NextResponse.json({ error: 'Falha ao inserir dados', details: error.message }, { status: 500 });
  }
}
