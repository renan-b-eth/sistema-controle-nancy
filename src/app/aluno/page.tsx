'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula } from '@/utils/horarios';
import { gerarPDFAssinatura } from '@/utils/pdfGenerator';
import { supabase } from '@/utils/supabase';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [aulaAtual, setAulaAtual] = useState<Aula | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'liberado' | 'bloqueado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [processado, setProcessado] = useState(false);
  const router = useRouter();

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
    if (!protocoloGerado) return;

    const channel = supabase
      .channel(`status-${protocoloGerado}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entradas', 
        filter: `protocolo=eq.${protocoloGerado}` 
      }, (payload: any) => {
        const novoStatus = payload.new.status;
        setStatusAtual(novoStatus);

        if (novoStatus === 'liberado') {
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
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [protocoloGerado, user]);

  const registrarSolicitacao = async (u: any, aula: Aula) => {
    const horarioAtual = new Date().toLocaleTimeString('pt-BR');
    const protocolo = `PE-${Date.now()}`;
    setProtocoloGerado(protocolo);

    try {
      await supabase.from('entradas').insert({
        data: new Date().toISOString().split('T')[0],
        horario: horarioAtual,
        aula_numero: aula.numero,
        status: 'pendente',
        protocolo: protocolo,
        nome_aluno: u.nome,
        ra_aluno: u.ra,
        rg_aluno: u.rg,
        turma_aluno: u.turma
      });
    } catch (e) {
      console.error("Erro ao registrar entrada:", e);
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
        
        {/* Header Compacto */}
        <header className="flex justify-between items-center mb-10 bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
               <span className="text-white font-black text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">PortãoEdu</h1>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Área do Aluno</p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">
            Sair
          </button>
        </header>

        {/* Status Gigante */}
        <section className="mb-10">
          {statusAtual === 'pendente' ? (
            <div className="relative overflow-hidden p-10 bg-blue-600 text-white rounded-[3rem] shadow-2xl shadow-blue-200 border-4 border-white">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <h2 className="text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 animate-bounce">⏳</span> AGUARDANDO
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed max-w-2xl text-blue-50">
                Olá {user.nome.split(' ')[0]}, sua entrada na <span className="bg-white/20 px-2 py-0.5 rounded">{aulaAtual?.numero}ª aula</span> está sendo analisada pela gestão na portaria. 
                Mantenha esta tela aberta.
              </p>
            </div>
          ) : statusAtual === 'liberado' ? (
            <div className="p-10 bg-emerald-600 text-white rounded-[3rem] shadow-2xl shadow-emerald-200 border-4 border-white">
              <h2 className="text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">✅</span> LIBERADO!
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed text-emerald-50">
                Sua entrada foi autorizada com sucesso. O comprovante de assinatura já foi gerado. Pode prosseguir para a sala de aula.
              </p>
            </div>
          ) : (
            <div className="p-10 bg-red-600 text-white rounded-[3rem] shadow-2xl shadow-red-200 border-4 border-white">
              <h2 className="text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4">⚠️</span> ATENÇÃO
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed text-red-50">
                Sua entrada requer atenção especial. Por favor, dirija-se à <span className="underline font-black">DIREÇÃO</span> ou secretaria para liberação manual.
              </p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Identificação Visual */}
          <div className="md:col-span-5 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Identidade Digital</h2>
            <div className="relative group">
               <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative p-6 bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-inner">
                 <QRCodeCanvas value={qrValue} size={200} fgColor="#1e293b" />
               </div>
            </div>
            <p className="text-[10px] text-slate-300 mt-10 font-black uppercase tracking-widest animate-pulse">
              Atualiza automaticamente para segurança
            </p>
          </div>

          {/* Carteirinha do Aluno */}
          <div className="md:col-span-7 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                 <span className="text-6xl font-black text-slate-50">Nancy</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-10 tracking-tight relative">Cartão de Acesso</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative">
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Nome Completo</p>
                  <p className="font-black text-slate-700 text-lg uppercase leading-tight">{user.nome}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">RA Escolar</p>
                  <p className="font-black text-slate-700 text-lg">{user.ra.replace(/\D/g, '')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Turma / Ano</p>
                  <p className="font-black text-blue-600 text-lg">{user.turma}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Registro de Pedido</p>
                  <p className="font-black text-slate-700 text-lg">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Banner de Ajuda */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dúvidas?</p>
                <p className="font-black text-lg">Precisa de ajuda com o acesso?</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl text-2xl">🆘</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
