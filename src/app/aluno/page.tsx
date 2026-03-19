'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, isAcessoBloqueado, Aula } from '@/utils/horarios';
import { gerarPDFAssinatura } from '@/utils/pdfGenerator';

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

    // Lógica de Registro e PDF Automático (Apenas uma vez por login)
    if (!processado) {
      registrarEGerarPDF(parsedUser, aula);
      setProcessado(true);
    }

    const interval = setInterval(() => {
      setQrValue(`${parsedUser.ra}-${Date.now()}`);
    }, 30000);
    return () => clearInterval(interval);
  }, [router, processado]);

  const registrarEGerarPDF = (u: any, aula: Aula | null) => {
    if (!aula) return; // Fora do horário de aula regular

    const dataAtual = new Date().toLocaleDateString();
    const horarioAtual = new Date().toLocaleTimeString();

    let status: 'liberado' | 'bloqueado' | 'direcao' = 'liberado';

    if (aula.numero === 2 && !u.liberadoSegundaAula) {
      status = 'bloqueado';
    } else if (aula.numero >= 3) {
      status = 'direcao';
    }

    // Registrar no Banco de Dados (localStorage)
    const novaEntrada: Solicitacao = {
      id: `ENT-${Date.now()}`,
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

    // Gerar PDF automaticamente se for liberado ou bloqueado (para assinar o motivo)
    // O usuário pediu: "assim que ele logar, vai gerar um pdf"
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
               <span className="text-white font-bold">Nancy</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">PortãoEdu - Aluno</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm font-medium"
          >
            Sair
          </button>
        </div>

        {/* Status Area */}
        <div className="mb-8">
          {redirecionarDirecao ? (
            <div className="p-6 bg-red-100 border-l-8 border-red-600 rounded-lg shadow-md animate-pulse">
              <h2 className="text-2xl font-black text-red-700 uppercase mb-2">Acesso Restrito</h2>
              <p className="text-red-800 font-bold text-lg">
                Você chegou durante a {aulaAtual?.numero}ª aula. 
                <br />
                <strong>Por favor, dirija-se imediatamente à DIREÇÃO ou SECRETARIA para autorização.</strong>
              </p>
            </div>
          ) : bloqueadoSegunda ? (
            <div className="p-6 bg-yellow-100 border-l-8 border-yellow-500 rounded-lg shadow-md">
              <h2 className="text-2xl font-black text-yellow-700 uppercase mb-2">Entrada Não Autorizada</h2>
              <p className="text-yellow-800 font-bold text-lg">
                Você não está na lista de permissão para entrada na 2ª aula. 
                <br />
                Fale com o inspetor ou direção.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-green-100 border-l-8 border-green-600 rounded-lg shadow-md">
              <h2 className="text-2xl font-black text-green-700 uppercase mb-2">Entrada Liberada</h2>
              <p className="text-green-800 font-bold">
                {aulaAtual ? `Sua entrada foi registrada na ${aulaAtual.numero}ª aula.` : "Seja bem-vindo(a)!"}
                <br />
                O documento de registro foi gerado para impressão.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR Code Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold mb-4 text-gray-700 text-center">Identificação Digital</h2>
            <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <QRCodeCanvas value={qrValue} size={180} />
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center font-medium">O código é atualizado a cada 30 segundos</p>
          </div>

          {/* Info Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Suas Informações</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">Nome</p>
                  <p className="font-semibold text-gray-700">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">RA</p>
                  <p className="font-semibold text-gray-700">{user.ra}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">Turma</p>
                  <p className="font-semibold text-gray-700">{user.turma}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">Horário de Login</p>
                  <p className="font-semibold text-gray-700">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Help Info */}
            <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white">
              <h2 className="text-lg font-bold mb-2">Instruções de Acesso</h2>
              <ul className="text-sm space-y-2 opacity-90">
                <li>• Cada aula possui 45 minutos de duração.</li>
                <li>• Atrasos na 1ª e 2ª aula exigem assinatura de registro.</li>
                <li>• A partir da 3ª aula, a entrada só é permitida via secretaria.</li>
                <li>• Mantenha seu RG e RA sempre em mãos.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
