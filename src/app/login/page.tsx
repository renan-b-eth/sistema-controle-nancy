'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import studentsData from '@/data/students.json';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Login (Carlos & Ivone)
    if ((username === 'carlos@adm.com' && password === 'carlos123') || 
        (username === 'ivone@adm.com' && password === 'ivone123')) {
      const user = { 
        email: username, 
        profile: 'ADM', 
        name: username === 'carlos@adm.com' ? 'Carlos' : 'Ivone' 
      };
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/adm');
      return;
    }

    // Student Login (Using the local students.json)
    const student = studentsData.find(s => s.rg === username && username === password);
    
    if (student) {
      const user = { 
        rg: student.rg, 
        profile: 'Aluno', 
        name: student.nome, 
        ra: student.ra,
        turma: student.turma,
        liberadoSegundaAula: student.liberadoSegundaAula
      };
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/aluno');
    } else {
      setError('Credenciais inválidas. Use seu RG como usuário e senha.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-blue-50">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-black">N</span>
          </div>
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">PortãoEdu</h1>
          <p className="text-gray-500 font-medium mt-2">Escola Nancy de Oliveira Fidalgo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-blue-900 uppercase tracking-widest ml-1">RG de Acesso</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu RG completo"
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-blue-900 uppercase tracking-widest ml-1">Senha (RG)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Repita seu RG"
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-r-xl">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            ENTRAR NO SISTEMA
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-gray-50 text-center">
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
            Gestão Administrativa Carlos & Ivone
          </p>
        </div>
      </div>
    </div>
  );
}
