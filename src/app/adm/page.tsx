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
  const [activeTab, setActiveTab] = useState<'entradas' | 'alunos'>('entradas');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filtroData, setFiltroData] = useState(getDataEscolar()); 
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Função para tocar o som de alerta
  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Erro ao tocar som:", e));
    }
  };

  const carregarEntradas = useCallback(async (dataParaFiltrar: string) => {
    try {
      // BUSCA VIA API BACKEND (Garante que os dados apareçam sem bloqueio de RLS)
      const response = await fetch(`/api/adm/entradas?data=${dataParaFiltrar}`);
      if (!response.ok) throw new Error('Erro na API');
      
      const novasEntradas = (await response.json()) as Entrada[];
      
      // ALERTA SONORO: Se houver alguém pendente, toca o som
      if (novasEntradas.some(e => e.status === 'pendente')) {
        playNotification();
      }

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
    
    // Som de Alerta insistentemente
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    carregarEntradas(filtroData);

    // 1. Inscrição em Tempo Real (Supabase)
    const channel = supabase ? supabase
      .channel('db-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
         carregarEntradas(filtroData);
      })
      .subscribe() : null;

    // 2. Polling Ultrarápido (3 segundos) - Garante que o pedido apareça mesmo se o Realtime falhar
    const interval = setInterval(() => {
      carregarEntradas(filtroData);
    }, 3000);

    return () => { 
      if (channel) supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, [filtroData, carregarEntradas]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    if (!supabase) return;
    await supabase.from('entradas').update({ status: novoStatus }).eq('id', id);
    carregarEntradas(filtroData);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="p-20 text-center animate-pulse font-black text-blue-600">CARREGANDO GESTÃO...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white text-2xl font-black">N</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-800 uppercase">PortãoEdu <span className="text-blue-600">Gestão</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Carlos, Ivone & Irina</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button onClick={() => gerarRelatorioGeral(entradas, filtroData)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">Relatório PDF</button>
            <button onClick={handleLogout} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100">Sair</button>
          </div>
        </header>

        {/* Status de Pedidos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className={`p-8 rounded-[2.5rem] shadow-xl transition-all duration-500 flex flex-col justify-center ${entradas.some(e => e.status === 'pendente') ? 'bg-orange-500 animate-pulse text-white scale-105' : 'bg-white border border-slate-100 text-slate-400'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2">Pedidos Pendentes</p>
            <p className="text-5xl font-black leading-none">{entradas.filter(e => e.status === 'pendente').length}</p>
            {entradas.some(e => e.status === 'pendente') && <p className="text-[10px] font-bold mt-2 uppercase animate-bounce">Aguardando Ação!</p>}
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Registros</p>
            <p className="text-4xl font-black text-slate-800">{entradas.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liberados</p>
            <p className="text-4xl font-black text-emerald-600">{entradas.filter(e => e.status === 'liberado').length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Restritos</p>
            <p className="text-4xl font-black text-red-500">{entradas.filter(e => e.status === 'direcao').length}</p>
          </div>
        </div>

        {/* Lista de Acessos */}
        <main className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monitoramento de Portaria</h2>
              <input type="date" value={filtroData} onChange={(e) => { setFiltroData(e.target.value); carregarEntradas(e.target.value); }} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-sm outline-none focus:border-blue-500" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                    <th className="px-6 py-2">Aluno</th>
                    <th className="px-6 py-2">Horário</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-20 text-slate-300 font-bold italic uppercase tracking-widest">Nenhum pedido encontrado.</td></tr>
                  ) : entradas.map(e => (
                    <tr key={e.id} className={`group bg-white hover:bg-slate-50 transition-all shadow-sm border border-slate-50 rounded-3xl ${e.status === 'pendente' ? 'ring-4 ring-orange-100 bg-orange-50/10' : ''}`}>
                      <td className="px-6 py-6 rounded-l-3xl">
                        <p className="font-black text-slate-800 uppercase text-sm">{e.nome_aluno}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">RA: {e.ra_aluno} • {e.turma_aluno}</p>
                      </td>
                      <td className="px-6 py-6 text-lg font-black text-slate-700">{e.horario}</td>
                      <td className="px-6 py-6 uppercase font-black text-[10px] tracking-widest">
                        <span className={`px-4 py-2 rounded-xl ${e.status === 'liberado' ? 'bg-emerald-100 text-emerald-700' : e.status === 'pendente' ? 'bg-orange-500 text-white animate-bounce' : 'bg-red-100 text-red-700'}`}>{e.status}</span>
                      </td>
                      <td className="px-6 py-6 text-center rounded-r-3xl">
                        {e.status === 'pendente' ? (
                          <div className="flex justify-center space-x-2">
                            <button onClick={() => atualizarStatus(e.id, 'liberado')} className="h-12 w-12 bg-emerald-500 text-white rounded-2xl shadow-lg hover:scale-110 active:scale-90 transition-all flex items-center justify-center">✅</button>
                            <button onClick={() => atualizarStatus(e.id, 'direcao')} className="h-12 px-4 bg-red-500 text-white rounded-2xl shadow-lg font-black text-[10px] uppercase hover:scale-105 active:scale-90 transition-all">Direção</button>
                          </div>
                        ) : (
                          <button onClick={() => gerarPDFAssinatura({ nome: e.nome_aluno, ra: e.ra_aluno, rg: e.rg_aluno, turma: e.turma_aluno, data: e.data, horario: e.horario, aulaNumero: e.aula_numero })} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">Imprimir PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
