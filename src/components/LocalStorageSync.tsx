'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

/**
 * LocalStorageSync
 * Sincroniza dados do localStorage com o Supabase em tempo real
 */
export function LocalStorageSync() {
  
  const syncToSupabase = useCallback(async () => {
    try {
      // Obter dados do localStorage
      const userStr = localStorage.getItem('user');
      const sessionStr = localStorage.getItem('session_user');
      
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      
      // Sync tabela: user_sessions
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id || user.ra || user.email)
        .maybeSingle();
      
      const sessionData = {
        user_id: user.id || user.ra || user.email,
        user_ra: user.ra || null,
        user_rg: user.rg || null,
        nome: user.nome,
        turma: user.turma || null,
        profile: user.profile,
        email: user.email || null,
        liberado_segunda_aula: user.liberadoSegundaAula || false,
        session_data: session,
        local_storage_data: user,
        last_sync: new Date().toISOString(),
        is_active: true,
        user_agent: navigator.userAgent,
        platform: navigator.platform
      };
      
      if (existingSession) {
        await supabase
          .from('user_sessions')
          .update(sessionData)
          .eq('id', existingSession.id);
      } else {
        await supabase
          .from('user_sessions')
          .insert({
            ...sessionData,
            created_at: new Date().toISOString()
          });
      }
      
      // Sync tabela: user_activities
      await supabase.from('user_activities').insert({
        user_id: user.id || user.ra || user.email,
        activity_type: 'sync',
        details: { source: 'localStorage', action: 'auto_sync' },
        timestamp: new Date().toISOString()
      });
      
      console.log('[Sync] localStorage → Supabase OK');
      
    } catch (error) {
      console.error('[Sync] Erro ao sincronizar:', error);
    }
  }, []);
  
  const clearSupabaseSession = useCallback(async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          last_sync: new Date().toISOString()
        })
        .eq('user_id', user.id || user.ra || user.email);
      
      await supabase.from('user_activities').insert({
        user_id: user.id || user.ra || user.email,
        activity_type: 'logout',
        details: { source: 'localStorage', action: 'clear' },
        timestamp: new Date().toISOString()
      });
      
      console.log('[Sync] Sessão marcada como inativa');
      
    } catch (error) {
      console.error('[Sync] Erro ao limpar sessão:', error);
    }
  }, []);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Sync inicial
    syncToSupabase();
    
    // Setup interval de sync (a cada 30 segundos)
    const syncInterval = setInterval(syncToSupabase, 30000);
    
    // Escutar mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'session_user') {
        syncToSupabase();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Sync antes de fechar a página
    const handleBeforeUnload = () => {
      clearSupabaseSession();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [syncToSupabase, clearSupabaseSession]);
  
  return null; // Componente não renderiza nada
}
