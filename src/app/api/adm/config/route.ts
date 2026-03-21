import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const config = await prisma.config.findUnique({ where: { key: 'BYPASS_TIME_RESTRICTION' } });
    return NextResponse.json({ bypass: config?.value === 'true' });
  } catch (e) {
    return NextResponse.json({ bypass: false });
  }
}

export async function POST(request: Request) {
  try {
    const { bypass } = await request.json();
    
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    if (!session || JSON.parse(session.value).profile !== 'ADM') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    await prisma.config.upsert({
      where: { key: 'BYPASS_TIME_RESTRICTION' },
      update: { value: String(bypass) },
      create: { key: 'BYPASS_TIME_RESTRICTION', value: String(bypass) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
