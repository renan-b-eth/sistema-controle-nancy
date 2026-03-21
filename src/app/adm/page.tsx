'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  const [activeTab, setActiveTab] = useState<'monitor' | 'alunos'>('monitor');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estado para Cadastro de Aluno
  const [novoAluno, setNovoAluno] = useState({ nome: '', ra: '', rg: '', turma: '' });
  const [mostraModal, setMostraModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const playNotification = () => {
    if (audioRef.current) audioRef.current.play().catch(() => {});
  };

  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      const novasEntradas = await response.json();
      if (novasEntradas.some((e: any) => e.status === 'pendente')) playNotification();
      setEntradas(novasEntradas);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const carregarAlunos = useCallback(async () => {
    try {
      const response = await fetch('/api/adm/alunos');
      const data = await response.json();
      setAlunos(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    carregarEntradas(filtroData);
    carregarAlunos();

    const interval = setInterval(() => carregarEntradas(filtroData), 5000);
    return () => clearInterval(interval);
  }, [filtroData, carregarEntradas, carregarAlunos]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await fetch('/api/adm/entradas/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus })
    });
    carregarEntradas(filtroData);
  };

  const cadastrarAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/adm/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoAluno)
    });
    if (response.ok) {
      setNovoAluno({ nome: '', ra: '', rg: '', turma: '' });
      setMostraModal(false);
      carregarAlunos();
      alert("Aluno cadastrado com sucesso!");
    } else {
      alert("Erro ao cadastrar. RA já existe?");
    }
  };

  const deletarAluno = async (id: string) => {
    if (!confirm("Deseja realmente excluir este aluno?")) return;
    await fetch(`/api/adm/alunos?id=${id}`, { method: 'DELETE' });
    carregarAlunos();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">AUTENTICANDO...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Superior */}
        <header className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">N</div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">PortãoEdu <span className="text-blue-600">Gestão</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E.E. Nancy de Oliveira Fidalgo</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setMostraModal(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">+ Novo Aluno</button>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase hover:bg-red-50 hover:text-red-600 transition-all">Sair</button>
          </div>
        </header>

        {/* Tabs de Navegação */}
        <div className="flex space-x-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto lg:mx-0">
          <button onClick={() => setActiveTab('monitor')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'monitor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Monitoramento</button>
          <button onClick={() => setActiveTab('alunos')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alunos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Gerenciar Alunos</button>
        </div>

        {/* Conteúdo Principal */}
        <main className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          
          {/* ABA MONITORAMENTO */}
          {activeTab === 'monitor' && (
            <div className="p-6 md:p-10">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-black text-slate-800">Fluxo de Portaria</h2>
                <div className="flex items-center gap-2">
                  <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <button onClick={() => gerarRelatorioGeral(entradas, filtroData)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all" title="Gerar Relatório Geral">📊</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-4 px-2">Aluno / RA</th>
                      <th className="pb-4 px-2">Horário / Aula</th>
                      <th className="pb-4 px-2">Situação</th>
                      <th className="pb-4 px-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entradas.length === 0 ? (
                      <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Nenhum registro encontrado</td></tr>
                    ) : entradas.map(e => (
                      <tr key={e.id} className={`hover:bg-slate-50/50 transition-all ${e.status === 'pendente' ? 'bg-orange-50/30' : ''}`}>
                        <td className="py-5 px-2">
                          <p className="font-black text-slate-800 text-sm uppercase leading-tight">{e.nome_aluno}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                        </td>
                        <td className="py-5 px-2">
                          <p className="text-sm font-black text-slate-700">{e.horario}</p>
                          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{e.aula_numero}ª Aula</p>
                        </td>
                        <td className="py-5 px-2">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            e.status === 'liberado' ? 'bg-emerald-100 text-emerald-700' : 
                            e.status === 'pendente' ? 'bg-orange-500 text-white animate-pulse' : 'bg-red-100 text-red-700'
                          }`}>{e.status}</span>
                        </td>
                        <td className="py-5 px-2 text-center">
                          {e.status === 'pendente' ? (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => atualizarStatus(e.id, 'liberado')} className="w-10 h-10 bg-emerald-500 text-white rounded-xl shadow-md hover:scale-110 active:scale-95 transition-all">✅</button>
                              <button onClick={() => atualizarStatus(e.id, 'direcao')} className="px-3 h-10 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase shadow-md hover:scale-105 active:scale-95 transition-all">Direção</button>
                            </div>
                          ) : (
                            <button onClick={() => gerarPDFAssinatura({ 
                              nome: e.nome_aluno, 
                              ra: e.ra_aluno, 
                              rg: e.ra_aluno, // RG não é crítico aqui, usamos RA
                              turma: e.turma_aluno, 
                              data: e.data, 
                              horario: e.horario, 
                              aulaNumero: e.aula_numero,
                              status: e.status 
                            })} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-slate-200">🖨️ PDF</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA GERENCIAR ALUNOS */}
          {activeTab === 'alunos' && (
            <div className="p-6 md:p-10 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <h2 className="text-2xl font-black text-slate-800">Base de Alunos Nancy</h2>
                <div className="relative w-full md:w-72">
                  <input type="text" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <span className="absolute right-4 top-3 opacity-30">🔍</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).map(aluno => (
                  <div key={aluno.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">🎓</div>
                      <button onClick={() => deletarAluno(aluno.id)} className="text-xs opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all font-bold">Excluir</button>
                    </div>
                    <p className="font-black text-slate-800 uppercase text-xs leading-tight mb-4">{aluno.nome}</p>
                    <div className="space-y-1.5 border-t border-slate-200/50 pt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">RA <span className="text-slate-600">{aluno.ra}</span></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">Turma <span className="text-blue-600">{aluno.turma}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Modal de Cadastro */}
        {mostraModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">Novo Aluno</h3>
                <button onClick={() => setMostraModal(false)} className="text-slate-300 hover:text-slate-600 text-2xl font-black transition-all">×</button>
              </div>
              <form onSubmit={cadastrarAluno} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <input required value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} type="text" placeholder="Ex: JOÃO SILVA" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">RA</label>
                    <input required value={novoAluno.ra} onChange={e => setNovoAluno({...novoAluno, ra: e.target.value})} type="text" placeholder="Só números" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">RG</label>
                    <input required value={novoAluno.rg} onChange={e => setNovoAluno({...novoAluno, rg: e.target.value})} type="text" placeholder="Só números" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Turma</label>
                  <input required value={novoAluno.turma} onChange={e => setNovoAluno({...novoAluno, turma: e.target.value})} type="text" placeholder="Ex: 3ª E" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 mt-4">Salvar Cadastro</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
