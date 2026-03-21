'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gerarPDFAssinatura, gerarRelatorioGeral } from '@/utils/pdfGenerator';
import { getDataEscolar } from '@/utils/horarios';
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
  const [activeTab, setActiveTab] = useState<'entradas' | 'alunos'>('entradas');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [mostraModal, setMostraModal] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ nome: '', ra: '', rg: '', turma: '' });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Função para carregar dados iniciais e via polling de segurança
  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      setEntradas(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const carregarAlunos = useCallback(async () => {
    try {
      const response = await fetch('/api/adm/alunos');
      const data = await response.json();
      setAlunos(data);
    } catch (e) { console.error(e); }
  }, []);

  // Gerenciamento do Alarme Persistente
  useEffect(() => {
    const temPendentes = entradas.some(e => e.status === 'pendente' && e.data === getDataEscolar());
    
    if (temPendentes) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.log("Interação necessária para áudio:", err));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [entradas]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    
    // Configuração do Áudio (Loop contínuo)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;

    carregarEntradas(filtroData);
    carregarAlunos();

    // 1. SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE)
    if (supabase) {
      const channel = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'entradas'
        }, () => {
          // Quando qualquer coisa mudar no banco (nova entrada ou update), recarrega
          carregarEntradas(filtroData);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }

    // 2. Polling de Backup (caso o realtime falhe)
    const interval = setInterval(() => carregarEntradas(filtroData), 5000);
    return () => clearInterval(interval);
  }, [filtroData, carregarEntradas, carregarAlunos, router]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await fetch('/api/adm/entradas/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus })
    });
    // O realtime cuidará de atualizar a lista automaticamente
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
    } else { alert("Erro ao cadastrar."); }
  };

  const handleDeletar = async (id: string) => {
    if (confirm("Excluir aluno permanentemente?")) {
      await fetch(`/api/adm/alunos?id=${id}`, { method: 'DELETE' });
      carregarAlunos();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-background text-foreground"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-card p-6 sm:p-8 rounded-[2rem] border border-border shadow-sm gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-6xl font-black text-foreground/5 pointer-events-none italic">ADM</div>
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/20 italic">N</div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight italic">PortãoEdu <span className="text-secondary font-light">GESTÃO</span></h1>
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">E.E. Nancy de Oliveira Fidalgo</p>
            </div>
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <div className="px-4 py-2 bg-background border border-border rounded-xl flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase text-secondary">Operador: {user.nome}</span>
            </div>
            <button onClick={() => setMostraModal(true)} className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">+ Aluno</button>
            <button onClick={handleLogout} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100">Sair</button>
          </div>
        </header>

        {/* Alerta Visual de Aluno Pendente */}
        {entradas.some(e => e.status === 'pendente') && (
          <div className="bg-orange-500 text-white p-6 rounded-[2rem] flex items-center justify-between animate-pulse shadow-2xl shadow-orange-200">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🔔</span>
              <div>
                <p className="font-black uppercase italic tracking-tighter text-xl">Atenção Carlos/Ivone!</p>
                <p className="font-bold opacity-80 text-sm uppercase">Há alunos aguardando liberação no portão.</p>
              </div>
            </div>
            <button onClick={() => audioRef.current?.play()} className="px-4 py-2 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Ativar Som (se mudo)</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-sm ${entradas.some(e => e.status === 'pendente') ? 'bg-orange-500 text-white' : 'bg-card border-border'}`}>
            <p className="text-[10px] font-black uppercase mb-1 opacity-70 tracking-widest">Aguardando</p>
            <p className="text-4xl font-black italic">{entradas.filter(e => e.status === 'pendente').length}</p>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
            <p className="text-[10px] font-black text-secondary uppercase mb-1 tracking-widest">Total Hoje</p>
            <p className="text-4xl font-black text-foreground italic">{entradas.length}</p>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
            <p className="text-[10px] font-black text-secondary uppercase mb-1 tracking-widest">Liberados</p>
            <p className="text-4xl font-black text-emerald-500 italic">{entradas.filter(e => e.status === 'liberado').length}</p>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
            <p className="text-[10px] font-black text-secondary uppercase mb-1 tracking-widest">Direção</p>
            <p className="text-4xl font-black text-red-500 italic">{entradas.filter(e => e.status === 'direcao').length}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-card p-1.5 rounded-[1.5rem] border border-border shadow-sm max-w-sm">
          <button onClick={() => setActiveTab('entradas')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'entradas' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:bg-background'}`}>Monitoramento</button>
          <button onClick={() => setActiveTab('alunos')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alunos' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:bg-background'}`}>Base Alunos</button>
        </div>

        {/* Main Content Area */}
        <main className="bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden">
          {activeTab === 'entradas' ? (
            <div className="p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <h2 className="text-2xl font-black text-foreground tracking-tight uppercase italic border-l-4 border-primary pl-4">Entradas em Tempo Real</h2>
                <div className="flex w-full sm:w-auto space-x-2">
                   <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-background border border-border rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary w-full text-foreground" />
                </div>
              </div>
              
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-black text-secondary uppercase tracking-[0.2em]">
                      <th className="pb-6 px-4">Aluno / Identificação</th>
                      <th className="pb-6 px-4">Horário / Aula</th>
                      <th className="pb-6 px-4">Gestão / Assinatura</th>
                      <th className="pb-6 px-4 text-center">Status</th>
                      <th className="pb-6 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {entradas.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-secondary font-black uppercase italic tracking-widest opacity-30">Nenhum registro encontrado</td></tr>
                    ) : entradas.map(e => (
                      <tr key={e.id} className="group hover:bg-background transition-all">
                        <td className="py-6 px-4">
                          <p className="font-black text-foreground text-sm uppercase group-hover:text-primary transition-colors">{e.nome_aluno}</p>
                          <p className="text-[10px] font-bold text-secondary uppercase tracking-tight">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                        </td>
                        <td className="py-6 px-4">
                          <p className="text-sm font-black text-foreground">{e.horario}</p>
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest">{e.aula_numero}ª Aula</p>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col space-y-1">
                            <p className="text-[10px] font-black text-foreground uppercase tracking-widest">{e.autorizado_por || '-'}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block w-fit ${
                              e.assinatura_status === 'assinado' ? 'bg-emerald-100 text-emerald-600' : 
                              e.assinatura_status === 'recusado' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                            }`}>{e.assinatura_status}</span>
                          </div>
                        </td>
                        <td className="py-6 px-4 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block ${
                            e.status === 'liberado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                            e.status === 'pendente' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 
                            'bg-red-50 text-red-600 border border-red-100'
                          }`}>{e.status}</span>
                        </td>
                        <td className="py-6 px-4 text-right">
                          {e.status === 'pendente' ? (
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => atualizarStatus(e.id, 'liberado')} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 hover:scale-110 transition-all">✅</button>
                              <button onClick={() => atualizarStatus(e.id, 'direcao')} className="px-4 py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase hover:scale-105 transition-all shadow-lg shadow-red-200">Direção</button>
                            </div>
                          ) : (
                            <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} className="px-5 py-2.5 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">🖨️ PDF</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {entradas.length === 0 ? (
                  <div className="py-20 text-center text-secondary font-black uppercase italic tracking-widest opacity-30 text-foreground">Vazio</div>
                ) : entradas.map(e => (
                  <div key={e.id} className="p-6 bg-background rounded-3xl border border-border space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-foreground text-sm uppercase">{e.nome_aluno}</p>
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        e.status === 'liberado' ? 'bg-emerald-100 text-emerald-700' : e.status === 'pendente' ? 'bg-primary text-white' : 'bg-red-100 text-red-700'
                      }`}>{e.status}</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-secondary pt-2">
                       <span>Gestor: {e.autorizado_por || '-'}</span>
                       <span className={e.assinatura_status === 'assinado' ? 'text-emerald-500' : e.assinatura_status === 'recusado' ? 'text-red-500' : ''}>{e.assinatura_status}</span>
                    </div>
                    <div className="pt-2">
                      {e.status === 'pendente' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => atualizarStatus(e.id, 'liberado')} className="py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase">Liberar</button>
                          <button onClick={() => atualizarStatus(e.id, 'direcao')} className="py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase">Direção</button>
                        </div>
                      ) : (
                        <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} className="w-full py-3 bg-foreground text-background rounded-xl font-black text-[10px] uppercase tracking-widest">PDF Comprovante</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <h2 className="text-2xl font-black text-foreground tracking-tight uppercase italic border-l-4 border-primary pl-4">Base de Alunos</h2>
                <input type="text" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} className="bg-background border border-border rounded-xl px-5 py-3 text-xs font-bold w-full sm:w-80 outline-none focus:border-primary shadow-inner text-foreground" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).map(aluno => (
                  <div key={aluno.id} className="p-6 bg-background rounded-[2rem] border border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center text-xl shadow-inner italic font-black text-primary">N</div>
                      <button onClick={() => handleDeletar(aluno.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                    <p className="font-black text-foreground text-xs uppercase leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">{aluno.nome}</p>
                    <div className="space-y-2 text-[9px] font-black text-secondary uppercase tracking-widest pt-4 border-t border-border">
                      <p className="flex justify-between">RA <span className="text-foreground">{aluno.ra}</span></p>
                      <p className="flex justify-between">Turma <span className="text-primary italic">{aluno.turma}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Modal de Cadastro */}
        {mostraModal && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-[3rem] shadow-2xl p-8 sm:p-12 animate-fade-in border border-white/20">
              <div className="flex justify-between items-center mb-10 border-b border-border pb-6">
                <div>
                  <h3 className="text-3xl font-black text-foreground uppercase italic tracking-tighter">Novo Aluno</h3>
                </div>
                <button onClick={() => setMostraModal(false)} className="text-secondary text-3xl">×</button>
              </div>
              <form onSubmit={handleCadastrar} className="space-y-6">
                <input required value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} type="text" placeholder="Nome Completo" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-foreground" />
                <div className="grid grid-cols-2 gap-4">
                  <input required value={novoAluno.ra} onChange={e => setNovoAluno({...novoAluno, ra: e.target.value})} type="text" placeholder="RA" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-foreground" />
                  <input required value={novoAluno.rg} onChange={e => setNovoAluno({...novoAluno, rg: e.target.value})} type="text" placeholder="RG" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-foreground" />
                </div>
                <input required value={novoAluno.turma} onChange={e => setNovoAluno({...novoAluno, turma: e.target.value})} type="text" placeholder="Turma" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-foreground" />
                <button type="submit" className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase">SALVAR CADASTRO</button>
              </form>
            </div>
          </div>
        )}

      </div>
      <footer className="max-w-7xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
