import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionUser = request.cookies.get('session_user');
  const { pathname } = request.nextUrl;

  // Se não houver sessão
  if (!sessionUser) {
    // Redireciona tudo (Home, ADM, Aluno) para /login, exceto a própria página de login e arquivos estáticos
    if (pathname === '/' || pathname.startsWith('/adm') || pathname.startsWith('/aluno')) {
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

      // 2. ADM tentando entrar em Aluno
      if (pathname.startsWith('/aluno') && user.profile !== 'Aluno') {
         return NextResponse.redirect(new URL('/adm', request.url));
      }

      // 3. Se logado tentar entrar na página de login ou home, vai para seu painel
      if (pathname === '/login' || pathname === '/') {
        return user.profile === 'ADM' 
          ? NextResponse.redirect(new URL('/adm', request.url))
          : NextResponse.redirect(new URL('/aluno', request.url));
      }
    } catch (e) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_user');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/adm/:path*', '/aluno/:path*', '/login', '/'],
};
