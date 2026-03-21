'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';
import { supabase } from '@/utils/supabase';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'autorizado' | 'liberado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  
  const router = useRouter();
  const statusRef = useRef('pendente');

  useEffect(() => { statusRef.current = statusAtual; }, [statusAtual]);

  // 1. Inicialização
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    setMounted(true);
  }, [router]);

  // 2. Cronómetro Regressivo (Logout automático)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      handleLogout();
    }
    return () => clearTimeout(timer);
  }, [timerRunning, timeLeft]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.replace('/login');
  };

  // 3. Subscrição Realtime (WebSocket do Supabase)
  useEffect(() => {
    if (!protocoloGerado || !supabase) return;

    console.log("Iniciando canal Realtime para:", protocoloGerado);

    const channel = supabase
      .channel(`aluno-realtime-${protocoloGerado}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entradas',
          filter: `protocolo=eq.${protocoloGerado}`,
        },
        (payload: any) => {
          console.log('Mudança instantânea recebida:', payload.new.status);
          if (payload.new.status !== statusRef.current) {
            setStatusAtual(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [protocoloGerado]);

  // 4. Registro Inicial do Pedido
  useEffect(() => {
    if (!mounted || !user) return;

    const registrar = async () => {
      let aula = getAulaAtual();
      if (!aula) {
        try {
          const res = await fetch('/api/adm/config');
          const config = await res.json();
          if (config.bypass) aula = { numero: 1, inicio: 'TESTE', fim: 'TESTE' };
        } catch (e) {}
      }

      if (aula) {
        try {
          const response = await fetch('/api/entradas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              protocolo: `PE-${Date.now()}`, 
              aula_numero: aula.numero, 
              horario: new Date().toLocaleTimeString('pt-BR'), 
              data: getDataEscolar() 
            })
          });
          const data = await response.json();
          if (response.ok) {
            setProtocoloGerado(data.protocolo);
            setStatusAtual(data.status);
          }
        } catch (e) {
          setErrorEnvio("Falha de conexão com o sistema.");
        }
      } else {
        setErrorEnvio("Sistema fora do horário escolar.");
      }
    };
    registrar();
  }, [mounted, user]);

  const handleCheckboxChange = (val: boolean) => {
    setTermoAceito(val);
    // Ativa o cronómetro de 60 segundos ao marcar a checkbox
    if (val) setTimerRunning(true);
  };

  const confirmarEEntrar = async () => {
    const res = await fetch('/api/entradas/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolo: protocoloGerado, status: 'assinado' })
    });
    if (res.ok) setStatusAtual('liberado');
  };

  if (!mounted || !user) return null;

  const isLiberado = statusAtual === 'autorizado' || statusAtual === 'liberado';

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans p-4 md:p-10 flex flex-col items-center justify-center ${
      isLiberado ? 'bg-emerald-500' : 'bg-blue-600'
    }`}>
      
      {/* Cronómetro Flutuante */}
      {timerRunning && (
        <div className="fixed top-10 animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sessão expira em:</span>
            <span className="text-xl font-black text-amber-400">{timeLeft}s</span>
          </div>
        </div>
      )}

      <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 animate-fade-in">
        
        <header className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-xl transition-colors duration-700 ${isLiberado ? 'bg-emerald-500' : 'bg-blue-600'}`}>N</div>
          <h1 className="text-xl font-black italic tracking-tight text-slate-900">PortãoEdu</h1>
        </header>

        {statusAtual === 'pendente' ? (
          /* ESTADO: AGUARDANDO (AZUL) */
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-6xl animate-bounce">⏳</div>
            <h2 className="text-3xl font-black text-blue-600 uppercase italic leading-none">Aguardando</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Olá <span className="font-bold text-slate-900">{user.nome.split(' ')[0]}</span>, a tua solicitação foi enviada. <br/>
              A entrada será liberada em breve por <span className="font-bold">Ivone ou Carlos</span>.
            </p>
          </div>
        ) : isLiberado ? (
          /* ESTADO: LIBERADO (VERDE) */
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="text-6xl">✅</div>
            <h2 className="text-3xl font-black text-emerald-600 uppercase italic leading-none">Liberado!</h2>
            
            {statusAtual === 'autorizado' ? (
              <div className="space-y-6">
                <p className="text-slate-600 font-medium">
                  Olá <span className="font-black uppercase text-slate-900">{user.nome.split(' ')[0]}</span>, a tua entrada foi autorizada. Estás <span className="font-bold underline">LIBERADO</span>.
                </p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start space-x-4 text-left cursor-pointer" onClick={() => handleCheckboxChange(!termoAceito)}>
                  <div className={`w-6 h-6 min-w-[24px] rounded-md border-2 flex items-center justify-center transition-all ${termoAceito ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                    {termoAceito && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                  <span className="text-xs font-bold leading-tight text-slate-500">Eu afirmo que já assinei o documento manual na coordenação e aceito as políticas da escola.</span>
                </div>

                <button 
                  disabled={!termoAceito} 
                  onClick={confirmarEEntrar}
                  className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${termoAceito ? 'bg-emerald-500 text-white hover:scale-[1.02]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                >
                  Confirmar e Entrar
                </button>
              </div>
            ) : (
              <div className="py-10 space-y-4">
                <p className="text-slate-900 font-black text-2xl italic">Bom estudo!</p>
                <p className="text-slate-500 text-xs">O registro foi concluído. Saindo em {timeLeft}s...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-red-600">
            <h2 className="text-2xl font-black uppercase">🚨 DIREÇÃO</h2>
            <p className="text-sm font-medium">Vai à coordenação para falar com Ivone ou Carlos.</p>
          </div>
        )}

        <div className="pt-8 border-t border-slate-100">
          <QRCodeCanvas value={protocoloGerado || 'loading'} size={140} fgColor="#0f172a" className="mx-auto opacity-50" />
          <p className="text-[10px] text-slate-400 mt-4 font-black uppercase tracking-widest">Sincronia WebSocket Ativa</p>
        </div>

      </div>

      <footer className="mt-10 text-white/50 text-[9px] font-black uppercase tracking-[0.3em]">
        PortãoEdu • Nancy Management System • 2026
      </footer>
    </div>
  );
}
