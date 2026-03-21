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

  const playNotification = () => {
    if (audioRef.current) audioRef.current.play().catch(() => {});
  };

  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      if (data.some((e: any) => e.status === 'pendente')) playNotification();
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
      alert("Sucesso!");
    } else { alert("Erro ao cadastrar."); }
  };

  const handleDeletar = async (id: string) => {
    if (confirm("Excluir aluno?")) {
      await fetch(`/api/adm/alunos?id=${id}`, { method: 'DELETE' });
      carregarAlunos();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm mb-8 gap-4 border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl">N</div>
            <div>
              <h1 className="text-2xl font-black text-blue-900 tracking-tight">PortãoEdu <span className="text-gray-400 font-light">GESTÃO</span></h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">E.E. Nancy de Oliveira Fidalgo</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setMostraModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">+ NOVO ALUNO</button>
            <button onClick={handleLogout} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition">SAIR</button>
          </div>
        </header>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-6 rounded-2xl shadow-sm border transition-all ${entradas.some(e => e.status === 'pendente') ? 'bg-orange-500 text-white animate-pulse' : 'bg-white border-gray-200 text-gray-500'}`}>
            <p className="text-[10px] font-black uppercase mb-1">Aguardando</p>
            <p className="text-3xl font-black">{entradas.filter(e => e.status === 'pendente').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total</p>
            <p className="text-3xl font-black text-gray-800">{entradas.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Liberados</p>
            <p className="text-3xl font-black text-emerald-600">{entradas.filter(e => e.status === 'liberado').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Direção</p>
            <p className="text-3xl font-black text-red-500">{entradas.filter(e => e.status === 'direcao').length}</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex space-x-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 max-w-md">
          <button onClick={() => setActiveTab('entradas')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'entradas' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Monitoramento</button>
          <button onClick={() => setActiveTab('alunos')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alunos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Alunos</button>
        </div>

        {/* Tabela/Lista */}
        <main className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-20">
          {activeTab === 'entradas' ? (
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8 gap-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Pedidos de Entrada</h2>
                <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="pb-4 px-2">Aluno / RA</th>
                      <th className="pb-4 px-2">Horário / Aula</th>
                      <th className="pb-4 px-2">Status</th>
                      <th className="pb-4 px-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entradas.length === 0 ? (
                      <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-bold uppercase italic tracking-widest">Vazio</td></tr>
                    ) : entradas.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-all">
                        <td className="py-5 px-2">
                          <p className="font-black text-gray-800 text-sm uppercase">{e.nome_aluno}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                        </td>
                        <td className="py-5 px-2">
                          <p className="text-sm font-black text-gray-700">{e.horario}</p>
                          <p className="text-[9px] font-black text-blue-600 uppercase">{e.aula_numero}ª Aula</p>
                        </td>
                        <td className="py-5 px-2">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            e.status === 'liberado' ? 'bg-green-100 text-green-700' : e.status === 'pendente' ? 'bg-blue-600 text-white' : 'bg-red-100 text-red-700'
                          }`}>{e.status}</span>
                        </td>
                        <td className="py-5 px-2 text-center">
                          {e.status === 'pendente' ? (
                            <div className="flex justify-center space-x-2">
                              <button onClick={() => atualizarStatus(e.id, 'liberado')} className="w-10 h-10 bg-green-500 text-white rounded-xl shadow hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold">✅</button>
                              <button onClick={() => atualizarStatus(e.id, 'direcao')} className="px-3 h-10 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase hover:scale-105 active:scale-95 transition-all">Direção</button>
                            </div>
                          ) : (
                            <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.ra_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero, status: e.status })} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg">🖨️ PDF</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Base de Alunos</h2>
                <input type="text" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold w-full md:w-64 outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).map(aluno => (
                  <div key={aluno.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xl">🎓</span>
                      <button onClick={() => handleDeletar(aluno.id)} className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 font-bold uppercase transition-all">Excluir</button>
                    </div>
                    <p className="font-black text-gray-800 text-xs uppercase leading-tight mb-3">{aluno.nome}</p>
                    <div className="space-y-1 text-[10px] font-bold text-gray-400 uppercase">
                      <p className="flex justify-between">RA <span>{aluno.ra}</span></p>
                      <p className="flex justify-between">Turma <span className="text-blue-600">{aluno.turma}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Modal de Cadastro */}
        {mostraModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h3 className="text-2xl font-black text-gray-800 uppercase italic">Novo Aluno</h3>
                <button onClick={() => setMostraModal(false)} className="text-gray-300 hover:text-gray-600 text-3xl font-black">×</button>
              </div>
              <form onSubmit={handleCadastrar} className="space-y-5">
                <input required value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} type="text" placeholder="Nome Completo" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <input required value={novoAluno.ra} onChange={e => setNovoAluno({...novoAluno, ra: e.target.value})} type="text" placeholder="RA (Só números)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold" />
                  <input required value={novoAluno.rg} onChange={e => setNovoAluno({...novoAluno, rg: e.target.value})} type="text" placeholder="RG (Só números)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold" />
                </div>
                <input required value={novoAluno.turma} onChange={e => setNovoAluno({...novoAluno, turma: e.target.value})} type="text" placeholder="Turma (Ex: 3ª E)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold" />
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">SALVAR CADASTRO</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
