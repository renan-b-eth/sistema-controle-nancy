import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const sessionUser = request.cookies.get('session_user');
  const { pathname } = request.nextUrl;

  // Se não houver sessão e tentar acessar áreas restritas, redireciona para login
  if (!sessionUser) {
    if (pathname.startsWith('/adm') || pathname.startsWith('/aluno')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se houver sessão, validar permissão de perfil (RBAC)
  if (sessionUser) {
    try {
      const user = JSON.parse(sessionUser.value);

      // 1. Aluno tentando entrar em ADM
      if (pathname.startsWith('/adm') && user.profile !== 'ADM') {
        return NextResponse.redirect(new URL('/aluno', request.url));
      }

      // 2. ADM tentando entrar em Aluno (Pode permitir ou redirecionar)
      if (pathname.startsWith('/aluno') && user.profile !== 'Aluno') {
         // ADM pode opcionalmente ver a área de aluno, mas aqui vamos manter separado
         return NextResponse.redirect(new URL('/adm', request.url));
      }

      // 3. Se logado tentar entrar na página de login, redireciona para seu painel
      if (pathname === '/login' || pathname === '/') {
        return user.profile === 'ADM' 
          ? NextResponse.redirect(new URL('/adm', request.url))
          : NextResponse.redirect(new URL('/aluno', request.url));
      }
    } catch (e) {
      // Se der erro no parse do cookie, limpa e manda pro login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_user');
      return response;
    }
  }

  return NextResponse.next();
}

// Aplicar middleware apenas nestas rotas
export const config = {
  matcher: ['/adm/:path*', '/aluno/:path*', '/login', '/'],
};
