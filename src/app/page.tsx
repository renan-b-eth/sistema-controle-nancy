'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-blue-600">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-800">PortãoEdu</span>
          </div>
          <Link 
            href="/login" 
            className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            Acessar Sistema
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
              🚀 Tecnologia Escolar • 2026
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Controle Inteligente <br /> 
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Nancy de Oliveira</span>
            </h1>
            
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
              O <span className="text-slate-800 font-bold">PortãoEdu</span> é a solução definitiva para a gestão de fluxos de alunos na 
              <span className="text-blue-600 font-bold"> E.E. Nancy de Oliveira Fidalgo</span>. 
              Segurança, agilidade e transparência em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => router.push('/login')}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center group"
              >
                ENTRAR NO PORTAL
                <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </button>
              
              <a 
                href="https://site-renanbezerra.vercel.app/" 
                target="_blank"
                className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
              >
                CONHECER O AUTOR
              </a>
            </div>
          </div>

          {/* Visual Showcase */}
          <div className="relative animate-in zoom-in duration-1000 delay-200">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-[120px] opacity-20 transform translate-x-10 translate-y-10"></div>
            <div className="relative bg-white/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/50 shadow-[0_40px_100px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-blue-600 rounded-[2rem] text-white space-y-2 shadow-xl shadow-blue-200">
                  <p className="text-[10px] font-black uppercase opacity-70">Sincronização</p>
                  <p className="text-2xl font-black tracking-tighter">Real-time</p>
                </div>
                <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-2 shadow-xl">
                  <p className="text-[10px] font-black uppercase opacity-70">Identificação</p>
                  <p className="text-2xl font-black tracking-tighter">QR Code</p>
                </div>
                <div className="col-span-2 p-8 bg-white border border-slate-100 rounded-[2rem] space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Documentação Escolar</p>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase">Ativo</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Geração automática de relatórios PDF com campos para assinatura física da gestão.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Feature Section */}
      <section className="bg-white py-24 border-y border-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Projetado para a Realidade <br /> da Escola Pública
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
              O PortãoEdu nasceu para automatizar o controle de atrasos, facilitando o trabalho da gestão e garantindo que os responsáveis tenham ciência da situação escolar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { t: 'Gestão 24h', d: 'Acesso administrativo exclusivo para Carlos, Ivone e Irina gerenciarem todas as solicitações.' },
              { t: 'Justificativa Legal', d: 'Todo registro gera um PDF oficial para assinatura física do responsável ou da direção.' },
              { t: 'Segurança por Horário', d: 'Sistema blindado que só permite logins de alunos durante o período letivo noturno.' }
            ].map((f, i) => (
              <div key={i} className="p-10 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:bg-white transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-50/50 duration-500">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  <span className="font-black text-xl">{i+1}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-4">{f.t}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Autor */}
      <footer className="py-20 px-6 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-10">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-700">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20"></div>
             <img src="https://github.com/renan-b-eth.png" alt="Renan Bezerra" className="w-full h-full object-cover" />
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Desenvolvido por</p>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">Prof. Renan Bezerra</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">
              Engenheiro de Software Full-Stack e Educador. Unindo tecnologia de ponta para transformar a educação pública brasileira.
            </p>
          </div>

          <div className="flex space-x-6">
            <a href="https://site-renanbezerra.vercel.app/" target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors font-black text-xs uppercase tracking-widest border-b-2 border-slate-200 hover:border-blue-600 pb-1">Portfólio</a>
            <a href="https://github.com/renan-b-eth" target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors font-black text-xs uppercase tracking-widest border-b-2 border-slate-200 hover:border-blue-600 pb-1">GitHub</a>
          </div>

          <div className="pt-10 border-t border-slate-200 w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">
            PortãoEdu • E.E. Nancy de Oliveira Fidalgo • 2026
          </div>
        </div>
      </footer>

    </div>
  );
}
