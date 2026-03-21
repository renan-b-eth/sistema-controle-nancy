'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';
import { supabase } from '@/utils/supabase';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'autorizado' | 'liberado' | 'bloqueado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [assinaturaStatus, setAssinaturaStatus] = useState('pendente');
  const [processado, setProcessado] = useState(false);
  const [termoAceito, setTermoAceito] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  
  const router = useRouter();
  const statusRef = useRef(statusAtual);

  useEffect(() => { statusRef.current = statusAtual; }, [statusAtual]);

  // 1. Inicialização de Sessão
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    setMounted(true);
  }, [router]);

  // 2. FUNÇÃO CRÍTICA: BUSCA DIRETA NO BANCO (Puxa o estado real)
  const sincronizarComBanco = useCallback(async (protocolo: string) => {
    if (!supabase || !protocolo) return;
    try {
      // Forçamos a busca sem cache para garantir o estado mais recente
      const { data, error } = await supabase
        .from('entradas')
        .select('status, assinatura_status')
        .eq('protocolo', protocolo)
        .maybeSingle();
      
      if (data) {
        console.log("Sincronia Banco -> Frontend:", data.status);
        if (data.status !== statusRef.current) {
          setStatusAtual(data.status as any);
          setAssinaturaStatus(data.assinatura_status);
        }
      }
    } catch (e) { console.error("Falha na sincronia:", e); }
  }, []);

  // 3. Registro do Pedido
  useEffect(() => {
    if (!mounted || !user || processado) return;

    const registrarEntrada = async () => {
      let aula = getAulaAtual();
      if (!aula) {
        const res = await fetch('/api/adm/config');
        const config = await res.json();
        if (config.bypass) aula = { numero: 1, inicio: 'TESTE', fim: 'TESTE' };
      }

      if (aula) {
        const protocolo = `PE-${Date.now()}`;
        setProtocoloGerado(protocolo);
        
        const response = await fetch('/api/entradas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocolo, aula_numero: aula.numero, horario: new Date().toLocaleTimeString('pt-BR'), data: getDataEscolar() })
        });

        if (response.ok) setProcessado(true);
        else {
          const errData = await response.json();
          setErrorEnvio(errData.error || "Erro no registro.");
          setProcessado(true);
        }
      }
    };
    registrarEntrada();
  }, [mounted, user, processado]);

  // 4. MONITORAMENTO AGRESSIVO (Realtime + Polling 1s)
  useEffect(() => {
    if (!protocoloGerado || !supabase) return;

    // Escuta Realtime
    const channel = supabase
      .channel(`aluno-sync-${protocoloGerado}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entradas',
        filter: `protocolo=eq.${protocoloGerado}`
      }, (payload: any) => {
        if (payload.new) {
          console.log("REALTIME: Mudança detectada!", payload.new.status);
          setStatusAtual(payload.new.status);
          setAssinaturaStatus(payload.new.assinatura_status);
        }
      })
      .subscribe();

    // Polling de 1 segundo (Garantia se o Realtime falhar)
    const timer = setInterval(() => sincronizarComBanco(protocoloGerado), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [protocoloGerado, sincronizarComBanco]);

  const finalizarConfirmacao = async () => {
    const res = await fetch('/api/entradas/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolo: protocoloGerado, status: 'assinado' })
    });
    if (res.ok) {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      setStatusAtual('liberado');
      setTimeout(() => router.replace('/login'), 3000);
    }
  };

  if (!mounted || !user) return null;

  // MAPEAMENTO DE CORES E TEXTOS
  const isLiberado = statusAtual === 'autorizado' || statusAtual === 'liberado';
  const isPendente = statusAtual === 'pendente';
  const isDirecao = statusAtual === 'direcao';

  return (
    <div className="min-h-screen bg-background p-4 md:p-10 font-sans relative overflow-hidden text-foreground">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        <header className="flex justify-between items-center bg-card/70 backdrop-blur-xl p-6 rounded-[2rem] border border-border shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-tr from-primary to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl italic">N</span></div>
            <h1 className="text-xl font-black italic tracking-tight">PortãoEdu</h1>
          </div>
          <button onClick={() => { localStorage.removeItem('user'); router.replace('/login'); }} className="px-5 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100">Sair</button>
        </header>

        <section className="transition-all duration-700">
          {isPendente && (
            /* BANNER AZUL - AGUARDANDO */
            <div className="p-8 sm:p-12 bg-blue-600 text-white rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">WAIT</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-4xl">⏳</span> AGUARDANDO
              </h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed relative z-10">
                Olá {user.nome.split(' ')[0]}, sua solicitação foi enviada. 
                <br /><br />
                Sua entrada só será liberada quando <span className="underline decoration-2 underline-offset-4 font-black">Ivone ou Carlos</span> autorizarem no sistema.
              </p>
            </div>
          )}

          {isLiberado && (
            /* BANNER VERDE - LIBERADO (O QUE VOCÊ QUERIA) */
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl animate-bounce">✅</span> LIBERADO!
              </h2>
              
              {statusAtual === 'autorizado' ? (
                <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/30 space-y-6">
                  <p className="text-sm font-bold opacity-90 leading-relaxed">Olá, sua entrada foi autorizada. Você está <span className="font-black underline">LIBERADO</span>. Agora, confirme que assinou o documento manual na coordenação:</p>
                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-white/10 cursor-pointer" onClick={() => setTermoAceito(!termoAceito)}>
                    <label className="flex items-start space-x-4 cursor-pointer">
                      <div className={`w-6 h-6 rounded-md border-2 border-white flex items-center justify-center transition-all ${termoAceito ? 'bg-white' : ''}`}>
                        {termoAceito && <span className="text-emerald-600 font-black text-xs">✓</span>}
                      </div>
                      <span className="text-xs font-bold leading-tight flex-1">Eu afirmo que já assinei o documento manualmente na coordenação e aceito as políticas da escola.</span>
                    </label>
                  </div>
                  <button 
                    disabled={!termoAceito} 
                    onClick={finalizarConfirmacao}
                    className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${termoAceito ? 'bg-white text-emerald-600 hover:scale-[1.02]' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                  >
                    Confirmar Entrada e Entrar
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in text-center">
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Acesso Confirmado!</p>
                  <p className="text-sm font-bold opacity-90">Registro concluído. Prossiga para sua sala. Bom estudo!</p>
                </div>
              )}
            </div>
          )}

          {isDirecao && (
            /* BANNER VERMELHO - DIREÇÃO */
            <div className="p-8 sm:p-12 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500 relative overflow-hidden">
              <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">🚨 DIRIJA-SE À DIREÇÃO</h2>
              <p className="text-sm font-bold opacity-90">Sua entrada deve ser tratada pessoalmente com a coordenação.</p>
            </div>
          )}
        </section>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-10 rounded-[3rem] border border-border flex flex-col items-center justify-center text-center shadow-sm">
            <h2 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-8">Identidade Digital</h2>
            <div className="p-6 bg-white rounded-[2.5rem] border-2 border-border shadow-inner"><QRCodeCanvas value={protocoloGerado || 'loading'} size={180} fgColor="#0f172a" /></div>
            <p className="text-[10px] text-secondary mt-8 font-black uppercase flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> Sincronizado
            </p>
          </div>
          <div className="bg-card p-10 rounded-[3rem] border border-border relative flex flex-col justify-center shadow-sm">
            <h2 className="text-2xl font-black text-foreground mb-10 tracking-tight border-l-4 border-primary pl-4 uppercase italic">Acesso Escolar</h2>
            <div className="space-y-6">
              <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Aluno</p><p className="text-foreground text-lg font-black uppercase truncate">{user.nome}</p></div>
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">RA</p><p className="text-foreground text-lg font-black italic">{user.ra}</p></div>
                <div><p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Turma</p><p className="text-primary text-lg font-black italic">{user.turma}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
