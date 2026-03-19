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

export function gerarPDFAssinatura(data: PDFData) {
  const doc = new jsPDF();
  const protocol = `PE-${Date.now()}`;

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102);
  doc.text('ESCOLA ESTADUAL NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('CONTROLE DE ENTRADA E PERMANÊNCIA', 105, 30, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Informações do Aluno
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ALUNO:', 20, 45);
  
  doc.setFont('helvetica', 'normal');
  const dados = [
    ['Nome:', data.nome],
    ['RA:', data.ra],
    ['RG:', data.rg],
    ['Turma:', data.turma],
    ['Data:', data.data],
    ['Horário de Chegada:', data.horario],
    ['Aula Correspondente:', `${data.aulaNumero}ª Aula`]
  ];

  (doc as any).autoTable({
    startY: 50,
    head: [],
    body: dados,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
  });

  // Mensagem de Observação
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('O aluno acima identificado apresenta-se para entrada fora do horário regular.', 20, finalY);
  doc.text('Este documento deve ser assinado e arquivado pela secretaria.', 20, finalY + 5);

  // Área de Assinaturas
  const sigY = 120;
  
  doc.line(20, sigY, 95, sigY);
  doc.text('Assinatura do Aluno', 57.5, sigY + 5, { align: 'center' });

  doc.line(115, sigY, 190, sigY);
  doc.text('Secretaria / Direção', 152.5, sigY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('(Carlos / Ivone)', 152.5, sigY + 10, { align: 'center' });

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Protocolo Digital: ${protocol}`, 20, 285);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 190, 285, { align: 'right' });

  // Salvar o arquivo
  const fileName = `Entrada_${data.ra}_${data.data.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
