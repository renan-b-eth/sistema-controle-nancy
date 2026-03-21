import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionUser = request.cookies.get('session_user');
  const { pathname } = request.nextUrl;

  // 1. SE NÃO ESTIVER LOGADO
  if (!sessionUser) {
    // Redireciona TUDO para /login, exceto arquivos de sistema e a própria tela de login
    if (pathname !== '/login' && !pathname.includes('.') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. SE ESTIVER LOGADO
  try {
    const user = JSON.parse(sessionUser.value);

    // ADM continua com persistência normal
    if (user.profile === 'ADM') {
      if (pathname === '/login' || pathname === '/') {
        return NextResponse.redirect(new URL('/adm', request.url));
      }
      return NextResponse.next();
    }

    // ALUNO: NUNCA redirecionar automaticamente para /aluno se ele estiver no /login
    // Queremos forçar o login a cada nova tentativa de entrada.
    if (user.profile === 'Aluno') {
      // Se ele tentar entrar na ADM, manda pra sua área
      if (pathname.startsWith('/adm')) {
        return NextResponse.redirect(new URL('/aluno', request.url));
      }
      
      // Se ele estiver no login ou na home, DEIXA ele logar de novo (não redireciona pro dashboard)
      // Isso permite que o próximo aluno use o aparelho sem ver o dashboard do anterior
      if (pathname === '/login' || pathname === '/') {
        return NextResponse.next();
      }
    }

  } catch (e) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session_user');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
