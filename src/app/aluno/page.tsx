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

  if (!user) return <p className="p-8 text-center font-bold">Carregando...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10 bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
               <span className="text-white font-black text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-blue-900 tracking-tight">PortãoEdu</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Escola Nancy de Oliveira Fidalgo</p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition">
            Sair
          </button>
        </div>

        <div className="mb-10">
          {statusAtual === 'pendente' ? (
            <div className="p-8 bg-blue-600 text-white rounded-3xl shadow-2xl animate-pulse border-4 border-blue-500">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">⏳ AGUARDANDO</h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                Olá {user.nome}, sua solicitação para a <span className="underline">{aulaAtual?.numero}ª aula</span> foi enviada.
                <br />Aguarde a liberação de Carlos ou Ivone na portaria.
              </p>
            </div>
          ) : statusAtual === 'liberado' ? (
            <div className="p-8 bg-emerald-600 text-white rounded-3xl shadow-2xl border-4 border-emerald-500">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">✅ LIBERADO</h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                Entrada autorizada! O seu comprovante foi gerado para impressão.
              </p>
            </div>
          ) : (
            <div className="p-8 bg-red-600 text-white rounded-3xl shadow-2xl border-4 border-red-500">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">⚠️ ATENÇÃO</h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                Por favor, dirija-se à <span className="underline font-black">DIREÇÃO</span> para autorizar sua entrada.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6">QR Code de Identificação</h2>
            <div className="p-6 bg-blue-50 rounded-3xl border-4 border-white shadow-inner">
              <QRCodeCanvas value={qrValue} size={180} fgColor="#1e3a8a" />
            </div>
            <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-tighter">Válido para hoje: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50">
              <h2 className="text-xl font-black text-blue-900 mb-6 border-b border-blue-50 pb-4 tracking-tight">Seus Dados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-bold">
                <div><p className="text-[10px] text-gray-400 uppercase">Nome</p><p className="text-gray-700">{user.nome}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">RA</p><p className="text-gray-700">{user.ra}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Turma</p><p className="text-gray-700">{user.turma}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Horário</p><p className="text-blue-600">{new Date().toLocaleTimeString()}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
