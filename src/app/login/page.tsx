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

    // Student Login (RG as username and password)
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
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">PortãoEdu</h1>
          <p className="text-gray-500 mt-2">Controle de Acesso Escolar</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">RG ou E-mail</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu RG ou E-mail"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Entrar no Sistema
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Desenvolvido para gestão escolar
          </p>
        </div>
      </div>
    </div>
  );
}
