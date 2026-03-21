'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      </div>

      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-primary">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transform hover:rotate-6 transition-transform">
              <span className="text-white font-black text-xl italic">N</span>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black tracking-tighter text-foreground">PortãoEdu</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary">Nancy de Oliveira</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-xs font-black uppercase tracking-widest text-secondary">
            <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre o Projeto</a>
            <a href="#autor" className="hover:text-primary transition-colors">Desenvolvedor</a>
          </div>
          <Link href="/login" className="px-6 py-2.5 bg-foreground text-background rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-xl shadow-foreground/5 active:scale-95">
            Acessar Sistema
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
              🚀 Transformando a Educação Pública • 2026
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
              Segurança e <br /> 
              <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent italic">Controle Digital</span>
            </h1>
            <p className="text-lg sm:text-xl text-secondary font-medium leading-relaxed max-w-xl">
              O <span className="text-foreground font-bold">PortãoEdu</span> automatiza a portaria da <span className="text-primary font-bold italic">E.E. Nancy de Oliveira Fidalgo</span>, unindo tecnologia de ponta com a necessidade escolar de controle de fluxo em tempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => router.push('/login')} 
                className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:scale-105 transition-all active:scale-95 flex items-center justify-center group"
              >
                ENTRAR NO PORTAL
              </button>
              <a 
                href="#sobre" 
                className="px-10 py-5 bg-card border border-border text-secondary rounded-[2rem] font-black text-lg hover:bg-background hover:text-foreground transition-all flex items-center justify-center shadow-sm"
              >
                VER MAIS
              </a>
            </div>
            
            <div className="flex items-center space-x-6 pt-8 border-t border-border/50">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-border flex items-center justify-center text-[10px] font-black">
                    {i === 4 ? '+500' : '🎓'}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                Monitorando +400 alunos diariamente
              </p>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-primary rounded-full blur-[100px] opacity-10"></div>
            <div className="relative bg-card/40 backdrop-blur-3xl p-6 sm:p-10 rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden group">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-8 bg-primary rounded-[2rem] text-white shadow-xl shadow-primary/20 transform group-hover:-translate-y-2 transition-transform">
                  <p className="text-[10px] font-black uppercase opacity-70 mb-2">Monitoramento</p>
                  <p className="text-2xl font-black tracking-tighter italic">Live Flow</p>
                </div>
                <div className="p-8 bg-foreground rounded-[2rem] text-background shadow-xl transform group-hover:translate-y-2 transition-transform">
                  <p className="text-[10px] font-black uppercase opacity-70 mb-2">Validação</p>
                  <p className="text-2xl font-black tracking-tighter italic">QR-ID</p>
                </div>
                <div className="col-span-2 p-8 sm:p-10 bg-background/80 border border-border rounded-[2rem] space-y-6">
                  <div className="flex justify-between items-center border-b border-border pb-4">
                    <p className="font-black text-foreground uppercase text-[10px] tracking-widest">Relatório de Frequência</p>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase">Sincronizado</span>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden"><div className="w-3/4 h-full bg-primary rounded-full"></div></div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden"><div className="w-1/2 h-full bg-indigo-400 rounded-full"></div></div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden"><div className="w-4/5 h-full bg-emerald-400 rounded-full"></div></div>
                  </div>
                  <p className="text-xs text-secondary font-medium text-left leading-relaxed">
                    Interface otimizada para a gestão escolar visualizar entradas e saídas instantaneamente, com geração de comprovantes em PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="funcionalidades" className="py-24 bg-card border-y border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-4 mb-20">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground uppercase italic">Ecossistema Escolar</h2>
            <p className="text-secondary font-medium">Três pilares fundamentais para uma gestão moderna e eficiente na portaria.</p>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Para a Gestão', desc: 'Carlos e Ivone têm controle total sobre quem entra, com alertas sonoros e visuais em tempo real.', icon: '🏢' },
              { title: 'Para o Aluno', desc: 'Acesso rápido via QR Code dinâmico, garantindo agilidade e comprovante digital automático.', icon: '📱' },
              { title: 'Para os Pais', desc: 'Segurança de saber que a escola possui um registro digital rigoroso de todos os fluxos.', icon: '👨‍👩‍👧' }
            ].map((feature, i) => (
              <div key={i} className="p-10 bg-background rounded-[2.5rem] border border-border hover:shadow-2xl hover:border-primary/20 transition-all group">
                <div className="text-5xl mb-8 group-hover:scale-125 group-hover:rotate-12 transition-transform inline-block">{feature.icon}</div>
                <h3 className="text-2xl font-black text-foreground mb-4 italic uppercase tracking-tighter">{feature.title}</h3>
                <p className="text-secondary font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="py-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="bg-foreground text-background rounded-[4rem] p-8 sm:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 text-9xl font-black text-white/5 pointer-events-none italic">IMPACTO</div>
            <div className="relative z-10 max-w-3xl space-y-8">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none italic uppercase">Educação + Tecnologia = Futuro</h2>
              <p className="text-lg sm:text-xl text-white/70 font-medium leading-relaxed">
                Este projeto nasceu da necessidade de modernizar os processos manuais da escola pública. O <span className="text-primary font-bold">PortãoEdu</span> não é apenas um software, é uma ferramenta de transformação social que otimiza o tempo pedagógico.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-10">
                <div><p className="text-3xl font-black text-primary">100%</p><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Digital</p></div>
                <div><p className="text-3xl font-black text-indigo-400">Zero</p><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Papel</p></div>
                <div><p className="text-3xl font-black text-emerald-400">Real</p><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Time</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="autor" className="py-24 px-4 sm:px-6 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary to-indigo-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-40 h-40 rounded-full border-8 border-card shadow-2xl overflow-hidden relative transition-all duration-700 hover:scale-105 bg-border">
               <img src="https://github.com/renan-b-eth.png" alt="Renan Bezerra" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full border-4 border-card flex items-center justify-center text-white text-xl">✓</div>
          </div>
          
          <div className="space-y-6">
            <p className="text-primary font-black uppercase tracking-[0.5em] text-xs">Desenvolvido por</p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground italic uppercase">Renan Bezerra</h2>
            <p className="text-secondary font-medium max-w-2xl mx-auto leading-relaxed text-lg sm:text-xl">
              Engenheiro de Software Full-Stack, Educador e Visionário Digital. <br />
              Dedicado a construir soluções que elevam o padrão da educação pública através da engenharia de software de alta performance.
            </p>
            <div className="flex justify-center space-x-4 pt-6">
              <a href="https://site-renanbezerra.vercel.app/" target="_blank" className="px-8 py-3 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Portfolio</a>
              <a href="https://github.com/renan-b-eth" target="_blank" className="px-8 py-3 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">GitHub</a>
            </div>
          </div>
          
          <div className="pt-20 border-t border-border w-full flex flex-col md:flex-row justify-between items-center gap-6 text-secondary text-[10px] font-black uppercase tracking-[0.3em]">
            <div>PortãoEdu © 2026 • Todos os direitos reservados</div>
            <div className="flex space-x-6">
              <span>E.E. Nancy de Oliveira Fidalgo</span>
              <span className="text-primary">Mogi das Cruzes - SP</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
