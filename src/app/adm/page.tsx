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
  const [activeTab, setActiveTab] = useState<'entradas' | 'alunos' | 'config' | 'analytics'>('entradas');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [mostraModal, setMostraModal] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ nome: '', ra: '', rg: '', turma: '' });
  const [bypassTime, setBypassTime] = useState(false);
  
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
    const temPendentes = entradas.some(e => e.status === 'pendente' && e.data === getDataEscolar());
    if (temPendentes) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
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
    
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;

    carregarEntradas(filtroData);
    carregarAlunos();
    carregarConfig();

    if (supabase) {
      const channel = supabase
        .channel('adm-realtime-global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, (payload) => {
          console.log("Realtime ADM Update:", payload);
          carregarEntradas(filtroData);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [filtroData, carregarEntradas, carregarAlunos, carregarConfig, router]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await fetch('/api/adm/entradas/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus })
    });
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
    }
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
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in text-foreground">
        
        {/* Header Profissional */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-card p-6 sm:p-8 rounded-[2rem] border border-border shadow-sm gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-6xl font-black text-foreground/5 pointer-events-none italic">NANCY</div>
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl italic">N</div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight italic">PortãoEdu <span className="text-primary font-light not-italic">OS</span></h1>
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Sistema de Gestão Escolar Inteligente</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
            <div className="px-4 py-2 bg-background border border-border rounded-xl flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase text-secondary">Gestor: {user.nome}</span>
            </div>
            <button onClick={() => setMostraModal(true)} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all">+ Aluno</button>
            <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100">Sair</button>
          </div>
        </header>

        {/* Notificações de Alarme */}
        {entradas.some(e => e.status === 'pendente') && (
          <div className="bg-orange-500 text-white p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between animate-pulse shadow-2xl">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <span className="text-4xl">🔔</span>
              <p className="font-black uppercase italic tracking-tighter text-xl">CHAMADA NO PORTÃO!</p>
            </div>
            <div className="flex space-x-4">
               <button onClick={() => audioRef.current?.play()} className="px-6 py-3 bg-white/20 rounded-2xl text-[10px] font-black uppercase border border-white/30">Teste de Áudio</button>
               <button onClick={() => setActiveTab('entradas')} className="px-6 py-3 bg-white text-orange-600 rounded-2xl text-[10px] font-black uppercase">Ver Pedidos</button>
            </div>
          </div>
        )}

        {/* Resumo Dinâmico (Dashboard) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm group hover:border-primary/50 transition-all">
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-4">Aguardando Gestão</p>
            <div className="flex items-end justify-between">
              <p className="text-5xl font-black italic text-primary">{entradas.filter(e => e.status === 'pendente').length}</p>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">⏳</div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm group hover:border-amber-500/50 transition-all">
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-4">Aguardando Aluno</p>
            <div className="flex items-end justify-between">
              <p className="text-5xl font-black italic text-amber-500">{entradas.filter(e => e.status === 'autorizado').length}</p>
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">✍️</div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm group hover:border-emerald-500/50 transition-all">
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-4">Entradas Finais</p>
            <div className="flex items-end justify-between">
              <p className="text-5xl font-black italic text-emerald-500">{entradas.filter(e => e.status === 'liberado').length}</p>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">✅</div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm group hover:border-indigo-500/50 transition-all">
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-4">Base Total</p>
            <div className="flex items-end justify-between">
              <p className="text-5xl font-black italic text-indigo-500">{alunos.length}</p>
              <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">👥</div>
            </div>
          </div>
        </div>

        {/* Menu Lateral Profissional */}
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 space-y-2">
            {[
              { id: 'entradas', label: 'Monitoramento', icon: '📺' },
              { id: 'alunos', label: 'Base de Alunos', icon: '🎓' },
              { id: 'analytics', label: 'Estatísticas', icon: '📈' },
              { id: 'config', label: 'Configuração', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-card text-secondary border border-border hover:bg-background'}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </aside>

          <main className="flex-1 bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden min-h-[600px]">
            {activeTab === 'entradas' && (
              <div className="p-6 sm:p-10 animate-fade-in text-foreground">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                  <h2 className="text-2xl font-black uppercase italic border-l-4 border-primary pl-4">Fluxo de Portaria</h2>
                  <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-background border border-border rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary text-foreground" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-black text-secondary uppercase tracking-widest">
                        <th className="pb-6 px-4">Aluno / Turma</th>
                        <th className="pb-6 px-4 text-center">Status Global</th>
                        <th className="pb-6 px-4">Gestor / Responsável</th>
                        <th className="pb-6 px-4">Assinatura Manual</th>
                        <th className="pb-6 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {entradas.map(e => (
                        <tr key={e.id} className="group hover:bg-background transition-all">
                          <td className="py-6 px-4">
                            <p className="font-black text-sm uppercase">{e.nome_aluno}</p>
                            <p className="text-[10px] font-bold text-secondary uppercase">{e.turma_aluno} • RA: {e.ra_aluno}</p>
                          </td>
                          <td className="py-6 px-4 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block ${
                              e.status === 'liberado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                              e.status === 'autorizado' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' : 
                              e.status === 'pendente' ? 'bg-primary text-white shadow-lg' : 
                              'bg-red-50 text-red-600 border border-red-100'
                            }`}>{e.status === 'autorizado' ? 'Aguard. Aluno' : e.status}</span>
                          </td>
                          <td className="py-6 px-4">
                            <p className="text-[10px] font-black uppercase italic text-foreground">{e.autorizado_por || '-'}</p>
                          </td>
                          <td className="py-6 px-4">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${e.assinatura_status === 'assinado' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                              {e.assinatura_status === 'assinado' ? 'CONCLUÍDA' : 'PENDENTE'}
                            </span>
                          </td>
                          <td className="py-6 px-4 text-right">
                            {e.status === 'pendente' ? (
                              <div className="flex justify-end space-x-2">
                                <button onClick={() => atualizarStatus(e.id, 'autorizado')} className="px-4 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100 hover:scale-105 transition-all">Autorizar</button>
                                <button onClick={() => atualizarStatus(e.id, 'direcao')} className="px-4 py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase hover:scale-105 transition-all shadow-lg shadow-red-100">Direção</button>
                              </div>
                            ) : (
                              <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} className="px-5 py-2.5 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all">Relatório</button>
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
              <div className="p-6 sm:p-10 animate-fade-in text-foreground">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black uppercase italic border-l-4 border-indigo-500 pl-4">Gerenciar Alunos</h2>
                  <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="bg-background border border-border rounded-xl px-5 py-3 text-xs font-bold w-64 text-foreground" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).map(aluno => (
                    <div key={aluno.id} className="p-6 bg-background rounded-3xl border border-border group relative overflow-hidden">
                      <p className="font-black text-xs uppercase mb-4 truncate">{aluno.nome}</p>
                      <div className="flex justify-between text-[9px] font-black text-secondary uppercase tracking-widest">
                        <span>{aluno.turma}</span>
                        <button onClick={() => handleDeletar(aluno.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="p-10 animate-fade-in space-y-12 text-foreground">
                <h2 className="text-2xl font-black uppercase italic border-l-4 border-amber-500 pl-4">Preferências do Sistema</h2>
                <section className="bg-background p-8 rounded-[2rem] border border-border">
                  <div className="flex justify-between items-center text-foreground">
                    <div>
                      <h3 className="font-black text-lg uppercase italic tracking-tighter">Modo Teste / Acesso Livre</h3>
                      <p className="text-xs text-secondary font-bold max-w-md">Desativa a restrição das 19:00, permitindo que alunos loguem em qualquer horário para testes.</p>
                    </div>
                    <button onClick={toggleBypass} className={`w-20 h-10 rounded-full relative transition-all ${bypassTime ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-8 h-8 bg-white rounded-full transition-all ${bypassTime ? 'left-11' : 'left-1'}`}></div>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="p-10 animate-fade-in space-y-10 text-foreground">
                <h2 className="text-2xl font-black uppercase italic border-l-4 border-indigo-500 pl-4">Análise de Fluxo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="p-8 bg-background rounded-3xl border border-border h-64 flex flex-col justify-center items-center text-center">
                      <p className="text-4xl font-black text-primary mb-2">{entradas.filter(e => e.aula_numero === 1).length}</p>
                      <p className="text-[10px] font-black uppercase text-secondary">Alunos na 1ª Aula</p>
                   </div>
                   <div className="p-8 bg-background rounded-3xl border border-border h-64 flex flex-col justify-center items-center text-center">
                      <p className="text-4xl font-black text-amber-500 mb-2">{entradas.filter(e => e.aula_numero === 2).length}</p>
                      <p className="text-[10px] font-black uppercase text-secondary">Alunos na 2ª Aula</p>
                   </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Modal de Cadastro */}
        {mostraModal && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-[3rem] shadow-2xl p-8 sm:p-12 animate-fade-in border border-white/20 text-foreground">
              <div className="flex justify-between items-center mb-10 border-b border-border pb-6 text-foreground">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">Novo Aluno</h3>
                <button onClick={() => setMostraModal(false)} className="text-secondary text-3xl">×</button>
              </div>
              <form onSubmit={handleCadastrar} className="space-y-6">
                <input required value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} type="text" placeholder="Nome Completo" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold text-foreground outline-none focus:border-primary" />
                <div className="grid grid-cols-2 gap-4">
                  <input required value={novoAluno.ra} onChange={e => setNovoAluno({...novoAluno, ra: e.target.value})} type="text" placeholder="RA" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold text-foreground outline-none focus:border-primary" />
                  <input required value={novoAluno.rg} onChange={e => setNovoAluno({...novoAluno, rg: e.target.value})} type="text" placeholder="RG" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold text-foreground outline-none focus:border-primary" />
                </div>
                <input required value={novoAluno.turma} onChange={e => setNovoAluno({...novoAluno, turma: e.target.value})} type="text" placeholder="Turma (Ex: 3ª E)" className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-bold text-foreground outline-none focus:border-primary" />
                <button type="submit" className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase shadow-xl hover:bg-primary-hover transition-all">SALVAR CADASTRO</button>
              </form>
            </div>
          </div>
        )}

      </div>
      <footer className="max-w-7xl mx-auto mt-20 pb-10 text-center text-[10px] text-secondary font-black uppercase tracking-[0.4em]">PortãoEdu • Nancy Management System • 2026</footer>
    </div>
  );
}
