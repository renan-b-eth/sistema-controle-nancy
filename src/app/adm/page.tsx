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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    carregarEntradas(filtroData);

    const channel = supabase
      .channel('novas-entradas-adm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
         carregarEntradas(filtroData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filtroData]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await supabase.from('entradas').update({ status: novoStatus }).eq('id', id);
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Superior */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-100 transform -rotate-3">
              <span className="text-white text-2xl font-black">N</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-800">Painel <span className="text-blue-600">Gestão</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Escola Nancy de Oliveira Fidalgo</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button 
               onClick={() => gerarRelatorioGeral(entradas, filtroData)}
               className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              📊 Relatório PDF
            </button>
            <button 
               onClick={handleLogout} 
               className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hoje</p>
            <p className="text-3xl font-black text-slate-800">{entradas.length}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-100 text-white">
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Pendentes</p>
            <p className="text-3xl font-black">{entradas.filter(e => e.status === 'pendente').length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Liberados</p>
            <p className="text-3xl font-black text-emerald-600">{entradas.filter(e => e.status === 'liberado').length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Restritos</p>
            <p className="text-3xl font-black text-red-500">{entradas.filter(e => e.status === 'direcao').length}</p>
          </div>
        </div>

        {/* Tabs de Navegação Estilizadas */}
        <div className="flex space-x-2 mb-8 bg-slate-100/50 p-2 rounded-[2rem] border border-slate-200/50 max-w-md">
          <button 
            onClick={() => setActiveTab('entradas')} 
            className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'entradas' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
          >
            Acessos
          </button>
          <button 
            onClick={() => setActiveTab('alunos')} 
            className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'alunos' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
          >
            Alunos
          </button>
        </div>

        <main className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          {activeTab === 'entradas' && (
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Movimentação</h2>
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                      <th className="px-6 py-2">Aluno / Dados Escolares</th>
                      <th className="px-6 py-2">Horário / Aula</th>
                      <th className="px-6 py-2">Status</th>
                      <th className="px-6 py-2 text-center">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                       <tr><td colSpan={4} className="text-center py-20 text-slate-300 font-bold">Carregando dados...</td></tr>
                    ) : entradas.length === 0 ? (
                       <tr><td colSpan={4} className="text-center py-20 text-slate-300 font-bold italic">Nenhum registro encontrado para esta data.</td></tr>
                    ) : entradas.map(e => (
                      <tr key={e.id} className={`group bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm border border-slate-50 rounded-3xl overflow-hidden ${e.status === 'pendente' ? 'ring-2 ring-blue-100 bg-blue-50/20' : ''}`}>
                        <td className="px-6 py-6 rounded-l-3xl">
                          <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{e.nome_aluno}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                        </td>
                        <td className="px-6 py-6">
                          <p className="font-black text-slate-700 text-lg">{e.horario}</p>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{e.aula_numero}ª AULA</p>
                        </td>
                        <td className="px-6 py-6">
                          <span className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            e.status === 'liberado' ? 'bg-emerald-100 text-emerald-700' : 
                            e.status === 'pendente' ? 'bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-200' :
                            e.status === 'bloqueado' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center rounded-r-3xl">
                          <div className="flex justify-center items-center space-x-2">
                            {e.status === 'pendente' ? (
                              <>
                                <button 
                                  onClick={() => atualizarStatus(e.id, 'liberado')} 
                                  className="h-12 w-12 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center transition-all active:scale-90"
                                  title="Liberar Entrada"
                                >
                                  ✅
                                </button>
                                <button 
                                  onClick={() => atualizarStatus(e.id, 'direcao')} 
                                  className="h-12 px-4 bg-red-500 text-white rounded-2xl hover:bg-red-600 shadow-lg shadow-red-100 flex items-center justify-center transition-all active:scale-90 font-black text-[10px] uppercase"
                                >
                                  Direção
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => gerarPDFAssinatura({
                                  nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno,
                                  data: e.data, horario: e.horario, aulaNumero: e.aula_numero
                                })} 
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all"
                              >
                                Re-imprimir PDF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alunos' && (
            <div className="p-8 md:p-12">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">Base de Alunos Nancy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentsData.map(aluno => (
                  <div key={aluno.ra} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                    <p className="font-black text-slate-800 uppercase text-sm mb-4 leading-tight">{aluno.nome}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-200/50 pb-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RA</span>
                         <span className="text-xs font-bold text-slate-600">{aluno.ra.replace(/\D/g, '')}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</span>
                         <span className="text-xs font-bold text-blue-600">{aluno.turma}</span>
                      </div>
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
