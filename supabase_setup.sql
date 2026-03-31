-- ============================================================================
-- PortãoEdu - SQL para Supabase
-- Web Push Notifications + localStorage Sync
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- ============================================================================
-- TABELA: push_subscriptions
-- Armazena as subscriptions de Web Push dos dispositivos
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_profile TEXT NOT NULL DEFAULT 'unknown',
    auth TEXT,
    p256dh TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active 
    ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_profile 
    ON push_subscriptions(user_profile);

-- Comentários da tabela
COMMENT ON TABLE push_subscriptions IS 'Armazena subscriptions de Web Push para notificações';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL endpoint do serviço de push (único por dispositivo)';
COMMENT ON COLUMN push_subscriptions.user_id IS 'ID do usuário (RA, email ou ID do sistema)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Chave de autenticação da subscription';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Chave pública P-256 da subscription';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at_trigger ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at_trigger
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================================================
-- TABELA: user_sessions
-- Sincroniza dados do localStorage com o banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_ra TEXT,
    user_rg TEXT,
    nome TEXT NOT NULL,
    turma TEXT,
    profile TEXT NOT NULL,
    email TEXT,
    liberado_segunda_aula BOOLEAN DEFAULT false,
    session_data JSONB,
    local_storage_data JSONB,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    user_agent TEXT,
    platform TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
    ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
    ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_sync 
    ON user_sessions(last_sync);

-- Comentários
COMMENT ON TABLE user_sessions IS 'Sessões de usuários sincronizadas do localStorage';
COMMENT ON COLUMN user_sessions.session_data IS 'Dados da sessão (cookies)';
COMMENT ON COLUMN user_sessions.local_storage_data IS 'Dados completos do localStorage';
COMMENT ON COLUMN user_sessions.last_sync IS 'Última sincronização';

-- ============================================================================
-- TABELA: user_activities
-- Log de atividades dos usuários
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id 
    ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp 
    ON user_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type 
    ON user_activities(activity_type);

-- Comentários
COMMENT ON TABLE user_activities IS 'Log de atividades dos usuários para auditoria';
COMMENT ON COLUMN user_activities.activity_type IS 'Tipo: sync, logout, login, etc';
COMMENT ON COLUMN user_activities.details IS 'Detalhes adicionais em JSON';

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Política: push_subscriptions - apenas usuários autenticados
CREATE POLICY "Allow all operations on push_subscriptions" 
    ON push_subscriptions 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Política: user_sessions - apenas usuários autenticados
CREATE POLICY "Allow all operations on user_sessions" 
    ON user_sessions 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Política: user_activities - apenas usuários autenticados
CREATE POLICY "Allow all operations on user_activities" 
    ON user_activities 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Políticas para service_role (sempre permitir)
CREATE POLICY "Allow service_role full access on push_subscriptions" 
    ON push_subscriptions 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on user_sessions" 
    ON user_sessions 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on user_activities" 
    ON user_activities 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para enviar notificação push (simulada - usar com Edge Functions)
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_subscription RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_subscription IN 
        SELECT * FROM push_subscriptions 
        WHERE user_id = p_user_id AND is_active = true
    LOOP
        v_count := v_count + 1;
        -- Aqui você integraria com uma Edge Function ou webhook
        -- para enviar a notificação real
    END LOOP;
    
    RETURN QUERY SELECT 
        CASE WHEN v_count > 0 THEN true ELSE false END,
        format('Encontradas %s subscriptions para envio', v_count);
END;
$$ LANGUAGE plpgsql;

-- Função para obter usuários online (últimos 5 minutos)
CREATE OR REPLACE FUNCTION get_online_users()
RETURNS TABLE (
    user_id TEXT,
    nome TEXT,
    profile TEXT,
    last_sync TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (us.user_id)
        us.user_id,
        us.nome,
        us.profile,
        us.last_sync
    FROM user_sessions us
    WHERE us.is_active = true
        AND us.last_sync > NOW() - INTERVAL '5 minutes'
    ORDER BY us.user_id, us.last_sync DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DADOS DE EXEMPLO (opcional - remover em produção)
-- ============================================================================

-- Exemplo: Inserir subscription de teste
-- INSERT INTO push_subscriptions (endpoint, user_id, user_profile, auth, p256dh)
-- VALUES (
--     'https://fcm.googleapis.com/fcm/send/test123',
--     '00000000000',
--     'ADM',
--     'test_auth_key',
--     'test_p256dh_key'
-- );

-- ============================================================================
-- CONFIGURAÇÃO FINAL
-- ============================================================================

-- Verificar tabelas criadas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('push_subscriptions', 'user_sessions', 'user_activities')
ORDER BY table_name, ordinal_position;

-- Sucesso!
-- Agora configure a VAPID key no arquivo .env.local:
-- NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica_aqui
