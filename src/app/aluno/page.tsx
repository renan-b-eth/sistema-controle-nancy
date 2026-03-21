'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { getAulaAtual, Aula, getDataEscolar } from '@/utils/horarios';

export default function AlunoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [statusAtual, setStatusAtual] = useState<'pendente' | 'autorizado' | 'liberado' | 'direcao'>('pendente');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  
  const router = useRouter();

  // 1. INICIALIZAÇÃO E F5 AUTOMÁTICO (ABORDAGEM ROBUSTA)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    setMounted(true);

    // RECARREGAMENTO FORÇADO: Executa a cada 5 segundos
    const reloadTimer = setInterval(() => {
      // Pega o status do elemento DOM para decidir se recarrega
      const tag = document.getElementById('status-data');
      const status = tag?.getAttribute('data-status');
      
      if (status === 'pendente' || status === 'autorizado') {
        console.log("Recarregando para atualizar status...");
        window.location.reload();
      }
    }, 5000);

    return () => clearInterval(reloadTimer);
  }, [router]);

  // 2. BUSCA DE DADOS AO CARREGAR (OU RECARREGAR)
  useEffect(() => {
    if (!mounted || !user) return;

    const inicializar = async () => {
      let aula = getAulaAtual();
      
      // Checa Bypass se estiver fora do horário
      if (!aula) {
        try {
          const res = await fetch('/api/adm/config');
          const config = await res.json();
          if (config.bypass) aula = { numero: 1, inicio: 'TESTE', fim: 'TESTE' };
        } catch (e) {}
      }

      if (aula) {
        try {
          const response = await fetch('/api/entradas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              protocolo: `PE-${Date.now()}`, 
              aula_numero: aula.numero, 
              horario: new Date().toLocaleTimeString('pt-BR'), 
              data: getDataEscolar() 
            })
          });

          const data = await response.json();
          if (response.ok) {
            setProtocoloGerado(data.protocolo);
            setStatusAtual(data.status);
          } else {
            setErrorEnvio(data.error);
          }
        } catch (e) {
          setErrorEnvio("Erro de sincronia.");
        }
      } else {
        setErrorEnvio("Sistema fora do horário.");
      }
    };

    inicializar();
  }, [mounted, user]);

  const concluirFinal = async () => {
    const res = await fetch('/api/entradas/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolo: protocoloGerado, status: 'assinado' })
    });
    if (res.ok) {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans relative text-slate-900">
      
      {/* Elemento de auxílio para o timer de reload */}
      <div id="status-data" data-status={statusAtual} className="hidden"></div>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        <header className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20"><span className="text-white font-black text-xl italic">N</span></div>
            <h1 className="text-xl font-black italic tracking-tight">PortãoEdu</h1>
          </div>
          <button onClick={() => { localStorage.removeItem('user'); router.replace('/login'); }} className="px-5 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100">Sair</button>
        </header>

        {errorEnvio && (
          <div className="p-6 bg-red-500 text-white rounded-[2rem] shadow-xl flex items-center space-x-4 border-4 border-white animate-bounce">
            <span className="text-3xl">⚠️</span>
            <p className="font-bold text-xs">{errorEnvio}</p>
          </div>
        )}

        <section>
          {statusAtual === 'pendente' ? (
            /* BANNER AZUL */
            <div className="p-8 sm:p-12 bg-blue-600 text-white rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">WAIT</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-4xl">⏳</span> AGUARDANDO
              </h2>
              <p className="text-lg font-bold opacity-90 leading-relaxed max-w-2xl relative z-10">
                Olá {user.nome.split(' ')[0]}, sua solicitação foi enviada. 
                <br /><br />
                Sua entrada só será liberada quando <span className="underline decoration-2 underline-offset-4 font-black">Ivone ou Carlos</span> autorizarem no sistema.
              </p>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Sincronizando automaticamente...</p>
            </div>
          ) : (statusAtual === 'autorizado' || statusAtual === 'liberado') ? (
            /* BANNER VERDE */
            <div className="p-8 sm:p-12 bg-emerald-500 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 pointer-events-none italic">OK</div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 flex items-center tracking-tighter">
                <span className="mr-4 text-5xl">✅</span> LIBERADO!
              </h2>
              
              {statusAtual === 'autorizado' ? (
                <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/30 space-y-6">
                  <p className="text-sm font-bold opacity-95 leading-relaxed">
                    Olá <span className="font-black uppercase">{user.nome.split(' ')[0]}</span>, sua entrada foi autorizada. Você está <span className="font-black underline">LIBERADO</span>. Obrigado, Carlos.
                  </p>
                  
                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-white/10 cursor-pointer" onClick={() => setTermoAceito(!termoAceito)}>
                    <label className="flex items-start space-x-4 cursor-pointer text-white">
                      <div className={`w-6 h-6 rounded-md border-2 border-white flex items-center justify-center transition-all ${termoAceito ? 'bg-white' : ''}`}>
                        {termoAceito && <span className="text-emerald-600 font-black text-xs">✓</span>}
                      </div>
                      <span className="text-xs font-bold leading-tight flex-1">Afirmo que assinei o documento manual na coordenação e aceito as políticas da escola.</span>
                    </label>
                  </div>

                  <button 
                    disabled={!termoAceito} 
                    onClick={concluirFinal}
                    className={`w-full py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${termoAceito ? 'bg-white text-emerald-600 hover:scale-[1.02]' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                  >
                    Confirmar Entrada e Finalizar
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Acesso Confirmado!</p>
                  <p className="text-sm font-bold opacity-90">Registro concluído. Prossiga para sua sala.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 bg-red-600 text-white rounded-[3rem] shadow-2xl border-4 border-white animate-in slide-in-from-top duration-500 relative overflow-hidden text-center">
              <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">🚨 DIRIJA-SE À DIREÇÃO</h2>
              <p className="text-sm font-bold opacity-90 text-white">Sua entrada deve ser tratada pessoalmente com a coordenação.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Identidade Digital</h2>
            <div className="p-6 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
              <QRCodeCanvas value={protocoloGerado || 'Aguardando'} size={180} fgColor="#0f172a" />
            </div>
            <p className="text-[10px] text-slate-400 mt-8 font-black uppercase tracking-widest">Sincronia Ativa</p>
          </div>
          
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 relative flex flex-col justify-center shadow-sm text-slate-900">
            <h2 className="text-2xl font-black mb-10 tracking-tight border-l-4 border-blue-600 pl-4 uppercase italic">Perfil do Aluno</h2>
            <div className="space-y-6">
              <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 text-slate-400">Nome</p><p className="text-lg font-black uppercase truncate">{user.nome}</p></div>
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 text-slate-400">RA</p><p className="text-lg font-black italic">{user.ra}</p></div>
                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 text-slate-400">Turma</p><p className="text-blue-600 text-lg font-black italic">{user.turma}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-4xl mx-auto mt-20 pb-10 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">PortãoEdu • 2026</footer>
    </div>
  );
}
