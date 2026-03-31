'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ entradas: 0, alunos: 0, turmas: 0 });

  // Simulated stats - in production would come from API
  useEffect(() => {
    setStats({
      entradas: 1247,
      alunos: 342,
      turmas: 12
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-primary/3 rounded-full blur-[150px]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-primary">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transform hover:rotate-6 transition-transform">
              <span className="text-white font-black text-xl italic">N</span>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-lg sm:text-xl font-black tracking-tighter text-foreground">PortãoEdu</span>
              <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-secondary hidden sm:block">Nancy de Oliveira</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-xs font-black uppercase tracking-widest text-secondary">
            <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#tecnologia" className="hover:text-primary transition-colors">Tecnologia</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
            <a href="#autor" className="hover:text-primary transition-colors">Autor</a>
          </div>
          <Link href="/login" className="px-4 sm:px-6 py-2 sm:py-2.5 bg-foreground text-background rounded-full font-bold text-xs sm:text-sm hover:bg-primary hover:text-white transition-all shadow-xl shadow-foreground/5 active:scale-95">
            Acessar Sistema
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-12 animate-fade-in">
            <div className="flex items-center space-x-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-lg font-black text-foreground">{stats.alunos}+</p>
                <p className="text-[8px] font-black uppercase text-secondary tracking-wider">Alunos</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <span className="text-2xl">🚪</span>
              <div>
                <p className="text-lg font-black text-foreground">{stats.entradas.toLocaleString()}+</p>
                <p className="text-[8px] font-black uppercase text-secondary tracking-wider">Entradas</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <span className="text-2xl">🏫</span>
              <div>
                <p className="text-lg font-black text-foreground">{stats.turmas}</p>
                <p className="text-[8px] font-black uppercase text-secondary tracking-wider">Turmas</p>
              </div>
            </div>
          </div>

          {/* Main Hero Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 animate-fade-in">
              <div className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                🏆 Sistema Premiado • 2026
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                Controle de Portaria <br /> 
                <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent italic">Escolar Inteligente</span>
              </h1>
              <p className="text-sm sm:text-lg text-secondary font-medium leading-relaxed max-w-xl">
                Automatize a portaria da <span className="text-foreground font-bold">E.E. Nancy de Oliveira Fidalgo</span> com tecnologia de ponta. Controle de fluxo em tempo real, assinaturas digitais e gestão completa.
              </p>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2">
                {['Tempo Real', 'Supabase', 'Next.js 16', 'PWA', 'Assinatura Digital'].map((feature, i) => (
                  <span key={i} className="px-3 py-1.5 bg-card border border-border rounded-full text-[10px] font-bold text-secondary uppercase tracking-wider">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  onClick={() => router.push('/login')} 
                  className="px-8 py-4 sm:px-10 sm:py-5 bg-primary text-white rounded-[2rem] font-black text-base sm:text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:scale-105 transition-all active:scale-95 flex items-center justify-center group"
                >
                  <span className="mr-2">🚀</span> ACESSAR PORTAL
                </button>
                <a 
                  href="#tecnologia" 
                  className="px-8 py-4 sm:px-10 sm:py-5 bg-card border border-border text-secondary rounded-[2rem] font-black text-base sm:text-lg hover:bg-background hover:text-foreground transition-all flex items-center justify-center shadow-sm"
                >
                  VER TECNOLOGIA
                </a>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5 relative animate-fade-in mt-8 lg:mt-0" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-primary rounded-full blur-[80px] md:blur-[100px] opacity-10"></div>
              <div className="relative bg-card/80 backdrop-blur-3xl p-6 sm:p-8 rounded-[2rem] border border-white/20 shadow-2xl overflow-hidden">
                
                {/* Status Indicator */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase text-emerald-500">Sistema Online</span>
                  </div>
                  <div className="text-[10px] font-black text-secondary">{new Date().toLocaleDateString('pt-BR')}</div>
                </div>

                {/* Mock Dashboard */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/60 p-4 rounded-xl border border-border/50">
                      <p className="text-[8px] font-black uppercase text-secondary mb-1">Pendentes</p>
                      <p className="text-2xl font-black text-amber-500">12</p>
                    </div>
                    <div className="bg-background/60 p-4 rounded-xl border border-border/50">
                      <p className="text-[8px] font-black uppercase text-secondary mb-1">Liberados</p>
                      <p className="text-2xl font-black text-emerald-500">89</p>
                    </div>
                  </div>
                  
                  <div className="bg-background/60 p-4 rounded-xl border border-border/50">
                    <p className="text-[8px] font-black uppercase text-secondary mb-3">Últimas Entradas</p>
                    <div className="space-y-2">
                      {[
                        { nome: 'Ana Clara Santos', hora: '19:42', status: 'liberado' },
                        { nome: 'Bruno Oliveira', hora: '19:38', status: 'pendente' },
                        { nome: 'Carlos Eduardo', hora: '19:35', status: 'liberado' }
                      ].map((entry, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-foreground">{entry.nome}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-secondary">{entry.hora}</span>
                            <span className={`w-2 h-2 rounded-full ${entry.status === 'liberado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-black text-primary uppercase">Live Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Technology Section */}
      <section id="tecnologia" className="py-16 sm:py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-primary font-black uppercase tracking-[0.4em] text-xs mb-2">Stack Tecnológica</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase italic">Construído com as<br/>melhores ferramentas</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              { name: 'Next.js 16', desc: 'Framework React', icon: '⚡' },
              { name: 'Supabase', desc: 'Banco de Dados', icon: '🐘' },
              { name: 'Prisma', desc: 'ORM Moderno', icon: '🔷' },
              { name: 'TypeScript', desc: 'Tipagem Forte', icon: '📘' },
              { name: 'Tailwind CSS', desc: 'Estilização', icon: '🎨' },
              { name: 'PWA', desc: 'App Mobile', icon: '📱' },
              { name: 'WebSockets', desc: 'Tempo Real', icon: '🔄' },
              { name: 'Vercel', desc: 'Hospedagem', icon: '▲' }
            ].map((tech, i) => (
              <div key={i} className="p-4 sm:p-6 bg-background rounded-2xl border border-border hover:border-primary/30 transition-all group text-center">
                <div className="text-2xl sm:text-3xl mb-2">{tech.icon}</div>
                <h3 className="text-sm sm:text-base font-black text-foreground uppercase">{tech.name}</h3>
                <p className="text-[10px] sm:text-xs text-secondary mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase italic">Funcionalidades<br/><span className="text-primary">Completas</span></h2>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Gestão Live', desc: 'Monitore todas as entradas em tempo real. Carlos e Ivone visualizam instantaneamente quem logou e quem aguardando autorização.', icon: '📊', color: 'bg-blue-500' },
              { title: 'Assinatura Digital', desc: 'O aluno confirma sua entrada no próprio celular via QR Code, garantindo validade jurídica e autenticidade.', icon: '✍️', color: 'bg-indigo-500' },
              { title: 'Segurança Avançada', desc: 'Identificação por RA/RG e monitoramento constante contra acessos indevidos. Controle total da escola.', icon: '🛡️', color: 'bg-emerald-500' },
              { title: 'Relatórios PDF', desc: 'Geração de relatórios detalhados em PDF com todos os dados de entrada para documentação.', icon: '📄', color: 'bg-amber-500' },
              { title: 'Controle de Aulas', desc: 'Associe cada entrada ao número da aula (1ª a 5ª). Histórico completo por período letivo.', icon: '📚', color: 'bg-purple-500' },
              { title: 'Modalidade Flexível', desc: 'Modo presencial noturno com horários das 19h00 às 22h45. Suporte a diferentes turnos.', icon: '🕐', color: 'bg-rose-500' }
            ].map((feature, i) => (
              <div key={i} className="p-6 sm:p-8 bg-card rounded-[2rem] border border-border hover:shadow-2xl hover:border-primary/20 transition-all group">
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground mb-3 uppercase tracking-tighter">{feature.title}</h3>
                <p className="text-sm text-secondary font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="bg-foreground text-background rounded-[3rem] p-8 sm:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 text-7xl sm:text-9xl font-black text-white/5 pointer-events-none italic">ABOUT</div>
            <div className="relative z-10 max-w-3xl space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter leading-none italic uppercase">Sobre o<br/><span className="text-primary">PortãoEdu</span></h2>
              <p className="text-sm sm:text-lg text-white/70 font-medium leading-relaxed font-sans">
                O <span className="text-white font-bold">PortãoEdu</span> automatiza a portaria da <span className="text-primary font-bold">E.E. Nancy de Oliveira Fidalgo</span>, unindo tecnologia de ponta com a necessidade escolar de controle de fluxo em tempo real. Desenvolvido por <span className="text-indigo-400 font-bold">Prof. Renan Bezerra</span>, especialista em Engenharia de Software.
              </p>
              <p className="text-sm sm:text-lg text-white/70 font-medium leading-relaxed font-sans">
                O sistema faz parte do ecossistema de inovação que inclui o <span className="text-indigo-400 font-bold italic">Estahack</span>, o maior hackathon das escolas públicas de São Paulo.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl sm:text-3xl font-black text-primary italic">24/7</p>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">Disponível</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl sm:text-3xl font-black text-indigo-400 italic">{"<200ms"}</p>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">Latência</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 italic">99.9%</p>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">Uptime</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl sm:text-3xl font-black text-amber-400 italic">AES</p>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">Segurança</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Author Section */}
      <footer id="autor" className="py-16 sm:py-24 px-4 sm:px-6 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-10">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary to-indigo-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-32 sm:w-40 h-32 sm:h-40 rounded-full border-8 border-card shadow-2xl overflow-hidden relative transition-all duration-700 hover:scale-105 bg-border">
               <img src="https://github.com/renan-b-eth.png" alt="Renan Bezerra" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-2 right-2 w-8 sm:w-10 h-8 sm:h-10 bg-primary rounded-full border-4 border-card flex items-center justify-center text-white text-sm sm:text-xl">✓</div>
          </div>
         
          <div className="space-y-4">
            <p className="text-primary font-black uppercase tracking-[0.5em] text-xs">Desenvolvedor e Fundador</p>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground italic uppercase leading-none">Prof. Renan <br /> <span className="text-primary">Bezerra</span></h2>
            <p className="text-secondary font-medium max-w-2xl mx-auto leading-relaxed text-base sm:text-xl font-sans">
              Especialista em <strong>Engenharia de Software</strong> e <strong>Segurança da Informação</strong>. Criador do ecossistema de inovação educacional que inclui <strong>Rendey</strong> e <strong>Estahack</strong>.
            </p>
            <div className="flex justify-center space-x-4 pt-4">
              <a href="https://site-renanbezerra.vercel.app/" target="_blank" className="px-6 sm:px-8 py-3 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Portfolio</a>
              <a href="https://github.com/renan-b-eth" target="_blank" className="px-6 sm:px-8 py-3 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">GitHub</a>
              <a href="https://www.linkedin.com/in/renan-bezerra/" target="_blank" className="px-6 sm:px-8 py-3 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">LinkedIn</a>
            </div>
          </div>
          
          <div className="pt-12 border-t border-border w-full flex flex-col md:flex-row justify-between items-center gap-4 text-secondary text-[10px] font-black uppercase tracking-[0.3em]">
            <div>PortãoEdu © 2026 • Nancy Management System</div>
            <div className="flex space-x-4 sm:space-x-6">
              <span>E.E. Nancy de Oliveira Fidalgo</span>
              <span className="text-primary">By Renan Bezerra</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
