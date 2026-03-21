'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';
import { gerarPDFAssinatura } from '@/utils/pdfGenerator';
import { supabase } from '@/utils/supabase';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [aulaAtual, setAulaAtual] = useState<Aula | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'liberado' | 'bloqueado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [assinaturaStatus, setAssinaturaStatus] = useState<'pendente' | 'assinado' | 'recusado'>('pendente');
  const [processado, setProcessado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const verificarStatus = useCallback(async (protocolo: string) => {
    if (!supabase || !protocolo) return;
    
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select('status, data, horario, aula_numero, assinatura_status')
        .eq('protocolo', protocolo)
        .single();

      if (error) throw error;

      if (data) {
        if (data.status !== statusAtual) setStatusAtual(data.status);
        if (data.assinatura_status !== assinaturaStatus) setAssinaturaStatus(data.assinatura_status);
        
        if (data.status === 'liberado' && statusAtual === 'pendente') {
          showNotification("✅ ENTRADA LIBERADA!", "Prossiga imediatamente para sua sala de aula.");
        } else if (data.status === 'direcao' && statusAtual === 'pendente') {
          showNotification("⚠️ ATENÇÃO!", "Dirija-se à DIREÇÃO ou Secretaria agora.");
        }
      }
    } catch (e) {
      console.error("Erro ao verificar status:", e);
    }
  }, [statusAtual, assinaturaStatus]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    const aula = getAulaAtual();
    setAulaAtual(aula);
    setQrValue(`${parsedUser.ra}-${Date.now()}`);

    if (!processado && aula) {
      registrarSolicitacao(parsedUser, aula);
      setProcessado(true);
    } else if (!aula) {
      setErrorEnvio("Sistema indisponível fora do horário escolar.");
    }

    const interval = setInterval(() => {
      setQrValue(`${parsedUser.ra}-${Date.now()}`);
    }, 30000);
    return () => clearInterval(interval);
  }, [processado, router]);

  useEffect(() => {
    if (!protocoloGerado || !supabase) return;

    const channel = supabase
      .channel(`status-${protocoloGerado}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entradas', 
        filter: `protocolo=eq.${protocoloGerado}` 
      }, (payload: any) => {
        const novoStatus = payload.new.status;
        const novaAssinatura = payload.new.assinatura_status;
        if (novoStatus !== statusAtual) setStatusAtual(novoStatus);
        if (novaAssinatura !== assinaturaStatus) setAssinaturaStatus(novaAssinatura);
      })
      .subscribe();

    const interval = setInterval(() => {
      verificarStatus(protocoloGerado);
    }, 2000);

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [protocoloGerado, statusAtual, assinaturaStatus, verificarStatus]);

  const registrarSolicitacao = async (u: any, aula: Aula) => {
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtual = horaBrasilia.getHours();

    // Bloqueia registro se não for noite (God login ignorado para teste)
    if (horaAtual < 19 && u.ra !== '00000000000') {
      setErrorEnvio("O registro de entrada só é permitido a partir das 19:00.");
      return;
    }

    const horarioAtual = horaBrasilia.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const protocolo = `PE-${Date.now()}`;
    const dataAtual = getDataEscolar();
    setProtocoloGerado(protocolo);

    try {
      const response = await fetch('/api/entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolo,
          aula_numero: aula.numero,
          horario: horarioAtual,
          data: dataAtual
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Erro no servidor');

    } catch (e: any) {
      console.error("Erro ao registrar entrada:", e);
      setErrorEnvio(`Falha crítica: ${e.message}`);
    }
  };

  const [termoAceito, setTermoAceito] = useState(false);

  const atualizarAssinatura = async (status: 'assinado' | 'recusado') => {
    try {
      const res = await fetch('/api/entradas/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolo: protocoloGerado, status })
      });
      if (res.ok) {
        setAssinaturaStatus(status);
      }
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground font-sans">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-10 font-sans relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-foreground">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-card/70 backdrop-blur-xl p-6 rounded-[2rem] border border-border shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-tr from-primary to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="text-white font-black text-xl italic">N</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">PortãoEdu</h1>
              <p className="text-[9px] text-secondary font-black uppercase tracking-[0.2em]">Portal do Aluno</p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100">
            Sair
          </button>
        </header>

        {errorEnvio && (
          <div className="p-6 bg-red-500 text-white rounded-[2rem] shadow-xl animate-bounce flex items-center space-x-4 border-4 border-white">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-black uppercase text-xs tracking-widest">Atenção</h3>
              <p className="font-bold text-xs opacity-90">{errorEnvio}</p>
            </div>
          </div>
        )}

        {/* Status Section */}
        <section className="relative overflow-hidden">
          {statusAtual === 'pendente' ? (
            <div className="p-8 sm:p-12 bg-primary text-white rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">WAIT</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 animate-spin-slow">⏳</span> AGUARDANDO
              </h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed max-xl relative z-10">
                Olá {user.nome.split(' ')[0]}, sua solicitação para a <span className="bg-white/20 px-3 py-1 rounded-lg font-black">{aulaAtual?.numero || 1}ª aula</span> foi enviada. 
                <br /><br />
                Sua entrada só será liberada quando <span className="underline decoration-2 underline-offset-4">Ivone ou Carlos</span> autorizarem no sistema. Após a liberação, você deverá assinar digitalmente o motivo da sua chegada em atraso para a coordenação.
              </p>
            </div>
          ) : statusAtual === 'liberado' ? (
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">✅</span> LIBERADO!
              </h2>
              
              {assinaturaStatus === 'pendente' ? (
                <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/30 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xl font-black uppercase tracking-tight">🎉 Entrada Autorizada!</p>
                    <p className="text-sm font-bold opacity-90 leading-relaxed">
                      Dirija-se à coordenação para assinar o documento de entrada tardia <span className="underline font-black italic">manualmente (no papel)</span>. 
                      Após assinar, confirme sua entrada abaixo:
                    </p>
                  </div>

                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-white/10 group cursor-pointer" onClick={() => setTermoAceito(!termoAceito)}>
                    <label className="flex items-start space-x-4 cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={termoAceito}
                          onChange={(e) => setTermoAceito(e.target.checked)}
                          className="peer appearance-none w-6 h-6 border-2 border-white rounded-md checked:bg-white transition-all cursor-pointer"
                        />
                        <span className="absolute text-emerald-600 font-black scale-0 peer-checked:scale-100 transition-transform">✓</span>
                      </div>
                      <span className="text-xs font-bold leading-tight select-none">
                        Eu entendo que cheguei atrasado e afirmo que assinei o documento manualmente na coordenação. 
                        Compreendo o motivo do registro e aceito as políticas de frequência da escola.
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      disabled={!termoAceito}
                      onClick={() => atualizarAssinatura('assinado')} 
                      className={`py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${termoAceito ? 'bg-white text-emerald-600 hover:scale-[1.02] active:scale-95' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                    >
                      Confirmar Entrada
                    </button>
                    <button 
                      onClick={() => atualizarAssinatura('recusado')} 
                      className="py-5 bg-emerald-700/30 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-800 transition-all border border-white/10"
                    >
                      Recusar / Problemas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Acesso Confirmado!</p>
                  <p className="text-sm font-bold opacity-90 max-w-xl">
                    {assinaturaStatus === 'assinado' 
                      ? 'Você confirmou a ciência dos termos e a assinatura manual. Prossiga para sua sala de aula.' 
                      : 'Você registrou uma recusa ou problema na assinatura. Procure a direção caso necessário.'}
                  </p>
                  <div className="inline-block px-6 py-2 bg-white text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Bom estudo!
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">STOP</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">⚠️</span> ATENÇÃO!
              </h2>
              <p className="text-xl font-black mb-4 uppercase">DIRIJA-SE À DIREÇÃO AGORA.</p>
              <p className="text-sm font-bold opacity-90">
                Sua entrada não pôde ser liberada automaticamente. Vá até a secretaria para regularizar seu acesso.
              </p>
            </div>
          )}
        </section>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Card */}
          <div className="bg-card p-10 rounded-[3rem] shadow-sm border border-border flex flex-col items-center justify-center text-center group">
            <h2 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-8">Identidade Digital</h2>
            <div className="relative">
               <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative p-6 bg-white rounded-[2.5rem] border-2 border-border shadow-inner">
                 <QRCodeCanvas value={qrValue} size={180} fgColor="#0f172a" />
               </div>
            </div>
            <p className="text-[10px] text-secondary mt-8 font-black uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Live: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* User Details */}
          <div className="bg-card p-10 rounded-[3rem] shadow-sm border border-border relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 text-6xl font-black text-foreground/5 pointer-events-none italic">Nancy</div>
            <h2 className="text-2xl font-black text-foreground mb-10 tracking-tight relative border-l-4 border-primary pl-4 uppercase">Cartão de Acesso</h2>
            <div className="space-y-6 relative">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Nome do Aluno</p>
                  <p className="text-foreground text-lg font-black uppercase truncate">{user.nome}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">RA Escolar</p>
                  <p className="text-foreground text-lg font-black italic">{user.ra?.replace(/[-\s]/g, '')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Turma</p>
                  <p className="text-primary text-lg font-black italic">{user.turma}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
