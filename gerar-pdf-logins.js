const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');

const alunos = [
  { nome: "DAVI DE MATOS FONSECA", ra: "000111738164-X", turma: "2ª A" },
  { nome: "GUSTAVO VIEIRA DA SILVA", ra: "000112274129-7", turma: "2ª B" },
  { nome: "JOAO VICTOR PEREIRA RODRIGUES", ra: "000113380121-3", turma: "2ª B" },
  { nome: "KERRISON LIMA RIBEIRO", ra: "000113183044-1", turma: "2ª B" },
  { nome: "ALANA GAMA DE ARAUJO", ra: "000112164941-5", turma: "2ª D" },
  { nome: "GUILHERME BIZARRIAS DE SOUZA", ra: "000114183041-3", turma: "2ª D" },
  { nome: "ISABELLY DA SILVA BESSA", ra: "000111732839-9", turma: "2ª D" },
  { nome: "ISABELLY RODRIGUES GOES", ra: "000114071847-2", turma: "2ª D" },
  { nome: "DAVID LOPES RODRIGUES COSTA", ra: "000110391065-6", turma: "2ª E" },
  { nome: "EMANUELLY MARQUES BATISTA", ra: "000114079075-4", turma: "2ª E" },
  { nome: "JEFFERSON BORGES BELMIRO DOS SANTOS", ra: "000110414712-9", turma: "2ª E" },
  { nome: "JONATHAN LIMA DE JESUS", ra: "000111878938-6", turma: "2ª E" },
  { nome: "RAFAELLA VITORIA RIOS ALVES", ra: "000124489097-2", turma: "2ª E" },
  { nome: "ANA CAROLINA DA SILVA DIAS", ra: "000110385221-8", turma: "3ª B" },
  { nome: "ANNY RAIANY MARCELINO DA SILVA", ra: "000112550639-8", turma: "3ª B" },
  { nome: "GUSTAVO HENRIQUE DOS SANTOS DE JESUS", ra: "000111878084-X", turma: "3ª B" },
  { nome: "RENAN ARTHUR INNOCENCIO DE MORAES", ra: "000110403329-X", turma: "3ª B" },
  { nome: "GUILHERME PAIN DE SOUZA", ra: "000112183892-3", turma: "3ª B" },
  { nome: "GEOVANNA DOS SANTOS SILVA", ra: "000111844942-3", turma: "3ª B" },
  { nome: "MARIA LUISA DA SILVA XAVIER", ra: "000113892805-7", turma: "3ª B" },
  { nome: "MARCELO WENDER MIRANDA RODRIGUES COSTA", ra: "000113097182-X", turma: "3ª C" },
  { nome: "KETHELLYN DOS SANTOS CAJANO", ra: "000112360623-7", turma: "3ª C" },
  { nome: "KAUE DAS NEVES SOUSA DA SILVA", ra: "000110358351-7", turma: "3ª C" },
  { nome: "JOSE HENRIQUE FERREIRA PEREIRA DA SILVA", ra: "000110413405-6", turma: "3ª C" },
  { nome: "RENAN SILVA SOUZA", ra: "000111838874-4", turma: "3ª D" },
  { nome: "JOANNA AZEVEDO DOS SANTOS", ra: "000110379588-0", turma: "3ª D" },
  { nome: "RAYSSA RAKELLY RODRIGUES PORTAS", ra: "000111836580-X", turma: "3ª D" },
  { nome: "GLORIA STEPHANY PEREIRA DA SILVA", ra: "000111844999-X", turma: "3ª D" },
  { nome: "JULIA DE LIMA PINHEIRO", ra: "000113269559-4", turma: "3ª D" },
  { nome: "LUCAS VINICIUS DA SILVA SOUZA", ra: "000112793347-4", turma: "3ª E" },
  { nome: "RUAN ALDO FERREIRA DO AMARAL", ra: "000111878754-7", turma: "3ª E" },
  { nome: "DOUGLAS FREIRE DE MELO", ra: "000113493367-8", turma: "3ª E" },
  { nome: "MARCELLA DELAMARE VIEIRA GARCIA", ra: "000112884576-3", turma: "3ª E" },
  { nome: "BEATRYZ GONCALVES DA SILVA BRUM", ra: "000112606661-8", turma: "3ª E" },
  { nome: "GABRIELE DA SILVA SANTOS", ra: "000111836491-0", turma: "3ª E" },
  { nome: "MARIA LUIZA DE JESUS PEREIRA", ra: "0001093658058", turma: "3ª E" },
  { nome: "HELOISA HELENA SOUSA DE LIMA", ra: "0001124907403", turma: "3ª E" },
  { nome: "JULIA ALVES LINHARES", ra: "0001132689028", turma: "3ª B" },
  { nome: "GUSTAVO DANIEL PACHECO", ra: "0001103290241", turma: "3ª B" }
];

const admins = [
  { nome: "Carlos", email: "carlos@adm.com", senha: "carlos123" },
  { nome: "Ivone", email: "ivone@adm.com", senha: "ivone123" }
];

const doc = new jsPDF();

// Cabeçalho
 doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
doc.text('E.E. NANCY DE OLIVEIRA FIDALGO', 105, 20, { align: 'center' });

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.text('Secretaria de Educação do Estado de São Paulo', 105, 28, { align: 'center' });
doc.line(20, 32, 190, 32);

// Título
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('LISTA COMPLETA - ALUNOS E ADMINISTRADORES', 105, 45, { align: 'center' });

// Aviso importante
doc.setFontSize(10);
doc.setTextColor(255, 0, 0);
doc.setFont('helvetica', 'bold');
doc.text('⚠️  LOGIN E SENHA SÃO IGUAIS AO RA (com os ZEROS no início)', 105, 55, { align: 'center' });
doc.setTextColor(0, 0, 0);

// Seção de Administradores
doc.setFontSize(13);
doc.setFont('helvetica', 'bold');
doc.setTextColor(0, 51, 102);
doc.text('ADMINISTRADORES DO SISTEMA', 20, 70);
doc.setTextColor(0, 0, 0);

const adminData = admins.map(a => [a.nome, a.email, a.senha, 'ADM']);

autoTable(doc, {
  startY: 75,
  head: [['Nome', 'Email (Login)', 'Senha', 'Perfil']],
  body: adminData,
  theme: 'grid',
  headStyles: { fillColor: [0, 51, 102] },
  styles: { fontSize: 9, cellPadding: 3 },
  columnStyles: {
    0: { cellWidth: 40 },
    1: { cellWidth: 60 },
    2: { cellWidth: 40 },
    3: { cellWidth: 30, halign: 'center' }
  }
});

// Seção de Alunos
let finalY = doc.lastAutoTable.finalY + 10;
doc.setFontSize(13);
doc.setFont('helvetica', 'bold');
doc.setTextColor(0, 51, 102);
doc.text(`ALUNOS (${alunos.length} total)`, 20, finalY);
doc.setTextColor(0, 0, 0);

const alunosOrdenados = [...alunos].sort((a, b) => {
  if (a.turma !== b.turma) return a.turma.localeCompare(b.turma);
  return a.nome.localeCompare(b.nome);
});

const alunoData = alunosOrdenados.map(a => [
  a.nome,
  a.turma,
  a.ra,
  a.ra
]);

autoTable(doc, {
  startY: finalY + 5,
  head: [['Nome do Aluno', 'Turma', 'Login (RA)', 'Senha (RA)']],
  body: alunoData,
  theme: 'grid',
  headStyles: { fillColor: [0, 102, 51] },
  styles: { fontSize: 8, cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 80 },
    1: { cellWidth: 20, halign: 'center' },
    2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
    3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
  },
  alternateRowStyles: { fillColor: [245, 245, 245] }
});

// Rodapé
finalY = doc.lastAutoTable.finalY + 10;
doc.setFontSize(9);
doc.setTextColor(255, 0, 0);
doc.setFont('helvetica', 'bold');
doc.text('IMPORTANTE: Sempre digite os ZEROS no início do RA ao fazer login!', 105, finalY, { align: 'center' });

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.text(`Documento gerado em: ${new Date().toLocaleDateString('pt-BR')} - PortãoEdu Sistema de Controle`, 105, finalY + 10, { align: 'center' });
doc.text('Este documento é de uso interno da secretaria escolar.', 105, finalY + 15, { align: 'center' });

// Rendey Class no rodapé
doc.setFontSize(7);
doc.setTextColor(100, 100, 100);
doc.text('Sistema desenvolvido por Rendey Class - www.rendey.app', 105, 290, { align: 'center' });

doc.save('LISTA_COMPLETA_ALUNOS_E_ADM.pdf');
console.log('✅ PDF gerado com sucesso: LISTA_COMPLETA_ALUNOS_E_ADM.pdf');
