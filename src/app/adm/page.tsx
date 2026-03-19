'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import studentsData from '@/data/students.json';
import { gerarPDFAssinatura } from '@/utils/pdfGenerator';

interface Entrada {
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

export default function AdmDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'entradas' | 'alunos'>('entradas');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.profile !== 'ADM') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    carregarEntradas();
  }, [router]);

  const carregarEntradas = () => {
    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    setEntradas(todas);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const imprimirPDF = (e: Entrada) => {
    gerarPDFAssinatura({
      nome: e.nome,
      ra: e.ra,
      rg: e.rg,
      turma: e.turma,
      data: e.data,
      horario: e.horario,
      aulaNumero: e.aulaNumero
    });
  };

  const entradasFiltradas = entradas.filter(e => {
    const dataFormatada = new Date(filtroData + 'T00:00:00').toLocaleDateString();
    return e.data === dataFormatada;
  });

  if (!user) return <p className="p-8 text-center">Carregando...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-800">PortãoEdu <span className="text-gray-400 font-light">| ADM</span></h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Bem-vindo(a), {user.name} (Gestão Nancy)</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-100"
          >
            Sair
          </button>
        </header>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('entradas')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'entradas' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            📋 Registro de Entradas
          </button>
          <button
            onClick={() => setActiveTab('alunos')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'alunos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            🎓 Lista de Alunos (Nancy)
          </button>
        </div>

        <main className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'entradas' && (
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-800">Log de Acessos</h2>
                <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <label className="text-xs font-black text-gray-500 uppercase ml-2">Data:</label>
                  <input
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                      <th className="p-4">Aluno / Turma</th>
                      <th className="p-4">Horário / Aula</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entradasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhum registro para esta data.</td>
                      </tr>
                    ) : (
                      entradasFiltradas.map(e => (
                        <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-800">{e.nome}</p>
                            <p className="text-xs text-gray-500">RA: {e.ra} | RG: {e.rg} | {e.turma}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-gray-700">{e.horario}</p>
                            <p className="text-xs text-blue-600 font-bold uppercase">{e.aulaNumero}ª Aula</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              e.status === 'liberado' ? 'bg-green-100 text-green-700' : 
                              e.status === 'bloqueado' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {e.status === 'direcao' ? 'Encaminhado Direção' : e.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {e.status !== 'direcao' && (
                              <button 
                                onClick={() => imprimirPDF(e)}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                              >
                                🖨️ Re-imprimir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alunos' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Cadastro de Alunos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentsData.map(aluno => (
                  <div key={aluno.ra} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-gray-800">{aluno.nome}</p>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${
                        aluno.liberadoSegundaAula ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {aluno.liberadoSegundaAula ? 'OK 2ª Aula' : 'Bloqueado 2ª'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-bold uppercase">RA: <span className="text-gray-700">{aluno.ra}</span></p>
                      <p className="text-xs text-gray-500 font-bold uppercase">RG: <span className="text-gray-700">{aluno.rg}</span></p>
                      <p className="text-xs text-gray-500 font-bold uppercase">Turma: <span className="text-gray-700">{aluno.turma}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
