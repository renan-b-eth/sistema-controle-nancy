'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginAdminPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[1.5rem] shadow-xl shadow-blue-600/20 mb-4 sm:mb-6">
              <span className="text-white text-3xl sm:text-4xl font-black italic">N</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Acesso Restrito</h1>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Apenas Administração</p>
          </div>

          <form onSubmit={handleLoginAdmin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Email
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-white shadow-sm text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Senha
              </label>
              <div className="relative group">
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-white shadow-sm text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/30 text-red-400 text-xs font-bold rounded-2xl border border-red-500/30">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/25 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
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

          <div className="mt-12 pt-8 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
              PortãoEdu • Acesso Exclusivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
