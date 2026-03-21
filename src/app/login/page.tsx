'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(data.user.profile === 'ADM' ? '/adm' : '/aluno');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 font-sans relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-200 mb-6 transform hover:rotate-6 transition-transform">
              <span className="text-white text-4xl font-black">N</span>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-900 to-indigo-800 bg-clip-text text-transparent tracking-tighter">PortãoEdu</h1>
            <p className="text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Escola Nancy de Oliveira Fidalgo</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">RA ou Email Gestão</label>
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu RA (apenas números)"
                  className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-sm group-hover:border-blue-200"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha (Mesmo RA)</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-sm group-hover:border-blue-200"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50/50 backdrop-blur-sm border-2 border-red-100 text-red-600 text-sm font-bold rounded-2xl animate-shake">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AUTENTICANDO...
                </span>
              ) : 'ACESSAR PORTAL'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-50 text-center">
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em]">
              Gestão Carlos & Ivone • PortãoEdu 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
