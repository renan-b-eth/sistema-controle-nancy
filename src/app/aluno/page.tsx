'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';
import { supabase } from '@/utils/supabase';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [aulaAtual, setAulaAtual] = useState<Aula | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'autorizado' | 'liberado' | 'bloqueado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [assinaturaStatus, setAssinaturaStatus] = useState<'pendente' | 'assinado' | 'recusado'>('pendente');
  const [processado, setProcessado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [termoAceito, setTermoAceito] = useState(false);
  const router = useRouter();

  // 1. Inicialização e Proteção de Rota Rigorosa
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.profile !== 'Aluno') {
      router.replace('/login');
      return;
    }
    setUser(parsed);
    setMounted(true);
  }, [router]);

  const verificarStatusManual = useCallback(async (protocolo: string) => {
    if (!supabase || !protocolo) return;
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select('status, assinatura_status')
        .eq('protocolo', protocolo)
        .maybeSingle();
      
      if (data) {
        if (data.status !== statusAtual) setStatusAtual(data.status as any);
        if (data.assinatura_status !== assinaturaStatus) setAssinaturaStatus(data.assinatura_status as any);
      }
    } catch (e) { console.error("Erro polling:", e); }
  }, [statusAtual, assinaturaStatus]);

  // Registro de Entrada Automático
  useEffect(() => {
    if (!mounted || !user || processado) return;

    const prepararEntrada = async () => {
      let aula = getAulaAtual();
      if (!aula) {
        try {
          const res = await fetch('/api/adm/config');
          const config = await res.json();
          if (config.bypass) aula = { numero: 1, inicio: 'TESTE', fim: 'TESTE' };
        } catch (e) {}
      }

      if (aula) {
        setAulaAtual(aula);
        setQrValue(`${user.ra}-${Date.now()}`);
        const protocolo = `PE-${Date.now()}`;
        setProtocoloGerado(protocolo);

        try {
          const response = await fetch('/api/entradas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protocolo, aula_numero: aula.numero, horario: new Date().toLocaleTimeString('pt-BR'), data: getDataEscolar() })
          });
          if (response.ok) setProcessado(true);
          else {
            const errData = await response.json();
            setErrorEnvio(errData.error || "Erro ao registrar.");
            setProcessado(true);
          }
        } catch (e) { setErrorEnvio("Erro de servidor."); }
      } else { setErrorEnvio("Sistema indisponível fora do horário."); }
    };
    prepararEntrada();
  }, [mounted, user, processado]);

  // Realtime
  useEffect(() => {
    if (!protocoloGerado || !supabase) return;
    const channel = supabase
      .channel(`canal-${protocoloGerado}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'entradas',
        filter: `protocolo=eq.${protocoloGerado}`
      }, (payload: any) => {
        if (payload.new) {
          setStatusAtual(payload.new.status);
          setAssinaturaStatus(payload.new.assinatura_status);
        }
      })
      .subscribe();
    const interval = setInterval(() => verificarStatusManual(protocoloGerado), 2000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [protocoloGerado, verificarStatusManual]);

  // FINALIZAÇÃO E EXPULSÃO
  const finalizarSessaoEEntrar = async (status: 'assinado' | 'recusado') => {
    try {
      const res = await fetch('/api/entradas/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolo: protocoloGerado, status })
      });
      
      if (res.ok) {
        // Mata a sessão no servidor e no navegador imediatamente
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('user');
        
        setStatusAtual('liberado');
        setAssinaturaStatus(status);
        
        // Redireciona em 3 segundos para o login
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (e) { console.error(e); }
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-10 font-sans relative overflow-hidden text-foreground">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        <header className="flex justify-between items-center bg-card/70 backdrop-blur-xl p-6 rounded-[2rem] border border-border shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-tr from-primary to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl italic">N</span></div>
            <h1 className="text-xl font-black italic">PortãoEdu</h1>
          </div>
          <button onClick={() => { localStorage.removeItem('user'); router.replace('/login'); }} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-[10px] border border-red-100 uppercase">Sair</button>
        </header>

        <section>
          {statusAtual === 'pendente' ? (
            <div className="p-8 sm:p-12 bg-primary text-white rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">WAIT</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter"><span className="mr-4 animate-spin-slow text-white">⏳</span> AGUARDANDO</h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed max-xl relative z-10">
                Olá {user.nome.split(' ')[0]}, sua solicitação foi enviada. 
                <br /><br />
                Sua entrada só será liberada quando <span className="underline decoration-2 underline-offset-4">Ivone ou Carlos</span> autorizarem no sistema.
              </p>
            </div>
          ) : (statusAtual === 'autorizado' || statusAtual === 'liberado') ? (
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter"><span className="mr-4 text-5xl">✅</span> {statusAtual === 'autorizado' ? 'AUTORIZADO!' : 'LIBERADO!'}</h2>
              
              {statusAtual === 'autorizado' ? (
                <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/30 space-y-6">
                  <p className="text-sm font-bold opacity-90 leading-relaxed">Autorizado pela gestão. Assine o documento manual na coordenação e confirme abaixo para finalizar:</p>
                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-white/10 cursor-pointer" onClick={() => setTermoAceito(!termoAceito)}>
                    <label className="flex items-start space-x-4 cursor-pointer">
                      <div className={`w-6 h-6 rounded-md border-2 border-white flex items-center justify-center ${termoAceito ? 'bg-white' : ''}`}>{termoAceito && <span className="text-emerald-600 font-black">✓</span>}</div>
                      <span className="text-xs font-bold leading-tight flex-1 italic">Eu entendo o atraso, assinei manualmente e aceito as políticas da escola.</span>
                    </label>
                  </div>
                  <button disabled={!termoAceito} onClick={() => finalizarSessaoEEntrar('assinado')} className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all ${termoAceito ? 'bg-white text-emerald-600' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>Confirmar e Entrar</button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in text-center">
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Acesso Confirmado!</p>
                  <p className="text-sm font-bold opacity-90">Registro concluído. Voltando para a tela de login...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500 relative overflow-hidden text-center">
              <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">🚨 DIRIJA-SE À DIREÇÃO</h2>
              <p className="text-sm font-bold opacity-90">Sua entrada deve ser tratada pessoalmente com a coordenação.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-10 rounded-[3rem] border border-border flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-8">Identidade Digital</h2>
            <div className="p-6 bg-white rounded-[2.5rem] border-2 border-border shadow-inner"><QRCodeCanvas value={qrValue} size={180} fgColor="#0f172a" /></div>
            <p className="text-[10px] text-secondary mt-8 font-black uppercase flex items-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>Live</p>
          </div>
          <div className="bg-card p-10 rounded-[3rem] border border-border relative flex flex-col justify-center">
            <h2 className="text-2xl font-black text-foreground mb-10 tracking-tight border-l-4 border-primary pl-4 uppercase italic">Acesso Escolar</h2>
            <div className="space-y-6">
              <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1 text-foreground">Aluno</p><p className="text-foreground text-lg font-black uppercase truncate">{user.nome}</p></div>
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1 text-foreground">RA</p><p className="text-foreground text-lg font-black italic">{user.ra?.replace(/[-\s]/g, '')}</p></div>
                <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1 text-foreground">Turma</p><p className="text-primary text-lg font-black italic">{user.turma}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
