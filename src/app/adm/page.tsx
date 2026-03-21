'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import studentsData from '@/data/students.json';
import { gerarPDFAssinatura, gerarRelatorioGeral } from '@/utils/pdfGenerator';
import { supabase } from '@/utils/supabase';

interface Entrada {
  id: string;
  data: string;
  horario: string;
  aula_numero: number;
  status: 'pendente' | 'liberado' | 'bloqueado' | 'direcao';
  nome_aluno: string;
  ra_aluno: string;
  rg_aluno: string;
  turma_aluno: string;
  protocolo: string;
}

export default function AdmDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'entradas' | 'alunos'>('entradas');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  const carregarEntradas = async (dataParaFiltrar: string) => {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select('*')
        .eq('data', dataParaFiltrar)
        .order('horario', { ascending: false });

      if (error) throw error;
      setEntradas(data || []);
    } catch (e) {
      console.error("Erro ao carregar do Supabase:", e);
    }
  };

  useEffect(() => {
    // Pegamos os dados do user do cookie via middleware, mas para a UI pegamos do localStorage (ou uma API /me)
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    carregarEntradas(filtroData);

    const channel = supabase
      .channel('novas-entradas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
         carregarEntradas(filtroData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filtroData]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await supabase.from('entradas').update({ status: novoStatus }).eq('id', id);
    carregarEntradas(filtroData);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleGerarRelatorio = () => {
    gerarRelatorioGeral(entradas, filtroData);
  };

  if (!user) return <p className="p-8 text-center font-bold">Autenticando...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-800">PortãoEdu <span className="text-gray-400 font-light">| GESTÃO</span></h1>
            <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">Escola Nancy de Oliveira Fidalgo</p>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
             <button 
               onClick={handleGerarRelatorio}
               className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 text-sm"
             >
               📊 Gerar Relatório PDF
             </button>
             <button 
               onClick={handleLogout} 
               className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-100 text-sm"
             >
               Sair
             </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
          <button onClick={() => setActiveTab('entradas')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'entradas' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
            📋 Registros do Dia
          </button>
          <button onClick={() => setActiveTab('alunos')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'alunos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
            🎓 Alunos Cadastrados
          </button>
        </div>

        <main className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'entradas' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Histórico de Acessos</h2>
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                      <th className="p-4">Aluno / Turma</th>
                      <th className="p-4">Horário / Aula</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entradas.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-bold text-gray-800 uppercase text-sm">{e.nome_aluno}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">RA: {e.ra_aluno} | {e.turma_aluno}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-700">{e.horario}</p>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{e.aula_numero}ª Aula</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            e.status === 'liberado' ? 'bg-green-100 text-green-700' : 
                            e.status === 'pendente' ? 'bg-blue-600 text-white animate-pulse' :
                            e.status === 'bloqueado' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-center flex justify-center space-x-2">
                          {e.status === 'pendente' && (
                            <>
                              <button onClick={() => atualizarStatus(e.id, 'liberado')} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600">✅</button>
                              <button onClick={() => atualizarStatus(e.id, 'direcao')} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Direção</button>
                            </>
                          )}
                          {e.status === 'liberado' && (
                            <button onClick={() => gerarPDFAssinatura({
                              nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno,
                              data: e.data, horario: e.horario, aulaNumero: e.aula_numero
                            })} className="text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-200">Re-imprimir PDF</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alunos' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Lista de Alunos Registrados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentsData.map(aluno => (
                  <div key={aluno.ra} className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                    <p className="font-black text-gray-800 uppercase text-xs">{aluno.nome}</p>
                    <div className="mt-2 text-[10px] font-bold text-gray-400 space-y-1">
                      <p>RA: <span className="text-gray-600">{aluno.ra.replace(/\D/g, '')}</span></p>
                      <p>TURMA: <span className="text-gray-600">{aluno.turma}</span></p>
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
