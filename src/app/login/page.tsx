'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Audio base64 - Alerta sonoro simples (beep)
const ALERT_SOUND = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [direcaoMessage, setDirecaoMessage] = useState<string | null>(null);
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAlertSound = async () => {
    try {
      // Criar elemento audio dinamicamente
      const audio = new Audio(ALERT_SOUND);
      audio.volume = 0.7;
      await audio.play();
    } catch (err) {
      console.log('Audio autoplay blocked:', err);
      // Fallback: tentar após interação do usuário
      const fallbackAudio = new Audio(ALERT_SOUND);
      fallbackAudio.volume = 0.5;
      setTimeout(() => fallbackAudio.play().catch(() => {}), 100);
    }
  };

  const checkPendingAlunos = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/adm/alunos?status=pendente', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) return false;
      
      const data = await res.json();
      return data.alunos && data.alunos.length > 0;
    } catch (err) {
      console.error('Erro ao verificar pendentes:', err);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDirecaoMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      // Verificar se é redirecionamento para direção (após 20:10)
      if (data.redirectDirecao) {
        setDirecaoMessage(data.message || '🚨 Após 20:10, você deve se dirigir à DIREÇÃO/SECRETARIA para registrar sua entrada.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      // Salvar no localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // SE FOR ADM: Verificar alunos pendentes antes do redirect
      if (data.user.profile === 'ADM') {
        const hasPending = await checkPendingAlunos();
        
        if (hasPending) {
          // Disparar som de alerta
          await playAlertSound();
          
          // Pequeno delay para o som tocar antes do redirect
          setTimeout(() => {
            router.push('/adm');
          }, 500);
          return;
        }
      }

      router.push(data.user.profile === 'ADM' ? '/adm' : '/aluno');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-card/80 backdrop-blur-2xl p-6 sm:p-12 rounded-[2.5rem] shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-primary to-indigo-600 rounded-[1.5rem] shadow-xl shadow-primary/20 mb-4 sm:mb-6 transform hover:rotate-6 transition-transform">
              <span className="text-white text-3xl sm:text-4xl font-black italic">N</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">PortãoEdu</h1>
            <p className="text-secondary font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Escola Nancy de Oliveira Fidalgo</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">RA ou Email Gestão</label>
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu RA ou usuário"
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-background border border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground shadow-sm text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-background border border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground shadow-sm text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-bounce">
                ⚠️ {error}
              </div>
            )}

            {direcaoMessage && (
              <div className="p-6 bg-amber-50 text-amber-800 text-sm font-bold rounded-2xl border-2 border-amber-400 animate-pulse">
                <div className="text-2xl mb-2">🚨</div>
                {direcaoMessage}
                <div className="mt-4 text-xs text-amber-700">
                  Horário de entrada encerrado às 20:10. Dirija-se à secretaria para registrar sua presença.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AUTENTICANDO...
                </span>
              ) : 'ACESSAR PORTAL'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em]">
              Gestão Carlos & Ivone • PortãoEdu 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
