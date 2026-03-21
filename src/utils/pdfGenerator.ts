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
}

// 1. Gera o Comprovante Individual (para o aluno levar)
export const gerarPDFAssinatura = (data: PDFData) => {
  const doc = new jsPDF();

  // Cabeçalho da Escola
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Controle de Acesso PortãoEdu', 105, 28, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Título do Documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE ENTRADA / SAÍDA', 105, 45, { align: 'center' });

  // Informações do Aluno
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome do Aluno: ${data.nome}`, 20, 60);
  doc.text(`RA: ${data.ra}`, 20, 70);
  doc.text(`Turma: ${data.turma}`, 20, 80);
  doc.text(`Data: ${data.data}`, 20, 90);
  doc.text(`Horário de Registro: ${data.horario}`, 20, 100);
  doc.text(`Aula Referente: ${data.aulaNumero}ª Aula`, 20, 110);

  // Espaço para Assinatura (Requisito Obrigatório)
  doc.line(60, 150, 150, 150);
  doc.setFontSize(10);
  doc.text('Assinatura do Responsável / Gestão Escolar', 105, 155, { align: 'center' });

  doc.save(`Comprovante_${data.ra}_${data.data}.pdf`);
};

// 2. Gera o Relatório Geral (Histórico para a Gestão)
export const gerarRelatorioGeral = (entradas: any[], dataFiltro: string) => {
  const doc = new jsPDF();

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`RELATÓRIO GERAL DE ACESSOS - ${dataFiltro}`, 105, 30, { align: 'center' });

  // Tabela de Dados
  const tableData = entradas.map(e => [
    e.nome_aluno,
    e.ra_aluno,
    e.turma_aluno,
    e.horario,
    `${e.aula_numero}ª`,
    e.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Aluno', 'RA', 'Turma', 'Horário', 'Aula', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] }, // Azul Escuro (PortãoEdu)
  });

  // Rodapé com Assinatura em todas as páginas se necessário, mas aqui faremos no fim
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  
  if (finalY < 250) {
    doc.line(60, finalY, 150, finalY);
    doc.text('Assinatura da Direção / Gestão Nancy', 105, finalY + 5, { align: 'center' });
  }

  doc.save(`Relatorio_Acessos_${dataFiltro}.pdf`);
};
