'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-black text-xl italic">N</span>
            </div>
            <span className="text-xl font-black tracking-tighter">PortãoEdu</span>
          </div>
          <Link href="/login" className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-blue-600 transition-all shadow-md">
            Entrar no Sistema
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
            Escola Nancy de Oliveira Fidalgo
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight max-w-4xl">
            Gestão Escolar <br /> 
            <span className="text-blue-600 italic">Inteligente & Segura</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
            Controle de fluxo de alunos em tempo real, geração de documentos automáticos e total transparência para a gestão escolar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button 
              onClick={() => router.push('/login')}
              className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              ACESSAR PORTAL
            </button>
            <a 
              href="https://site-renanbezerra.vercel.app/" 
              target="_blank"
              className="px-10 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              CONHECER AUTOR
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white border-y border-slate-100 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { t: 'Tempo Real', d: 'Carlos e Ivone recebem as solicitações no painel instantaneamente.' },
            { t: 'Documentos PDF', d: 'Comprovantes com campo para assinatura física gerados na hora.' },
            { t: 'Gestão Completa', d: 'Cadastre e gerencie toda a base de alunos diretamente pelo sistema.' }
          ].map((f, i) => (
            <div key={i} className="p-10 bg-slate-50 rounded-3xl space-y-4 border border-transparent hover:border-blue-100 transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md font-black text-blue-600 text-xl">{i+1}</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{f.t}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 text-center">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Desenvolvido por</p>
          <h2 className="text-3xl font-black tracking-tighter">Prof. Renan Bezerra</h2>
          <div className="pt-10 border-t border-slate-100 w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">
            PortãoEdu • 2026
          </div>
        </div>
      </footer>

    </div>
  );
}
