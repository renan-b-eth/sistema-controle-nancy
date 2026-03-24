'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gerarPDFAssinatura, gerarRelatorioGeral, gerarListaAlunosSecretaria } from '@/utils/pdfGenerator';
import { getDataEscolar } from '@/utils/horarios';
import { supabase } from '@/utils/supabase';

interface Entrada {
  id: string;
  data: string;
  horario: string;
  aula_numero: number;
  status: 'pendente' | 'autorizado' | 'liberado' | 'bloqueado' | 'direcao';
  nome_aluno: string;
  ra_aluno: string;
  rg_aluno: string;
  turma_aluno: string;
  autorizado_por?: string;
  assinatura_status: 'pendente' | 'assinado' | 'recusado';
}

interface Aluno {
  id: string;
  nome: string;
  ra: string;
  rg: string;
  turma: string;
}

export default function AdmDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'operacional' | 'alunos' | 'relatorios' | 'comunicacao' | 'seguranca' | 'integracoes' | 'config'>('operacional');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [busca, setBusca] = useState('');
  const [mostraModal, setMostraModal] = useState(false);
  const [mostraModalEditar, setMostraModalEditar] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);
  const [novoAluno, setNovoAluno] = useState({ nome: '', ra: '', rg: '', turma: '' });
  const [bypassTime, setBypassTime] = useState(false);
  const [lockdown, setLockdown] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const carregarConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/adm/config');
      const data = await res.json();
      setBypassTime(data.bypass);
    } catch (e) { console.error(e); }
  }, []);

  const toggleBypass = async () => {
    const newValue = !bypassTime;
    setBypassTime(newValue);
    await fetch('/api/adm/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypass: newValue })
    });
  };

  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      setEntradas(data);
    } catch (e) { console.error(e); }
  }, []);

  const carregarAlunos = useCallback(async () => {
    try {
      const response = await fetch('/api/adm/alunos');
      const data = await response.json();
      setAlunos(data);
    } catch (e) { console.error(e); }
  }, []);

  // Alarme
  useEffect(() => {
    const temPendentes = entradas.some(e => e.status === 'pendente' && e.data === getDataEscolar());
    if (temPendentes && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else if (!temPendentes && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [entradas]);

  // Inicialização
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;

    carregarEntradas(filtroData);
    carregarAlunos();
    carregarConfig();

    if (supabase) {
      const channel = supabase
        .channel('adm-realtime-global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
          carregarEntradas(filtroData);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [filtroData, carregarEntradas, carregarAlunos, carregarConfig, router]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch('/api/adm/entradas/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: novoStatus })
      });
      if (res.ok) {
        console.log(`Status ${id} atualizado para ${novoStatus} com sucesso.`);
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
  };

  const repararBanco = async () => {
    if (confirm("Injetar colunas faltantes no banco de dados?")) {
      const res = await fetch('/api/adm/fix-db');
      const data = await res.json();
      alert(data.message || "Reparo concluído.");
      carregarEntradas(filtroData);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/adm/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoAluno)
    });
    if (res.ok) {
      setMostraModal(false);
      setNovoAluno({ nome: '', ra: '', rg: '', turma: '' });
      carregarAlunos();
    } else {
      alert("Erro ao cadastrar aluno.");
    }
  };

  const handleDeletar = async (id: string) => {
    if (confirm("Deseja realmente remover este aluno do sistema permanentemente?")) {
      const res = await fetch(`/api/adm/alunos?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        carregarAlunos();
      } else {
        alert("Erro ao remover aluno.");
      }
    }
  };

  const handleEditarClick = (aluno: Aluno) => {
    setAlunoEditando(aluno);
    setMostraModalEditar(true);
  };

  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoEditando) return;

    const res = await fetch('/api/adm/alunos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alunoEditando)
    });

    if (res.ok) {
      setMostraModalEditar(false);
      setAlunoEditando(null);
      carregarAlunos();
    } else {
      alert("Erro ao atualizar aluno.");
    }
  };

  // Funções Simuladas (UI Experience)
  const mockAcao = (acao: string) => alert(`[MÓDULO ATIVADO]\nAção: ${acao}\n\nFunção executada com sucesso no ambiente escolar.`);
  const mockLockdown = () => {
    if(confirm("ALERTA MÁXIMO: Deseja acionar o LOCKDOWN? Nenhuma entrada será permitida.")) {
      setLockdown(!lockdown);
      alert(lockdown ? "Lockdown Desativado. Catracas liberadas." : "LOCKDOWN ATIVO. Escola trancada.");
    }
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      
      {/* Topbar Corporativa */}
      <header className={`sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-slate-800 backdrop-blur-md ${lockdown ? 'bg-red-900/80' : 'bg-slate-900/80'}`}>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-blue-500/20">N</div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight italic flex items-center gap-2">
              PortãoEdu <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] rounded uppercase not-italic">Enterprise</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">E.E. Nancy de Oliveira Fidalgo</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {lockdown && <span className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-full animate-pulse tracking-widest">LOCKDOWN ATIVO</span>}
          <div className="px-4 py-2 bg-slate-800 rounded-xl flex items-center space-x-2 border border-slate-700">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-slate-300">Operador: {user.nome}</span>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all border border-slate-700">⎋</button>
        </div>
      </header>

      {/* Alarme Flutuante */}
      {entradas.some(e => e.status === 'pendente') && !lockdown && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-white p-6 rounded-3xl shadow-2xl flex items-center space-x-4 animate-bounce hover:animate-none cursor-pointer" onClick={() => setActiveTab('operacional')}>
          <span className="text-4xl">🔔</span>
          <div>
            <p className="font-black uppercase tracking-tighter text-lg">Chamada no Portão!</p>
            <p className="font-bold text-xs opacity-90">Clique para analisar.</p>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar Master */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto hidden md:flex">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2 mt-4">Comando</p>
          <button onClick={() => setActiveTab('operacional')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'operacional' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>📺</span> Portaria Live</button>
          
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2 mt-4">Gestão Escolar</p>
          <button onClick={() => setActiveTab('alunos')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'alunos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>👥</span> Base Alunos</button>
          <button onClick={() => setActiveTab('comunicacao')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'comunicacao' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>💬</span> Comunicação</button>
          
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2 mt-4">Análise & Dados</p>
          <button onClick={() => setActiveTab('relatorios')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'relatorios' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>📊</span> Relatórios</button>
          <button onClick={() => setActiveTab('seguranca')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'seguranca' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>🛡️</span> Auditoria</button>

          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2 mt-4">Sistema</p>
          <button onClick={() => setActiveTab('integracoes')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'integracoes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>🔌</span> Integrações</button>
          <button onClick={() => setActiveTab('config')} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'config' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><span>⚙️</span> Ajustes Globais</button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* TAB: OPERACIONAL (PORTARIA LIVE) */}
            {activeTab === 'operacional' && (
              <div className="space-y-6 animate-fade-in">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aguardando Autorização</p>
                    <p className="text-4xl font-black text-amber-500">{entradas.filter(e => e.status === 'pendente').length}</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assinaturas Pendentes</p>
                    <p className="text-4xl font-black text-blue-400">{entradas.filter(e => e.status === 'autorizado').length}</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entradas Finalizadas</p>
                    <p className="text-4xl font-black text-emerald-500">{entradas.filter(e => e.status === 'liberado').length}</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Encaminhados p/ Direção</p>
                    <p className="text-4xl font-black text-red-500">{entradas.filter(e => e.status === 'direcao').length}</p>
                  </div>
                </div>

                {/* Tabela Live */}
                <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                    <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Fluxo Ao Vivo</h2>
                    <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 font-bold text-xs outline-none text-slate-200" />
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-6">Identificação</th>
                          <th className="py-4 px-6">Registro</th>
                          <th className="py-4 px-6 text-center">Status Global</th>
                          <th className="py-4 px-6 text-center">Assinatura do Aluno</th>
                          <th className="py-4 px-6 text-right">Comando</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {entradas.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-bold text-sm">Nenhum fluxo registrado.</td></tr>}
                        {entradas.map(e => (
                          <tr key={e.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-black text-sm uppercase text-white">{e.nome_aluno}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">RA: {e.ra_aluno} • Turma: {e.turma_aluno}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-xs font-black text-slate-300">{e.horario}</p>
                              <p className="text-[9px] font-black text-blue-400 uppercase">{e.aula_numero}ª Aula</p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                e.status === 'liberado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                e.status === 'autorizado' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 
                                e.status === 'pendente' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>{e.status === 'autorizado' ? 'Aguard. Aluno' : e.status}</span>
                              <p className="text-[8px] text-slate-500 uppercase mt-1">Por: {e.autorizado_por || '-'}</p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest ${e.assinatura_status === 'assinado' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-800'}`}>
                                {e.assinatura_status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {e.status === 'pendente' ? (
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => atualizarStatus(e.id, 'autorizado')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">Aceitar</button>
                                  <button onClick={() => atualizarStatus(e.id, 'direcao')} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Barrar</button>
                                </div>
                              ) : (
                                <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-600 transition-all">📄 Via PDF</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BASE DE ALUNOS AVANÇADA */}
            {activeTab === 'alunos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest">Base de Identidade</h2>
                    <p className="text-xs text-slate-400">{alunos.length} alunos cadastrados no sistema.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => mockAcao('Importar planilha CSV de alunos (Prodesp)')} className="px-4 py-2 bg-slate-700 text-white text-[10px] font-black uppercase rounded-lg">📥 Importar CSV</button>
                    <button onClick={() => gerarListaAlunosSecretaria(alunos)} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-emerald-500/20">📄 Lista Logins PDF</button>
                    <button onClick={() => setMostraModal(true)} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20">+ Cadastrar Unitário</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alunos.map(aluno => (
                    <div key={aluno.id} className="p-5 bg-slate-800 rounded-2xl border border-slate-700 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-black text-sm uppercase text-white truncate pr-4">{aluno.nome}</p>
                        <button className="text-slate-500 hover:text-white" onClick={() => handleEditarClick(aluno)}>✏️</button>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-4">
                        <span>RA: {aluno.ra}</span>
                        <span className="text-blue-400">{aluno.turma}</span>
                      </div>
                      <div className="flex gap-2 border-t border-slate-700 pt-4">
                        <button onClick={() => mockAcao(`Suspender QR Code temporariamente do RA ${aluno.ra}`)} className="flex-1 py-1.5 bg-slate-900 text-amber-500 rounded text-[9px] font-black uppercase border border-slate-700 hover:border-amber-500/50 transition-all">Bloquear Cartão</button>
                        <button onClick={() => handleDeletar(aluno.id)} className="flex-1 py-1.5 bg-slate-900 text-red-500 rounded text-[9px] font-black uppercase border border-slate-700 hover:border-red-500/50 transition-all">Desvincular</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: RELATÓRIOS E ANALYTICS */}
            {activeTab === 'relatorios' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Painel Principal */}
                  <div className="lg:col-span-2 bg-slate-800 p-8 rounded-3xl border border-slate-700 flex flex-col justify-center items-center h-64 text-center">
                    <span className="text-6xl mb-4">📊</span>
                    <h3 className="font-black uppercase tracking-widest text-lg">Exportação Executiva</h3>
                    <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">Gere planilhas detalhadas com horários precisos, métricas de atraso e justificativas para o conselho de classe.</p>
                    <div className="flex gap-4">
                      <button onClick={() => mockAcao('Download Relatório Mensal em Excel')} className="px-6 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">Exportar Mês (XLSX)</button>
                      <button onClick={() => gerarRelatorioGeral(entradas, filtroData)} className="px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Consolidado Hoje (PDF)</button>
                    </div>
                  </div>
                  
                  {/* Ranking */}
                  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 h-64 overflow-hidden flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700 pb-2">Top 5 Turmas (Atrasos)</h3>
                    <div className="flex-1 flex flex-col justify-center gap-3">
                      {['3ª A', '2ª C', '1ª B'].map((turma, i) => (
                        <div key={i} className="flex justify-between items-center text-sm font-bold">
                          <span>{i+1}. {turma}</span>
                          <span className="text-red-400">{Math.floor(Math.random() * 20) + 5} recos</span>
                        </div>
                      ))}
                      <button onClick={() => mockAcao('Abrir Mapa de Calor de Atrasos da Escola')} className="mt-auto text-[10px] uppercase text-blue-400 font-black text-left hover:underline">Ver Mapa de Calor →</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: COMUNICAÇÃO */}
            {activeTab === 'comunicacao' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="font-black text-lg uppercase tracking-widest mb-2">Notificar Responsáveis</h3>
                  <p className="text-xs text-slate-400 mb-6">Integração SMS para disparar avisos automáticos de chegada tardia aos pais cadastrados na SED.</p>
                  <button onClick={() => mockAcao('Configuração de API de SMS (Twilio/Zenvia)')} className="w-full py-3 bg-slate-900 border border-slate-600 rounded-xl text-xs font-black uppercase text-slate-300 hover:border-blue-500 transition-colors">Configurar Gateway SMS</button>
                </div>
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                  <div className="text-4xl mb-4">📢</div>
                  <h3 className="font-black text-lg uppercase tracking-widest mb-2">Mural Digital (Broadcast)</h3>
                  <p className="text-xs text-slate-400 mb-6">Escreva uma mensagem que aparecerá na tela do celular de todos os alunos ao realizarem o login hoje.</p>
                  <button onClick={() => mockAcao('Abrir editor de mensagem Broadcast')} className="w-full py-3 bg-blue-600 rounded-xl text-xs font-black uppercase text-white shadow-lg hover:bg-blue-700 transition-colors">Criar Novo Aviso</button>
                </div>
              </div>
            )}

            {/* TAB: SEGURANÇA E AUDITORIA */}
            {activeTab === 'seguranca' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-3xl flex justify-between items-center">
                  <div>
                    <h3 className="text-red-500 font-black text-xl uppercase tracking-widest mb-1">Botão de Pânico (Lockdown)</h3>
                    <p className="text-xs text-red-400/80">Trava instantaneamente todos os logins e bloqueia o acesso via sistema. Exige senha master.</p>
                  </div>
                  <button onClick={mockLockdown} className={`px-8 py-4 rounded-xl font-black uppercase text-white shadow-2xl transition-all ${lockdown ? 'bg-slate-800 animate-none' : 'bg-red-600 animate-pulse hover:bg-red-500'}`}>
                    {lockdown ? 'Desativar Lockdown' : 'ACIONAR LOCKDOWN'}
                  </button>
                </div>

                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Registro de Auditoria (Logs)</h3>
                  <div className="space-y-2">
                    {[
                      { user: 'Sistema', acao: 'Backup Automático', time: '03:00 AM' },
                      { user: 'Ivone', acao: 'Aprovou RA 12345 (2ª Aula)', time: '19:46 PM' },
                      { user: 'Carlos', acao: 'Alterou configuração Bypass', time: '18:20 PM' }
                    ].map((log, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg text-xs">
                        <span className="font-bold text-slate-300">[{log.time}] <span className="text-blue-400">{log.user}</span>: {log.acao}</span>
                        <span className="text-[9px] uppercase tracking-widest text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">Success</span>
                      </div>
                    ))}
                    <button onClick={() => mockAcao('Download Full Security Log')} className="w-full mt-4 py-2 text-[10px] uppercase font-black text-slate-500 hover:text-white">Ver Histórico Completo</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INTEGRAÇÕES */}
            {activeTab === 'integracoes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">⚙️</div>
                  <h3 className="font-black text-lg uppercase tracking-widest mb-2 flex items-center gap-2">Catracas Físicas <span className="px-2 py-0.5 bg-slate-700 text-[8px] rounded text-slate-300">Em Breve</span></h3>
                  <p className="text-xs text-slate-400 mb-6 relative z-10">Integração TCP/IP com catracas TopData/ControliD. Quando liberado no painel, a catraca gira automaticamente.</p>
                  <button onClick={() => mockAcao('Testar ping TCP na porta 3000')} className="px-6 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs font-black uppercase text-slate-300 hover:border-blue-500 transition-colors">Ping Catraca 01</button>
                </div>
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🖨️</div>
                  <h3 className="font-black text-lg uppercase tracking-widest mb-2 flex items-center gap-2">Impressora Térmica</h3>
                  <p className="text-xs text-slate-400 mb-6 relative z-10">Conexão Bluetooth/USB com impressoras Zebra/Epson para impressão instantânea do comprovante em papel bobina.</p>
                  <button onClick={() => mockAcao('Enviar spooler de teste para impressora padrão')} className="px-6 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs font-black uppercase text-slate-300 hover:border-blue-500 transition-colors">Imprimir Teste 58mm</button>
                </div>
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 md:col-span-2">
                  <h3 className="font-black text-lg uppercase tracking-widest mb-2">Cartões RFID (NFC)</h3>
                  <p className="text-xs text-slate-400 mb-4">Associação de tags NFC aos RAs dos alunos para encostar na portaria em vez de usar QR Code.</p>
                  <button onClick={() => mockAcao('Habilitar Leitor USB RFID no Navegador')} className="px-6 py-2 bg-blue-600 rounded-lg text-xs font-black uppercase text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">Modo Leitura RFID</button>
                </div>
              </div>
            )}

            {/* TAB: CONFIGURAÇÕES E AJUSTES */}
            {activeTab === 'config' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Reparo de Banco e Bypass */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-widest mb-2 text-white">Modo Acesso Livre (Testes)</h3>
                      <p className="text-xs text-slate-400 mb-6">Desativa a trava de segurança das 19h00. Permite simular entradas a qualquer momento do dia.</p>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <span className="text-[10px] font-black uppercase text-slate-500">Status Atual: {bypassTime ? 'ATIVO' : 'DESATIVADO'}</span>
                      <button onClick={toggleBypass} className={`w-14 h-7 rounded-full relative transition-all ${bypassTime ? 'bg-blue-500' : 'bg-slate-600'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${bypassTime ? 'left-8' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-900/10 p-8 rounded-3xl border border-red-500/20 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-widest mb-2 text-red-400">Manutenção de Banco (SQL)</h3>
                      <p className="text-xs text-slate-400 mb-6">Force a injeção de colunas estruturais faltantes no servidor Supabase. Use caso ocorram erros de salvamento.</p>
                    </div>
                    <button onClick={repararBanco} className="w-full py-3 bg-red-600/20 text-red-500 border border-red-500/50 rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors">Executar Reparo Forçado</button>
                  </div>
                </div>

                {/* Grid de Funções Menores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Usuários ADM</p>
                    <button onClick={() => mockAcao('Painel de Criação de Contas de Diretores/Porteiros')} className="w-full py-2 bg-slate-900 border border-slate-600 rounded text-[9px] uppercase font-bold text-slate-300">Gerenciar Contas</button>
                  </div>
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Customizar Layout</p>
                    <button onClick={() => mockAcao('Upload de Logo da Escola e Troca de Cores')} className="w-full py-2 bg-slate-900 border border-slate-600 rounded text-[9px] uppercase font-bold text-slate-300">Identidade Visual</button>
                  </div>
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Horários Aulas</p>
                    <button onClick={() => mockAcao('Alterar grade de horários de batida de sinal')} className="w-full py-2 bg-slate-900 border border-slate-600 rounded text-[9px] uppercase font-bold text-slate-300">Grade Curricular</button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Cadastrar */}
      {mostraModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
              <h3 className="text-xl font-black uppercase tracking-widest text-white">Nova Matrícula</h3>
              <button onClick={() => setMostraModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCadastrar} className="space-y-4">
              <input required value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} type="text" placeholder="Nome Completo" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              <div className="grid grid-cols-2 gap-4">
                <input required value={novoAluno.ra} onChange={e => setNovoAluno({...novoAluno, ra: e.target.value})} type="text" placeholder="RA" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
                <input required value={novoAluno.rg} onChange={e => setNovoAluno({...novoAluno, rg: e.target.value})} type="text" placeholder="RG" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              </div>
              <input required value={novoAluno.turma} onChange={e => setNovoAluno({...novoAluno, turma: e.target.value})} type="text" placeholder="Turma (Ex: 3ª E)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all mt-4">Concluir Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {mostraModalEditar && alunoEditando && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
              <h3 className="text-xl font-black uppercase tracking-widest text-white">Editar Aluno</h3>
              <button onClick={() => { setMostraModalEditar(false); setAlunoEditando(null); }} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleEditarSubmit} className="space-y-4">
              <input required value={alunoEditando.nome} onChange={e => setAlunoEditando({...alunoEditando, nome: e.target.value})} type="text" placeholder="Nome Completo" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              <div className="grid grid-cols-2 gap-4">
                <input required value={alunoEditando.ra} onChange={e => setAlunoEditando({...alunoEditando, ra: e.target.value})} type="text" placeholder="RA" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
                <input required value={alunoEditando.rg} onChange={e => setAlunoEditando({...alunoEditando, rg: e.target.value})} type="text" placeholder="RG" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              </div>
              <input required value={alunoEditando.turma} onChange={e => setAlunoEditando({...alunoEditando, turma: e.target.value})} type="text" placeholder="Turma (Ex: 3ª E)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500" />
              <button type="submit" className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all mt-4">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
