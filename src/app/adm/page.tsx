'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import studentsData from '@/data/students.json';
import { gerarPDFAssinatura, gerarRelatorioGeral } from '@/utils/pdfGenerator';
import { supabase } from '@/utils/supabase';
import { getDataEscolar } from '@/utils/horarios';

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
  const [activeTab, setActiveTab] = useState<'monitor' | 'alunos' | 'estatisticas'>('monitor');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Aguardando interação para áudio..."));
    }
  };

  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      const novasEntradas = (await response.json()) as Entrada[];
      if (novasEntradas.some(e => e.status === 'pendente')) playNotification();
      setEntradas(novasEntradas);
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    carregarEntradas(filtroData);

    const channel = supabase ? supabase.channel('db-adm').on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => carregarEntradas(filtroData)).subscribe() : null;
    const interval = setInterval(() => carregarEntradas(filtroData), 4000);

    return () => { 
      if (channel) supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, [filtroData, carregarEntradas]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    const response = await fetch('/api/adm/entradas/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus })
    });
    if (response.ok) carregarEntradas(filtroData);
  };

  const entradasFiltradas = entradas.filter(e => 
    e.nome_aluno.toLowerCase().includes(busca.toLowerCase()) || 
    e.ra_aluno.includes(busca)
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="p-20 text-center animate-pulse font-black text-blue-600">SISTEMA NANCY CARREGANDO...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10 selection:bg-blue-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Profissional */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
              <span className="text-white text-3xl font-black italic">N</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-800 uppercase">PortãoEdu <span className="text-blue-600">Pro</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Painel de Gestão Escolar • 2026</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none relative">
              <input 
                type="text" 
                placeholder="Buscar Aluno ou RA..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full lg:w-64 pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
              />
              <span className="absolute left-4 top-3.5 opacity-30">🔍</span>
            </div>
            <button onClick={() => gerarRelatorioGeral(entradas, filtroData)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Relatório PDF</button>
            <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">Sair</button>
          </div>
        </header>

        {/* Dash de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Aguardando', value: entradas.filter(e => e.status === 'pendente').length, color: 'orange', alert: true },
            { label: 'Liberados Hoje', value: entradas.filter(e => e.status === 'liberado').length, color: 'emerald' },
            { label: 'Encaminhados', value: entradas.filter(e => e.status === 'direcao').length, color: 'red' },
            { label: 'Total Geral', value: entradas.length, color: 'slate' }
          ].map((m, i) => (
            <div key={i} className={`p-8 rounded-[2.5rem] shadow-sm border transition-all duration-500 ${m.alert && m.value > 0 ? 'bg-orange-500 text-white animate-pulse' : 'bg-white border-slate-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${m.alert && m.value > 0 ? 'text-orange-100' : 'text-slate-400'}`}>{m.label}</p>
              <p className="text-4xl font-black leading-none tracking-tighter">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Navegação de Abas */}
        <div className="flex space-x-2 mb-8 bg-slate-200/30 p-2 rounded-[2rem] max-w-sm">
          <button onClick={() => setActiveTab('monitor')} className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'monitor' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Monitoramento</button>
          <button onClick={() => setActiveTab('alunos')} className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alunos' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Base Alunos</button>
        </div>

        <main className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden mb-20">
          {activeTab === 'monitor' && (
            <div className="p-8 lg:p-12">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Fluxo de Portaria</h2>
                <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                      <th className="px-6 py-2">Identificação</th>
                      <th className="px-6 py-2">Horário/Aula</th>
                      <th className="px-6 py-2">Status Atual</th>
                      <th className="px-6 py-2 text-center">Decisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradasFiltradas.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-20 text-slate-300 font-bold uppercase tracking-widest">Nenhum registro para esta data.</td></tr>
                    ) : entradasFiltradas.map(e => (
                      <tr key={e.id} className={`group bg-white hover:bg-slate-50 transition-all border border-slate-50 rounded-3xl shadow-sm ${e.status === 'pendente' ? 'ring-4 ring-orange-100 bg-orange-50/5' : ''}`}>
                        <td className="px-6 py-6 rounded-l-3xl">
                          <p className="font-black text-slate-800 uppercase text-sm leading-tight">{e.nome_aluno}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-lg font-black text-slate-700">{e.horario}</p>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{e.aula_numero}ª AULA</p>
                        </td>
                        <td className="px-6 py-6 uppercase font-black text-[9px] tracking-[0.2em]">
                          <span className={`px-4 py-2 rounded-xl shadow-sm ${e.status === 'liberado' ? 'bg-emerald-500 text-white' : e.status === 'pendente' ? 'bg-orange-500 text-white animate-bounce' : 'bg-red-600 text-white'}`}>{e.status === 'direcao' ? 'ENCAMINHADO' : e.status}</span>
                        </td>
                        <td className="px-6 py-6 text-center rounded-r-3xl">
                          <div className="flex justify-center items-center space-x-3">
                            {e.status === 'pendente' ? (
                              <>
                                <button onClick={() => atualizarStatus(e.id, 'liberado')} className="h-12 w-12 bg-emerald-500 text-white rounded-2xl shadow-lg hover:scale-110 active:scale-90 transition-all flex items-center justify-center">✅</button>
                                <button onClick={() => atualizarStatus(e.id, 'direcao')} className="h-12 px-4 bg-red-500 text-white rounded-2xl shadow-lg font-black text-[10px] uppercase hover:scale-105 transition-all">Direção</button>
                              </>
                            ) : (
                              <button 
                                onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} 
                                className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-600 transition-all"
                              >
                                {e.status === 'direcao' ? '📄 Guia Direção' : '🖨️ Imprimir PDF'}
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
            <div className="p-8 lg:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentsData.map(aluno => (
                  <div key={aluno.ra} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-500 group">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500 text-lg">🎓</div>
                       <span className="text-[9px] font-black px-3 py-1 bg-white border border-slate-100 rounded-full text-slate-400 uppercase tracking-widest">Ativo</span>
                    </div>
                    <p className="font-black text-slate-800 uppercase text-sm mb-4 leading-tight">{aluno.nome}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-200/50 pb-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RA</span>
                         <span className="text-xs font-bold text-slate-600">{aluno.ra.replace(/[-\s]/g, '')}</span>
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
