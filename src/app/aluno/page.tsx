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
  const [processado, setProcessado] = useState(false);
  const [termoAceito, setTermoAceito] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  
  // Cronômetro
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  const router = useRouter();
  const statusRef = useRef('pendente');

  useEffect(() => { statusRef.current = statusAtual; }, [statusAtual]);

  // 1. INICIALIZAÇÃO
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    setMounted(true);
  }, [router]);

  // 2. CRONÔMETRO DE LOGOUT
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
    sessionStorage.removeItem('auto_refresh_done');
    router.replace('/login');
  };

  // 3. POLLING INTELIGENTE (3 SEG)
  const pollStatus = useCallback(async (protocolo: string) => {
    if (!supabase || !protocolo) return;
    try {
      const { data } = await supabase.from('entradas').select('status').eq('protocolo', protocolo).maybeSingle();
      if (data && data.status !== statusRef.current) {
        setStatusAtual(data.status as any);
        if (data.status === 'autorizado' || data.status === 'liberado') {
          if (!sessionStorage.getItem('auto_refresh_done')) {
            sessionStorage.setItem('auto_refresh_done', 'true');
            window.location.reload();
          }
          return true;
        }
      }
    } catch (e) {}
    return false;
  }, []);

  useEffect(() => {
    if (!protocoloGerado || statusAtual === 'liberado') return;
    const interval = setInterval(async () => {
      const stop = await pollStatus(protocoloGerado);
      if (stop) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [protocoloGerado, statusAtual, pollStatus]);

  // 4. REGISTRO INICIAL
  useEffect(() => {
    if (!mounted || !user || processado) return;
    const registrar = async () => {
      let aula = getAulaAtual();
      if (!aula) {
        const res = await fetch('/api/adm/config');
        const config = await res.json();
        if (config.bypass) aula = { numero: 1, inicio: 'TESTE', fim: 'TESTE' };
      }
      if (aula) {
        try {
          const response = await fetch('/api/entradas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protocolo: `PE-${Date.now()}`, aula_numero: aula.numero, horario: new Date().toLocaleTimeString('pt-BR'), data: getDataEscolar() })
          });
          const data = await response.json();
          if (response.ok) {
            setProtocoloGerado(data.protocolo);
            setStatusAtual(data.status);
            setProcessado(true);
          }
        } catch (e) {}
      }
    };
    registrar();
  }, [mounted, user, processado]);

  const handleCheckbox = (val: boolean) => {
    setTermoAceito(val);
    if (val) setTimerRunning(true);
  };

  const confirmarFinal = async () => {
    const res = await fetch('/api/entradas/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolo: protocoloGerado, status: 'assinado' })
    });
    if (res.ok) setStatusAtual('liberado');
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans relative text-slate-900">
      
      {timerRunning && (
        <div className="fixed top-6 inset-x-4 z-[100] flex justify-center">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Sessão expira em: <span className="text-amber-400 text-sm">{timeLeft}s</span></p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <header className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl italic">N</span></div>
            <h1 className="text-xl font-black italic tracking-tight">PortãoEdu</h1>
          </div>
          <button onClick={handleLogout} className="px-5 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] border border-red-100 uppercase">Sair</button>
        </header>

        <section className="transition-all duration-500">
          {statusAtual === 'pendente' ? (
            <div className="p-8 sm:p-12 bg-blue-600 text-white rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">WAIT</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-4xl text-white">⏳</span> AGUARDANDO
              </h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed max-w-2xl relative z-10 text-white">
                Olá {user.nome.split(' ')[0]}, sua solicitação foi enviada. 
                <br /><br />
                Sua entrada só será liberada quando <span className="underline decoration-2 underline-offset-4 font-black">Ivone ou Carlos</span> autorizarem no sistema.
              </p>
            </div>
          ) : (statusAtual === 'autorizado' || statusAtual === 'liberado') ? (
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic text-white">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter text-white">
                <span className="mr-4 text-5xl animate-bounce">✅</span> LIBERADO!
              </h2>
              
              {statusAtual === 'autorizado' ? (
                <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/30 space-y-6">
                  <p className="text-sm font-bold opacity-95 leading-relaxed text-white">
                    Olá <span className="font-black uppercase">{user.nome.split(' ')[0]}</span>, sua entrada foi autorizada. Você está <span className="font-black underline">LIBERADO</span>. Obrigado, Carlos.
                  </p>
                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-white/10 cursor-pointer" onClick={() => handleCheckbox(!termoAceito)}>
                    <label className="flex items-start space-x-4 cursor-pointer text-white">
                      <div className={`w-6 h-6 min-w-[24px] rounded-md border-2 border-white flex items-center justify-center transition-all ${termoAceito ? 'bg-white' : ''}`}>
                        {termoAceito && <span className="text-emerald-600 font-black text-xs">✓</span>}
                      </div>
                      <span className="text-xs font-bold leading-tight flex-1">Eu afirmo que já assinei o documento manual na coordenação e aceito as políticas da escola.</span>
                    </label>
                  </div>
                  <button disabled={!termoAceito} onClick={confirmarFinal} className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${termoAceito ? 'bg-white text-emerald-600 hover:scale-[1.02]' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>Confirmar Entrada</button>
                </div>
              ) : (
                <div className="space-y-4 text-center text-white">
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Acesso Confirmado!</p>
                  <p className="text-sm font-bold opacity-90">Saindo em {timeLeft}s...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500 relative overflow-hidden text-center text-white">
              <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter text-white">🚨 DIRIJA-SE À DIREÇÃO</h2>
              <p className="text-sm font-bold opacity-90 text-white">Sua entrada deve ser tratada pessoalmente.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Identidade Digital</h2>
            <div className="p-6 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
              <QRCodeCanvas value={protocoloGerado || 'loading'} size={180} fgColor="#0f172a" />
            </div>
            <p className="text-[10px] text-emerald-500 mt-8 font-black uppercase flex items-center justify-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> Sincronia Inteligente</p>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 relative flex flex-col justify-center shadow-sm text-slate-900">
            <h2 className="text-2xl font-black mb-10 tracking-tight border-l-4 border-blue-600 pl-4 uppercase italic">Perfil</h2>
            <div className="space-y-6">
              <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Nome</p><p className="text-lg font-black uppercase truncate">{user.nome}</p></div>
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">RA</p><p className="text-lg font-black italic">{user.ra}</p></div>
                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Turma</p><p className="text-blue-600 text-lg font-black italic">{user.turma}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">PortãoEdu • 2026</footer>
    </div>
  );
}
