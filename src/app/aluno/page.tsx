'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { createClient } from '@supabase/supabase-js';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';

// 1. Conexão Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState('pendente'); // 'pendente', 'autorizado', 'liberado', 'direcao'
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [processado, setProcessado] = useState(false);
  const router = useRouter();

  // Inicialização do Usuário (Sessão Local)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    setMounted(true);
  }, [router]);

  /**
   * 2. ESTADO INICIAL E TEMPO REAL (A MÁGICA)
   */
  useEffect(() => {
    if (!mounted || !user) return;

    const alunoId = user.id;

    // A. Busca Inicial (Estado Atual ao Carregar)
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('entradas')
        .select('status, protocolo')
        .eq('ra_aluno', user.ra) // Usando RA para maior precisão no filtro escolar
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setStatus(data.status);
        setProtocoloGerado(data.protocolo);
      }
    };

    fetchInitialStatus();

    // B. Subscrição Realtime via WebSockets (Evento UPDATE)
    const channel = supabase
      .channel('aluno-realtime-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entradas',
          filter: `ra_aluno=eq.${user.ra}`,
        },
        (payload: any) => {
          console.log('Mudança de status recebida:', payload.new.status);
          const novoStatus = payload.new.status;
          setStatus(novoStatus);
        }
      )
      .subscribe();

    // Limpeza (Unmount)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted, user]);

  /**
   * 3. LÓGICA DO CRONÔMETRO
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Logout Final
      handleLogout();
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  /**
   * 4. REGISTRO AUTOMÁTICO DE ENTRADA
   */
  useEffect(() => {
    if (!mounted || !user || processado) return;

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
            setStatus(data.status);
            setProcessado(true);
          }
        } catch (e) { console.error("Erro no registro:", e); }
      }
    };
    registrar();
  }, [mounted, user, processado]);

  const handleCheckboxChange = (val: boolean) => {
    setCheckboxChecked(val);
    if (val) setTimerRunning(true);
  };

  const confirmarFinal = async () => {
    const res = await fetch('/api/entradas/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolo: protocoloGerado, status: 'assinado' })
    });
    if (res.ok) setStatus('liberado');
  };

  if (!mounted || !user) return null;

  const isLiberado = status === 'autorizado' || status === 'liberado';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-700 font-sans ${
      isLiberado ? 'bg-emerald-500' : 'bg-blue-600'
    }`}>
      
      {/* CRONÔMETRO DE LOGOUT */}
      {timerRunning && (
        <div className="fixed top-10 animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sessão expira em:</span>
            <span className="text-xl font-black text-amber-400">{timeLeft}s</span>
          </div>
        </div>
      )}

      <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 animate-fade-in">
        
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl mb-2 transition-colors duration-700 ${
            isLiberado ? 'bg-emerald-500' : 'bg-blue-600'
          }`}>N</div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter italic">PortãoEdu</h1>
        </div>

        {status === 'pendente' ? (
          /* ESTADO: AGUARDANDO (AZUL) */
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-6xl animate-bounce">⏳</div>
            <h2 className="text-3xl font-black text-blue-600 uppercase italic">Aguardando</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Olá <span className="font-bold text-slate-900">{user.nome.split(' ')[0]}</span>, o teu pedido foi enviado. 
              <br/> Aguarda que a <span className="font-bold text-slate-900">Ivone ou o Carlos</span> autorizem a tua entrada.
            </p>
            <div className="pt-4 flex items-center justify-center gap-2 text-slate-400">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Sincronia WebSocket Ativa</span>
            </div>
          </div>
        ) : isLiberado ? (
          /* ESTADO: LIBERADO (VERDE) */
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="text-6xl">✅</div>
            <h2 className="text-3xl font-black text-emerald-600 uppercase italic">Liberado!</h2>
            
            {status === 'autorizado' ? (
              <div className="space-y-6">
                <p className="text-slate-600 font-medium">
                  Olá <span className="font-bold text-slate-900 uppercase">{user.nome.split(' ')[0]}</span>, a tua entrada foi autorizada. Estás <span className="underline font-bold">LIBERADO</span>.
                </p>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 text-left cursor-pointer" onClick={() => handleCheckboxChange(!checkboxChecked)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 min-w-[24px] rounded-md border-2 flex items-center justify-center transition-all ${checkboxChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                      {checkboxChecked && <span className="text-white text-xs font-black">✓</span>}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold italic leading-tight">
                      Eu afirmo que já assinei o documento manual na coordenação e aceito as políticas da escola.
                    </span>
                  </div>
                </div>

                <button 
                  disabled={!checkboxChecked} 
                  onClick={confirmarFinal}
                  className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${checkboxChecked ? 'bg-emerald-500 text-white hover:scale-[1.02]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                >
                  Confirmar Entrada
                </button>
              </div>
            ) : (
              <div className="py-10 space-y-4">
                <p className="text-slate-900 font-black text-2xl italic italic">Bom estudo!</p>
                <p className="text-slate-500 text-xs italic">O registro foi concluído. Saindo em {timeLeft}s...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-red-600">
            <h2 className="text-2xl font-black uppercase tracking-tighter">🚨 DIREÇÃO</h2>
            <p className="text-sm font-medium">Vai à coordenação para falar com Ivone ou Carlos.</p>
          </div>
        )}

        <div className="pt-8 border-t border-slate-100">
          <QRCodeCanvas value={protocoloGerado || 'loading'} size={140} fgColor="#0f172a" className="mx-auto opacity-50" />
          <p className="text-[10px] text-slate-400 mt-4 font-black uppercase tracking-widest">Digital-ID: {user.ra}</p>
        </div>
      </div>

      <footer className="mt-10 text-white/50 text-[9px] font-black uppercase tracking-[0.3em]">
        PortãoEdu • Nancy Management System • 2026
      </footer>
    </div>
  );
}
