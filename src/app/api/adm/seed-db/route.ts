import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import studentsData from '@/data/students.json';

export async function GET() {
  try {
    console.log('Iniciando Seed via API...');

    // 1. Inserir Administradores
    const admins = [
      { nome: 'Carlos', email: 'carlos@adm.com', senha: 'carlos123' },
      { nome: 'Ivone', email: 'ivone@adm.com', senha: 'ivone123' },
    ];

    for (const admin of admins) {
      await prisma.admin.upsert({
        where: { email: admin.email },
        update: { senha: admin.senha },
        create: admin,
      });
    }

    // 2. Inserir Alunos do JSON
    for (const s of studentsData) {
      await prisma.aluno.upsert({
        where: { ra: s.ra },
        update: {
          nome: s.nome,
          rg: s.rg,
          turma: s.turma,
          liberado_segunda_aula: s.liberadoSegundaAula ?? true
        },
        create: {
          nome: s.nome,
          rg: s.rg,
          ra: s.ra,
          turma: s.turma,
          liberado_segunda_aula: s.liberadoSegundaAula ?? true
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seed finalizado! Carlos, Ivone e ${studentsData.length} alunos foram inseridos/atualizados.` 
    });

  } catch (error: any) {
    console.error('ERRO NO SEED:', error);
    return NextResponse.json({ error: 'Falha ao inserir dados', details: error.message }, { status: 500 });
  }
}
