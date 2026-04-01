import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    let userData = null;

    // 1. Tentar Login via Banco de Dados
    try {
      const admin = await prisma.admin.findUnique({ where: { email: email } }); 
      if (admin && admin.senha === password) {
        userData = { id: admin.id, nome: admin.nome, email: admin.email, profile: 'ADM' };
      }
    } catch (dbError) {
      console.error('Database Error:', dbError);
    }

    // 2. Fallback para admins padrão
    if (!userData) {
      if ((email === 'carlos@adm.com' && password === 'carlos123') || 
          (email === 'ivone@adm.com' && password === 'ivone123')) {
        userData = { 
          id: 'fallback-adm', 
          nome: email === 'carlos@adm.com' ? 'Carlos' : 'Ivone', 
          email: email, 
          profile: 'ADM' 
        };
      }
    }

    if (userData) {
      const cookieStore = await cookies();
      cookieStore.set('session_user', JSON.stringify(userData), { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        maxAge: 60 * 60 * 24 
      });
      return NextResponse.json({ user: userData });
    }

    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro técnico.', message: error.message }, { status: 500 });
  }
}
