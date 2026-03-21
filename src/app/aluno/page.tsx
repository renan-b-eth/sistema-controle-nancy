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
        .select('status, data, horario, aula_numero')
        .eq('protocolo', protocolo)
        .single();

      if (error) throw error;

      if (data && data.status !== statusAtual) {
        setStatusAtual(data.status);
        
        if (data.status === 'liberado') {
          showNotification("✅ ENTRADA LIBERADA!", "Prossiga imediatamente para sua sala de aula.");
          gerarPDFAssinatura({
            nome: user.nome,
            ra: user.ra,
            rg: user.rg,
            turma: user.turma,
            data: data.data,
            horario: data.horario,
            aulaNumero: data.aula_numero
          });
        } else if (data.status === 'direcao') {
          showNotification("⚠️ ATENÇÃO!", "Dirija-se à DIREÇÃO ou Secretaria agora.");
        }
      }
    } catch (e) {
      console.error("Erro ao verificar status:", e);
    }
  }, [statusAtual, user]);

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
        if (novoStatus !== statusAtual) {
          setStatusAtual(novoStatus);
          if (novoStatus === 'liberado') {
            showNotification("✅ ENTRADA LIBERADA!", "Prossiga para sua sala de aula.");
            gerarPDFAssinatura({
              nome: user.nome,
              ra: user.ra,
              rg: user.rg,
              turma: user.turma,
              data: payload.new.data,
              horario: payload.new.horario,
              aulaNumero: payload.new.aula_numero
            });
          }
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      verificarStatus(protocoloGerado);
    }, 5000);

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [protocoloGerado, user, statusAtual, verificarStatus]);

  const registrarSolicitacao = async (u: any, aula: Aula) => {
    const horarioAtual = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-10 font-sans relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
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
              <h3 className="font-black uppercase text-xs tracking-widest">Erro de Sincronização</h3>
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
              <p className="text-lg font-bold opacity-90 leading-relaxed max-w-xl relative z-10">
                Olá {user.nome.split(' ')[0]}, sua solicitação para a <span className="bg-white/20 px-3 py-1 rounded-lg font-black">{aulaAtual?.numero || 1}ª aula</span> foi enviada. 
                Aguarde a liberação pela gestão.
              </p>
              <div className="mt-8 inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Monitoramento em tempo real ativo</span>
              </div>
            </div>
          ) : statusAtual === 'liberado' ? (
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">✅</span> LIBERADO!
              </h2>
              <p className="text-xl font-black mb-4">PROSSIGA PARA SUA SALA DE AULA.</p>
              <p className="text-sm font-bold opacity-90 max-w-xl">
                Sua entrada foi autorizada. O comprovante digital foi gerado. Caso solicitado, apresente o PDF ou esta tela.
              </p>
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
              Atualizando em 30s
            </p>
          </div>

          {/* User Details */}
          <div className="bg-card p-10 rounded-[3rem] shadow-sm border border-border relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 text-6xl font-black text-foreground/5 pointer-events-none italic">Nancy</div>
            <h2 className="text-2xl font-black text-foreground mb-10 tracking-tight relative border-l-4 border-primary pl-4">Cartão de Acesso</h2>
            <div className="space-y-6 relative">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Nome do Aluno</p>
                  <p className="text-foreground text-lg font-black uppercase truncate">{user.nome}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">RA Escolar</p>
                  <p className="text-foreground text-lg font-black italic">{user.ra.replace(/[-\s]/g, '')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Turma</p>
                  <p className="text-primary text-lg font-black italic">{user.turma}</p>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-border flex justify-between items-center text-[10px] font-black text-secondary uppercase tracking-widest">
              <span>Registro de Entrada</span>
              <span className="text-foreground">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
