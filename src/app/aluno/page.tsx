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

  // Solicitar permissão para notificações do navegador
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
  }, [processado]);

  useEffect(() => {
    if (!protocoloGerado || !supabase) return;

    // 1. Escuta em Tempo Real (Realtime)
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

    // 2. Polling de Backup (Busca a cada 5s para garantir atualização automática)
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex justify-between items-center mb-10 bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
               <span className="text-white font-black text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight text-xs md:text-xl">PortãoEdu</h1>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Painel do Aluno</p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">
            Sair
          </button>
        </header>

        {errorEnvio && (
          <div className="mb-6 p-6 bg-red-600 text-white rounded-3xl shadow-xl animate-bounce">
            <h3 className="font-black uppercase text-sm mb-1 tracking-widest text-xs">⚠️ ERRO DE SINCRONIZAÇÃO</h3>
            <p className="font-bold text-xs opacity-90">{errorEnvio}</p>
          </div>
        )}

        <section className="mb-10">
          {statusAtual === 'pendente' ? (
            <div className="relative overflow-hidden p-10 bg-blue-600 text-white rounded-[3rem] shadow-2xl border-4 border-white">
              <h2 className="text-3xl md:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 animate-bounce">⏳</span> AGUARDANDO
              </h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed max-w-2xl">
                Olá {user.nome.split(' ')[0]}, sua solicitação para a <span className="bg-white/20 px-2 py-0.5 rounded font-black">{aulaAtual?.numero || 1}ª aula</span> foi enviada. 
                Aguarde a liberação por <span className="underline font-black">Carlos ou Ivone</span>.
                <br /><br />
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-700 px-3 py-1 rounded-full animate-pulse">Mantenha esta tela aberta para atualização automática</span>
              </p>
            </div>
          ) : statusAtual === 'liberado' ? (
            <div className="p-10 bg-emerald-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500">
              <h2 className="text-3xl md:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">✅</span> LIBERADO!
              </h2>
              <p className="text-xl font-black mb-4">PROSSIGA IMEDIATAMENTE PARA SUA SALA DE AULA.</p>
              <p className="text-sm font-bold opacity-90 leading-relaxed max-w-2xl">
                Sua entrada foi autorizada pela gestão. O comprovante foi gerado para o seu celular. Caso precise, apresente o PDF ou esta tela ao professor.
              </p>
            </div>
          ) : (
            <div className="p-10 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500">
              <h2 className="text-3xl md:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4">⚠️</span> ATENÇÃO!
              </h2>
              <p className="text-xl font-black mb-4 uppercase">DIRIJA-SE À DIREÇÃO / SECRETARIA AGORA.</p>
              <p className="text-sm font-bold opacity-90 leading-relaxed text-red-50">
                Sua entrada não pôde ser liberada automaticamente pela portaria. Vá até a direção para regularizar seu acesso.
              </p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Identidade Digital</h2>
            <div className="relative group">
               <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[3rem] blur-xl opacity-50"></div>
               <div className="relative p-6 bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-inner">
                 <QRCodeCanvas value={qrValue} size={200} fgColor="#1e293b" />
               </div>
            </div>
            <p className="text-[10px] text-slate-300 mt-10 font-black uppercase tracking-widest">Atualização automática em 30s</p>
          </div>

          <div className="md:col-span-7 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-6xl font-black text-slate-50">Nancy</div>
              <h2 className="text-2xl font-black text-slate-800 mb-10 tracking-tight relative">Cartão de Acesso</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative font-bold">
                <div><p className="text-[10px] text-slate-400 uppercase mb-1">Nome</p><p className="text-slate-700 text-lg uppercase leading-tight">{user.nome}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase mb-1">RA Escolar</p><p className="text-slate-700 text-lg">{user.ra.replace(/[-\s]/g, '')}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase mb-1">Turma</p><p className="text-blue-600 text-lg">{user.turma}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase mb-1">Registro</p><p className="text-slate-700 text-lg">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
