'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

interface Solicitacao {
  id: string;
  nome: string;
  ra: string;
  data: string;
  horario: string;
  motivo: string;
  status: 'pendente' | 'liberado' | 'negado';
}

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [motivo, setMotivo] = useState('');
  const [solicitacaoAtual, setSolicitacaoAtual] = useState<Solicitacao | null>(null);
  const [qrValue, setQrValue] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.profile !== 'Aluno') {
        router.push('/login');
      } else {
        setUser(parsedUser);
        setQrValue(`${parsedUser.ra}-${Date.now()}`);
        
        // Buscar se já tem solicitação pendente hoje
        const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
        const pendente = todas.find((s: Solicitacao) => s.ra === parsedUser.ra && s.status === 'pendente');
        if (pendente) setSolicitacaoAtual(pendente);
      }
    }

    // Atualizar QR code a cada 30 segundos
    const interval = setInterval(() => {
      if (user) setQrValue(`${user.ra}-${Date.now()}`);
    }, 30000);
    return () => clearInterval(interval);
  }, [router, user?.ra]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleEnviarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;

    const novaSolicitacao: Solicitacao = {
      id: Math.random().toString(36).substr(2, 9),
      nome: user.name,
      ra: user.ra,
      data: new Date().toLocaleDateString(),
      horario: new Date().toLocaleTimeString(),
      motivo: motivo,
      status: 'pendente'
    };

    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    localStorage.setItem('portaoEdu_solicitacoes', JSON.stringify([...todas, novaSolicitacao]));
    
    setSolicitacaoAtual(novaSolicitacao);
    setMotivo('');
    alert('Solicitação enviada com sucesso! Aguarde a liberação.');
  };

  if (!user) return <p className="p-8 text-center">Carregando...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700">PortãoEdu - Aluno</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Sair
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR Code Section */}
          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold mb-4 text-center">Acesso Rápido (QR Code)</h2>
            <div className="bg-white p-2 border-2 border-blue-100 rounded">
              <QRCodeCanvas value={qrValue} size={180} />
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">Atualiza automaticamente</p>
          </div>

          {/* Info Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Minhas Informações</h2>
              <div className="grid grid-cols-2 gap-4">
                <p><span className="font-bold text-gray-600">Nome:</span> {user.name}</p>
                <p><span className="font-bold text-gray-600">RA:</span> {user.ra}</p>
              </div>
            </div>

            {/* Request Form */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Solicitar Entrada (Atraso)</h2>
              
              {solicitacaoAtual && solicitacaoAtual.status === 'pendente' ? (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                  <p className="font-bold">Status: Aguardando liberação</p>
                  <p className="text-sm mt-1">Sua solicitação enviada às {solicitacaoAtual.horario} está em análise.</p>
                </div>
              ) : (
                <form onSubmit={handleEnviarSolicitacao} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                      <input type="text" value={user.name} disabled className="mt-1 block w-full bg-gray-100 px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">RA</label>
                      <input type="text" value={user.ra} disabled className="mt-1 block w-full bg-gray-100 px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Horário Atual</label>
                    <input type="text" value={new Date().toLocaleTimeString()} disabled className="mt-1 block w-full bg-gray-100 px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo do Atraso *</label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      required
                      placeholder="Explique o motivo do atraso..."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    Enviar Solicitação
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
