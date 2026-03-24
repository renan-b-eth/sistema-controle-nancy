import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFData {
  nome: string;
  ra: string;
  rg: string;
  turma: string;
  data: string;
  horario: string;
  aulaNumero: number;
  status?: string;
}

export const gerarPDFAssinatura = (data: PDFData) => {
  const doc = new jsPDF();
  const isDirecao = data.status === 'direcao';

  // Cabeçalho Oficial
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria de Educação do Estado de São Paulo', 105, 26, { align: 'center' });
  doc.line(20, 32, 190, 32);

  // Título do Documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titulo = isDirecao ? 'GUIA DE ENCAMINHAMENTO À DIREÇÃO' : 'COMPROVANTE DE ENTRADA TARDIA';
  doc.text(titulo, 105, 45, { align: 'center' });

  // Informações do Aluno
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ALUNO:', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.nome.toUpperCase()}`, 20, 68);
  doc.text(`RA: ${data.ra} | Turma: ${data.turma}`, 20, 76);
  doc.text(`Data: ${data.data} | Horário de Registro: ${data.horario}`, 20, 84);
  doc.text(`Aula Referente: ${data.aulaNumero}ª Aula`, 20, 92);

  if (isDirecao) {
    // Conteúdo para Direção
    doc.setDrawColor(200, 0, 0); // Vermelho
    doc.rect(20, 105, 170, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO DO ENCAMINHAMENTO:', 25, 115);
    doc.setFont('helvetica', 'normal');
    doc.text('O aluno acima identificado está sendo encaminhado à DIREÇÃO/SECRETARIA', 25, 125);
    doc.text('para regularização de acesso e/ou medidas disciplinares cabíveis.', 25, 132);
  } else {
    // Conteúdo para Entrada com Justificativa
    doc.setFont('helvetica', 'bold');
    doc.text('JUSTIFICATIVA DO ATRASO (Preenchimento Manual):', 20, 110);
    doc.setDrawColor(0);
    doc.line(20, 125, 190, 125); // Linhas para escrever
    doc.line(20, 135, 190, 135);
    doc.line(20, 145, 190, 145);
  }

  // Rodapé de Assinatura
  doc.line(60, 180, 150, 180);
  doc.setFontSize(9);
  doc.text('Assinatura do Aluno / Responsável', 105, 185, { align: 'center' });

  doc.line(60, 210, 150, 210);
  doc.text('Carimbo e Assinatura da Gestão Escolar', 105, 215, { align: 'center' });

  doc.save(`${isDirecao ? 'Guia_Direcao' : 'Comprovante'}_${data.ra}.pdf`);
};

export const gerarRelatorioGeral = (entradas: any[], dataFiltro: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`RELATÓRIO GERAL DE ACESSOS - ${dataFiltro}`, 105, 30, { align: 'center' });

  const tableData = entradas.map(e => [
    e.nome_aluno,
    e.turma_aluno,
    e.horario,
    `${e.aula_numero}ª`,
    e.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Aluno', 'Turma', 'Horário', 'Aula', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
  });

  doc.save(`Relatorio_${dataFiltro}.pdf`);
};

interface AlunoSecretaria {
  nome: string;
  ra: string;
  rg: string;
  turma: string;
}

export const gerarListaAlunosSecretaria = (alunos: AlunoSecretaria[]) => {
  const doc = new jsPDF();
  
  // Cabeçalho Oficial
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria de Educação do Estado de São Paulo', 105, 28, { align: 'center' });
  doc.line(20, 35, 190, 35);

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTA DE ALUNOS - LOGIN E SENHA', 105, 50, { align: 'center' });
  
  // Aviso importante
  doc.setFontSize(10);
  doc.setTextColor(255, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANTE: O login e a senha são IGUAIS ao RA (com os ZEROS no início)', 105, 60, { align: 'center' });
  doc.text('Exemplo: RA 0001093658058 → Login: 0001093658058 | Senha: 0001093658058', 105, 66, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de alunos: ${alunos.length}`, 20, 75);
  doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 150, 75);

  // Ordenar alunos por turma e nome
  const alunosOrdenados = [...alunos].sort((a, b) => {
    if (a.turma !== b.turma) return a.turma.localeCompare(b.turma);
    return a.nome.localeCompare(b.nome);
  });

  const tableData = alunosOrdenados.map(a => [
    a.nome,
    a.turma,
    a.ra,
    a.ra
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Nome do Aluno', 'Turma', 'Login (RA)', 'Senha (RA)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
    }
  });

  // Rodapé com aviso
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(8);
  doc.setTextColor(255, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('AVISO: Sempre digite os ZEROS no início do RA ao fazer login!', 105, finalY + 15, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento é de uso interno da secretaria escolar.', 105, finalY + 25, { align: 'center' });

  doc.save(`Lista_Alunos_Logins_${new Date().toISOString().split('T')[0]}.pdf`);
};
