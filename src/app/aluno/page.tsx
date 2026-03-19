'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula } from '@/utils/horarios';
import { gerarPDFAssinatura } from '@/utils/pdfGenerator';
import { supabase } from '@/utils/supabase';

interface Solicitacao {
  id: string;
  nome: string;
  ra: string;
  rg: string;
  turma: string;
  data: string;
  horario: string;
  aulaNumero: number;
  status: 'liberado' | 'bloqueado' | 'direcao';
}

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [aulaAtual, setAulaAtual] = useState<Aula | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [processado, setProcessado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.profile !== 'Aluno') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    const aula = getAulaAtual();
    setAulaAtual(aula);
    setQrValue(`${parsedUser.ra}-${Date.now()}`);

    if (!processado) {
      registrarEGerarPDF(parsedUser, aula);
      setProcessado(true);
    }

    const interval = setInterval(() => {
      setQrValue(`${parsedUser.ra}-${Date.now()}`);
    }, 30000);
    return () => clearInterval(interval);
  }, [router, processado]);

  const registrarEGerarPDF = async (u: any, aula: Aula | null) => {
    if (!aula) return;

    const dataAtual = new Date().toLocaleDateString();
    const horarioAtual = new Date().toLocaleTimeString();
    const protocolo = `PE-${Date.now()}`;

    let status: 'liberado' | 'bloqueado' | 'direcao' = 'liberado';

    if (aula.numero === 2 && !u.liberadoSegundaAula) {
      status = 'bloqueado';
    } else if (aula.numero >= 3) {
      status = 'direcao';
    }

    // 1. Salvar no Supabase (Histórico Online)
    try {
      await supabase.from('entradas').insert({
        aluno_id: null, // Opcional se não linkar por ID agora
        data: new Date().toISOString().split('T')[0],
        horario: horarioAtual,
        aula_numero: aula.numero,
        status: status,
        protocolo: protocolo,
        // Campos extras para facilitar visualização sem joins
        nome_aluno: u.name,
        rg_aluno: u.rg,
        turma_aluno: u.turma
      });
    } catch (e) {
      console.error("Erro ao salvar no Supabase, mantendo local.");
    }

    // 2. Salvar Localmente (Backup)
    const novaEntrada: Solicitacao = {
      id: protocolo,
      nome: u.name,
      ra: u.ra,
      rg: u.rg,
      turma: u.turma,
      data: dataAtual,
      horario: horarioAtual,
      aulaNumero: aula.numero,
      status: status
    };
    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    localStorage.setItem('portaoEdu_solicitacoes', JSON.stringify([novaEntrada, ...todas]));

    // 3. Gerar PDF
    if (status !== 'direcao') {
      gerarPDFAssinatura({
        nome: u.name,
        ra: u.ra,
        rg: u.rg,
        turma: u.turma,
        data: dataAtual,
        horario: horarioAtual,
        aulaNumero: aula.numero
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <p className="p-8 text-center">Carregando...</p>;

  const bloqueadoSegunda = aulaAtual?.numero === 2 && !user.liberadoSegundaAula;
  const redirecionarDirecao = aulaAtual && aulaAtual.numero >= 3;

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
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Painel do Aluno</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition font-black text-sm uppercase tracking-wider"
          >
            Sair
          </button>
        </div>

        {/* Alerta de Status */}
        <div className="mb-10">
          {redirecionarDirecao ? (
            <div className="p-8 bg-red-600 text-white rounded-3xl shadow-2xl shadow-red-200 animate-pulse border-4 border-red-500">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">
                <span className="mr-3 text-4xl">⚠️</span> ACESSO RESTRITO
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                Você chegou durante a <span className="underline">{aulaAtual?.numero}ª aula</span>. 
                <br />
                <span className="bg-white text-red-600 px-2 py-1 rounded mt-2 inline-block">VÁ IMEDIATAMENTE PARA A DIREÇÃO OU SECRETARIA.</span>
              </p>
            </div>
          ) : bloqueadoSegunda ? (
            <div className="p-8 bg-orange-500 text-white rounded-3xl shadow-2xl shadow-orange-200 border-4 border-orange-400">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">
                <span className="mr-3 text-4xl">🚫</span> ENTRADA BLOQUEADA
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                Você não possui autorização para entrar na <span className="underline">2ª aula</span>. 
                <br />
                Procure a equipe de inspeção ou a direção.
              </p>
            </div>
          ) : (
            <div className="p-8 bg-emerald-600 text-white rounded-3xl shadow-2xl shadow-emerald-200 border-4 border-emerald-500">
              <h2 className="text-3xl font-black uppercase mb-4 flex items-center">
                <span className="mr-3 text-4xl">✅</span> ENTRADA LIBERADA
              </h2>
              <p className="text-xl font-bold opacity-90 leading-relaxed">
                {aulaAtual ? `Sua entrada na ${aulaAtual.numero}ª aula foi registrada.` : "Acesso autorizado com sucesso!"}
                <br />
                O documento de assinatura foi gerado para impressão.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identificação Digital */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6">Identificação Digital</h2>
            <div className="p-6 bg-blue-50 rounded-3xl border-4 border-white shadow-inner">
              <QRCodeCanvas value={qrValue} size={180} fgColor="#1e3a8a" />
            </div>
            <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-tighter animate-pulse">
              Código atualiza a cada 30s
            </p>
          </div>

          {/* Dados do Aluno */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50">
              <h2 className="text-xl font-black text-blue-900 mb-6 border-b border-blue-50 pb-4 tracking-tight">Suas Informações</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nome Completo</p>
                  <p className="font-bold text-gray-700 text-lg">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">RA Escolar</p>
                  <p className="font-bold text-gray-700 text-lg">{user.ra}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Turma / Ano</p>
                  <p className="font-bold text-gray-700 text-lg">{user.turma}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Registro de Acesso</p>
                  <p className="font-bold text-blue-600 text-lg">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900 p-8 rounded-3xl shadow-xl text-white">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4">Horários de Aula</h2>
              <div className="space-y-3 opacity-80 font-bold text-sm">
                <p className="flex justify-between"><span>1ª Aula:</span> <span>19:00 - 19:45</span></p>
                <p className="flex justify-between"><span>2ª Aula:</span> <span>19:45 - 20:30</span></p>
                <p className="flex justify-between border-t border-blue-800 pt-3 text-orange-300">
                  <span>A partir das 20:30:</span> <span>Dirija-se à Secretaria</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
