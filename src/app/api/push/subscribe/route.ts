import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { cookies } from 'next/headers';

/**
 * POST /api/push/subscribe
 * Salva a subscription Push no banco para envio de notificações
 */
export async function POST(request: Request) {
  try {
    const { subscription } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Subscription inválida' },
        { status: 400 }
      );
    }

    // Verificar sessão do usuário
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    let userId = 'anonymous';
    let userProfile = 'unknown';
    
    if (session) {
      try {
        const userData = JSON.parse(session.value);
        userId = userData.id || userData.ra || userData.email || 'unknown';
        userProfile = userData.profile || 'unknown';
      } catch (e) {
        console.error('Erro ao parsear sessão:', e);
      }
    }

    // Extrair subscription data
    const { endpoint, keys } = subscription;
    const auth = keys?.auth || null;
    const p256dh = keys?.p256dh || null;

    // Verificar se já existe subscription para este endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      // Atualizar subscription existente
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          user_id: userId,
          user_profile: userProfile,
          auth,
          p256dh,
          updated_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existing.id);

      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription atualizada',
        id: existing.id
      });
    }

    // Inserir nova subscription
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        endpoint,
        user_id: userId,
        user_profile: userProfile,
        auth,
        p256dh,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription salva com sucesso',
      id: data.id
    });

  } catch (error: any) {
    console.error('Erro ao salvar subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar subscription', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove uma subscription (unsubscribe)
 */
export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription desativada'
    });

  } catch (error: any) {
    console.error('Erro ao remover subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao remover subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push/subscribe
 * Lista subscriptions do usuário atual
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userData = JSON.parse(session.value);
    const userId = userData.id || userData.ra || userData.email;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json({ 
      subscriptions: data || []
    });

  } catch (error: any) {
    console.error('Erro ao listar subscriptions:', error);
    return NextResponse.json(
      { error: 'Erro ao listar subscriptions' },
      { status: 500 }
    );
  }
}
