import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

// Listar Alunos
export async function GET() {
  try {
    const alunos = await prisma.aluno.findMany({
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(alunos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 });
  }
}

// Cadastrar Novo Aluno
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, ra, rg, turma } = body;

    // Limpeza padrão de hífens
    const cleanRa = ra.replace(/[-\s]/g, '');
    const cleanRg = rg.replace(/[-\s]/g, '');

    const novoAluno = await prisma.aluno.create({
      data: {
        id: randomUUID(),
        nome: nome.toUpperCase(),
        ra: cleanRa,
        rg: cleanRg,
        turma: turma,
        liberado_segunda_aula: true
      }
    });

    return NextResponse.json(novoAluno);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cadastrar aluno. Verifique se o RA já existe.', details: error.message }, { status: 500 });
  }
}

// Deletar Aluno
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID não informado' }, { status: 400 });

    await prisma.aluno.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar aluno' }, { status: 500 });
  }
}
