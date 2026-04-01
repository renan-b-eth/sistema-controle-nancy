'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/utils/supabase'; 
import { getAulaAtual, getDataEscolar } from '@/utils/horarios';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState('aguardando');
  const [protocolo, setProtocolo] = useState('');
  const [mounted, setMounted] = useState(false);
  const [termoAceito, setTermoAceito] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  // 1. Inicialização da Sessão
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setMounted(true);
  }, [router]);

  /**
   * 2. SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
   * Este Effect é responsável por ouvir o sinal 'UPDATE' do Supabase
   */
  useEffect(() => {
    if (!mounted || !user) return;

    const seuAlunoId = user.id;

    // A. BUSCA INICIAL: Garante que o status esteja correto ao carregar a página
    const fetchInitialStatus = async () => {
      const { data } = await supabase
        .from('entradas')
        .select('status, protocolo')
        .eq('ra_aluno', user.ra)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setStatus(data.status);
        setProtocolo(data.protocolo);
      }
    };

    fetchInitialStatus();

    // B. SUBSGRIÇÃO WEBOCKET: Escuta mudanças na tabela 'entradas'
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entradas',
          filter: `ra_aluno=eq.${user.ra}`
        },
        (payload: any) => {
          console.log('Sinal recebido do Supabase!', payload);
          // A MÁGICA ACONTECE AQUI: Atualiza o estado e re-renderiza o componente
          setStatus(payload.new.status); 
        }
      )
      .subscribe((statusConn: any) => {
        console.log('Status da conexão Realtime:', statusConn);
      });

    // C. LIMPEZA: Remove o canal ao sair da página ou deslogar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted, user]);

  // 3. Lógica do Cronômetro de Segurança
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  // Registro automático de entrada (se não existir)
  useEffect(() => {
    if (!mounted || !user) return;
    // Não registrar automaticamente - esperar o aluno clicar no botão
  }, [mounted, user]);

  const registrarEntrada = async () => {
    if (!user || protocolo) return;
    
    setLoading(true);
    try {
      let aula = getAulaAtual() || { numero: 1 };
      const res = await fetch('/api/entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          protocolo: `PE-${Date.now()}`, 
          aula_numero: aula.numero, 
          horario: new Date().toLocaleTimeString('pt-BR'), 
          data: getDataEscolar() 
        })
      });
      const data = await res.json();
      if (data.protocolo) {
        setProtocolo(data.protocolo);
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Erro ao registrar:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) return null;

  // Determinação visual por estado
  const isLiberado = status === 'liberado' || status === 'autorizado';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-700 ${
      isLiberado ? 'bg-emerald-500' : 'bg-blue-600'
    }`}>
      
      {timerRunning && (
        <div className="fixed top-10 animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-2 rounded-full shadow-2xl border border-white/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Saindo em: {timeLeft}s</p>
          </div>
        </div>
      )}

      <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
        
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl transition-colors duration-700 ${
            isLiberado ? 'bg-emerald-500' : 'bg-blue-600'
          }`}>N</div>
          <h1 className="text-xl font-black text-slate-900 italic tracking-tighter">PortãoEdu</h1>
        </div>

        {status === 'aguardando' || status === 'pendente' ? (
          <div className="space-y-6">
            <div className="text-6xl animate-bounce text-blue-600">⏳</div>
            <h2 className="text-3xl font-black text-blue-600 uppercase italic leading-none">Aguardando</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Olá <span className="font-bold text-slate-900">{user.nome.split(' ')[0]}</span>, clique no botão abaixo para registrar sua entrada. 
              <br/> Aguarda que a <span className="font-bold text-slate-900">Ivone ou o Carlos</span> autorizem no sistema.
            </p>
            
            {/* Botão Grande de Registrar Entrada */}
            {!protocolo && (
              <button
                onClick={registrarEntrada}
                disabled={loading}
                className={`w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ENVIANDO...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <span className="text-3xl">👆</span>
                    REGISTRAR ENTRADA
                  </span>
                )}
              </button>
            )}
            
            {protocolo && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                Sincronia Live Ativa
              </div>
            )}
          </div>
        ) : isLiberado ? (
          <div className="space-y-6">
            <div className="text-6xl text-emerald-500">✅</div>
            <h2 className="text-3xl font-black text-emerald-600 uppercase italic leading-none">Liberado!</h2>
            
            {status === 'autorizado' ? (
              <div className="space-y-6">
                <p className="text-slate-600 font-medium">
                  Olá <span className="font-bold text-slate-900 uppercase">{user.nome.split(' ')[0]}</span>, a tua entrada foi autorizada. Estás <span className="underline font-bold">LIBERADO</span>.
                </p>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-start gap-4 text-left cursor-pointer" onClick={() => {
                  setTermoAceito(!termoAceito);
                  if (!termoAceito) setTimerRunning(true);
                }}>
                  <div className={`w-6 h-6 min-w-[24px] rounded-md border-2 flex items-center justify-center transition-all ${termoAceito ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {termoAceito && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold italic leading-tight">Eu afirmo que já assinei o documento manual na coordenação e aceito as políticas da escola.</span>
                </div>

                <button 
                  disabled={!termoAceito} 
                  className={`w-full py-5 rounded-2xl font-black uppercase text-xs shadow-xl transition-all ${
                    termoAceito ? 'bg-emerald-500 text-white hover:scale-[1.02]' : 'bg-slate-100 text-slate-300'
                  }`}
                  onClick={async () => {
                    const res = await fetch('/api/entradas/signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ protocolo: protocolo, status: 'assinado' })
                    });
                    if (res.ok) setStatus('liberado');
                  }}
                >
                  Confirmar Entrada
                </button>
              </div>
            ) : (
              <div className="py-10 space-y-4 text-slate-900">
                <p className="font-black text-2xl italic">Bom estudo!</p>
                <p className="text-slate-500 text-xs italic">Registro concluído. Saindo em {timeLeft}s...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600 font-black uppercase text-center space-y-4">
            <div className="text-6xl">🚨</div>
            <h2 className="text-2xl">Direção</h2>
            <p className="text-xs lowercase first-letter:uppercase">Vai à coordenação pessoalmente.</p>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 opacity-30">
          <QRCodeCanvas value={protocolo || 'loading'} size={80} className="mx-auto" />
        </div>
      </div>

      <footer className="mt-10 text-white/50 text-[9px] font-black uppercase tracking-[0.3em]">
        PortãoEdu • Nancy Management System • 2026
      </footer>
    </div>
  );
}
