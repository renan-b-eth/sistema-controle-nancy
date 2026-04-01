'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [modo, setModo] = useState<'aluno' | 'admin'>('aluno');
  const [nomeAluno, setNomeAluno] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [direcaoMessage, setDirecaoMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLoginAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDirecaoMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeAluno }),
      });

      const data = await response.json();

      if (data.redirectDirecao) {
        setDirecaoMessage(data.message);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/aluno');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/loginadm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/adm');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-card/80 backdrop-blur-2xl p-6 sm:p-12 rounded-[2.5rem] shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-primary to-indigo-600 rounded-[1.5rem] shadow-xl shadow-primary/20 mb-4 sm:mb-6 transform hover:rotate-6 transition-transform">
              <span className="text-white text-3xl sm:text-4xl font-black italic">N</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">PortãoEdu</h1>
            <p className="text-secondary font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Escola Nancy de Oliveira Fidalgo</p>
          </div>

          {/* Tabs para alternar entre Aluno e Admin */}
          <div className="flex mb-6 bg-slate-900/50 rounded-xl p-1">
            <button
              onClick={() => { setModo('aluno'); setError(''); setDirecaoMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                modo === 'aluno' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Aluno
            </button>
            <button
              onClick={() => { setModo('admin'); setError(''); setDirecaoMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                modo === 'admin' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔒 Admin
            </button>
          </div>

          {modo === 'aluno' ? (
            <form onSubmit={handleLoginAluno} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">
                  Nome Completo
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={nomeAluno}
                    onChange={(e) => setNomeAluno(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-background border border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground shadow-sm text-sm sm:text-base"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-[9px] text-slate-500 px-1">
                  💡 O sistema reconhecerá você automaticamente pelo nome
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-bounce">
                  ⚠️ {error}
                </div>
              )}

              {direcaoMessage && (
                <div className="p-6 bg-amber-50 text-amber-800 text-sm font-bold rounded-2xl border-2 border-amber-400 animate-pulse">
                  <div className="text-2xl mb-2">🚨</div>
                  {direcaoMessage}
                  <div className="mt-4 text-xs text-amber-700">
                    Horário de entrada encerrado às 20:10. Dirija-se à secretaria.
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ENTRANDO...
                  </span>
                ) : 'REGISTRAR ENTRADA'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginAdmin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">
                  Email
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@adm.com"
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-background border border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground shadow-sm text-sm sm:text-base"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">
                  Senha
                </label>
                <div className="relative group">
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-background border border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground shadow-sm text-sm sm:text-base"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-bounce">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AUTENTICANDO...
                  </span>
                ) : 'ACESSAR PAINEL'}
              </button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em]">
              Gestão Carlos & Ivone • PortãoEdu 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
