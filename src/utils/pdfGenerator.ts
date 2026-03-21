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
