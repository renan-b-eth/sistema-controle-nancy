'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Solicitacao {
  id: string;
  nome: string;
  ra: string;
  data: string;
  horario: string;
  motivo: string;
  status: 'pendente' | 'liberado' | 'negado';
}

interface Aluno {
  ra: string;
  nome: string;
  turma: string;
}

const ALUNOS_MOCK: Aluno[] = [
  { ra: '2024001', nome: 'Aluno Exemplo', turma: '3º Ano A' },
  { ra: '2024002', nome: 'Maria Silva', turma: '2º Ano B' },
  { ra: '2024003', nome: 'João Souza', turma: '1º Ano C' },
];

export default function AdmDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'historico' | 'alunos'>('pendentes');
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [filtroData, setFiltroData] = useState('');
  
  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAluno, setScannedAluno] = useState<Aluno | null>(null);
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.profile !== 'ADM') {
        router.push('/login');
      } else {
        setUser(parsedUser);
        carregarSolicitacoes();
      }
    }
  }, [router]);

  // Clean up scanner on unmount or when scanner is closed
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const carregarSolicitacoes = () => {
    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    setSolicitacoes(todas);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const atualizarStatus = (id: string, novoStatus: 'liberado' | 'negado') => {
    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    const novas = todas.map((s: Solicitacao) => s.id === id ? { ...s, status: novoStatus } : s);
    localStorage.setItem('portaoEdu_solicitacoes', JSON.stringify(novas));
    setSolicitacoes(novas);
  };

  const getAtrasosCount = (ra: string) => {
    return solicitacoes.filter(s => s.ra === ra && s.status === 'liberado').length;
  };

  const generatePDF = (s: Solicitacao) => {
    const doc = new jsPDF();
    const aluno = ALUNOS_MOCK.find(a => a.ra === s.ra);
    
    // Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // Blue-700
    doc.text('PortãoEdu - Comprovante de Entrada', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    // Logo Placeholder
    doc.setDrawColor(200);
    doc.rect(10, 10, 20, 20);
    doc.text('LOGO', 14, 22);

    // Dados do Aluno e Ocorrência
    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Informação']],
      body: [
        ['Nome Completo', s.nome],
        ['RA', s.ra],
        ['Turma', aluno?.turma || 'N/A'],
        ['Data da Ocorrência', s.data],
        ['Horário de Chegada', s.horario],
        ['Motivo do Atraso', s.motivo],
        ['Status', s.status.toUpperCase()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Assinaturas
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    doc.line(20, finalY + 40, 90, finalY + 40);
    doc.text('Assinatura do Responsável', 55, finalY + 45, { align: 'center' });
    
    doc.line(120, finalY + 40, 190, finalY + 40);
    doc.text('Assinatura do Administrador', 155, finalY + 45, { align: 'center' });
    doc.text(user.name, 155, finalY + 50, { align: 'center' });

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Documento gerado automaticamente pelo PortãoEdu', 105, 285, { align: 'center' });

    doc.save(`comprovante_${s.ra}_${s.id}.pdf`);
  };

  const startScanner = () => {
    setScannedAluno(null);
    setScannerError('');
    setShowScanner(true);
    
    // Delay slightly to ensure div is rendered
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        // Formato esperado: RA-timestamp
        const ra = decodedText.split('-')[0];
        const aluno = ALUNOS_MOCK.find(a => a.ra === ra);
        
        if (aluno) {
          setScannedAluno(aluno);
          setScannerError('');
          scanner.clear();
          setShowScanner(false);
        } else {
          setScannerError('Aluno não cadastrado');
        }
      }, (error) => {
        // Ignore constant scan errors
      });
      
      scannerRef.current = scanner;
    }, 100);
  };

  const registrarEntradaQR = () => {
    if (!scannedAluno) return;

    const novaSolicitacao: Solicitacao = {
      id: Math.random().toString(36).substr(2, 9),
      nome: scannedAluno.nome,
      ra: scannedAluno.ra,
      data: new Date().toLocaleDateString(),
      horario: new Date().toLocaleTimeString(),
      motivo: 'Entrada via QR Code (Leitura Presencial)',
      status: 'liberado'
    };

    const todas = JSON.parse(localStorage.getItem('portaoEdu_solicitacoes') || '[]');
    localStorage.setItem('portaoEdu_solicitacoes', JSON.stringify([...todas, novaSolicitacao]));
    
    setSolicitacoes([...todas, novaSolicitacao]);
    setScannedAluno(null);
    alert('Entrada registrada com sucesso!');
  };

  const solicitacoesExibidas = activeTab === 'historico' && filtroData
    ? solicitacoes.filter(s => s.data === new Date(filtroData + 'T00:00:00').toLocaleDateString())
    : solicitacoes;

  if (!user) return <p className="p-8 text-center">Carregando...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-green-700">PortãoEdu - ADM</h1>
          <div className="flex space-x-4">
             <button 
              onClick={startScanner}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
            >
              <span className="mr-2">📷</span> Escanear QR
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
              Sair
            </button>
          </div>
        </div>

        {/* Modal Scanner */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Leitor de QR Code</h2>
                <button onClick={() => { scannerRef.current?.clear(); setShowScanner(false); }} className="text-gray-500">X</button>
              </div>
              <div id="reader" className="w-full"></div>
              {scannerError && <p className="mt-4 text-red-500 font-bold text-center">{scannerError}</p>}
            </div>
          </div>
        )}

        {/* Modal Resultado Scan */}
        {scannedAluno && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-white p-6 rounded-lg max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-green-700 mb-4">Aluno Identificado</h2>
              <div className="space-y-2 mb-6">
                <p><strong>Nome:</strong> {scannedAluno.nome}</p>
                <p><strong>RA:</strong> {scannedAluno.ra}</p>
                <p><strong>Turma:</strong> {scannedAluno.turma}</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={registrarEntradaQR}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                >
                  Registrar Entrada
                </button>
                <button 
                  onClick={() => setScannedAluno(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex space-x-2 mb-6 bg-white p-1 rounded-lg shadow-sm border">
          {(['pendentes', 'historico', 'alunos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === tab ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab === 'pendentes' ? 'Solicitações Pendentes' : tab === 'historico' ? 'Histórico' : 'Alunos Cadastrados'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {activeTab === 'pendentes' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Aguardando Liberação</h2>
              <div className="space-y-4">
                {solicitacoes.filter(s => s.status === 'pendente').length === 0 ? (
                  <p className="text-gray-500 italic">Nenhuma solicitação pendente.</p>
                ) : (
                  solicitacoes.filter(s => s.status === 'pendente').map(s => (
                    <div key={s.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50">
                      <div>
                        <p className="font-bold text-lg">{s.nome} <span className="text-sm font-normal text-gray-500">(RA: {s.ra})</span></p>
                        <p className="text-sm text-gray-600">🕒 {s.horario} - 📅 {s.data}</p>
                        <p className="mt-2 text-gray-700"><span className="font-semibold">Motivo:</span> {s.motivo}</p>
                      </div>
                      <div className="flex space-x-2 mt-4 md:mt-0 w-full md:w-auto">
                        <button
                          onClick={() => atualizarStatus(s.id, 'liberado')}
                          className="flex-1 md:flex-none px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-bold"
                        >
                          Liberar entrada
                        </button>
                        <button
                          onClick={() => atualizarStatus(s.id, 'negado')}
                          className="flex-1 md:flex-none px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-bold"
                        >
                          Negar entrada
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Histórico de Entradas</h2>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Filtrar por data:</label>
                  <input
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className="border px-2 py-1 rounded text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
                      <th className="p-3 border-b">Nome / RA</th>
                      <th className="p-3 border-b">Data / Hora</th>
                      <th className="p-3 border-b">Motivo</th>
                      <th className="p-3 border-b text-center">Ações / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitacoesExibidas.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                    ) : (
                      solicitacoesExibidas.sort((a,b) => b.id.localeCompare(a.id)).map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition border-b">
                          <td className="p-3">
                            <p className="font-semibold">{s.nome}</p>
                            <p className="text-xs text-gray-500">{s.ra}</p>
                          </td>
                          <td className="p-3 text-sm">
                            <p>{s.data}</p>
                            <p className="text-gray-500">{s.horario}</p>
                          </td>
                          <td className="p-3 text-sm max-w-xs truncate" title={s.motivo}>{s.motivo}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center space-y-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                s.status === 'liberado' ? 'bg-green-100 text-green-700' : 
                                s.status === 'negado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {s.status.toUpperCase()}
                              </span>
                              {s.status === 'liberado' && (
                                <button 
                                  onClick={() => generatePDF(s)}
                                  className="text-[10px] text-blue-600 underline hover:text-blue-800"
                                >
                                  Baixar PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alunos' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Alunos Cadastrados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
                      <th className="p-3 border-b">RA</th>
                      <th className="p-3 border-b">Nome</th>
                      <th className="p-3 border-b">Turma</th>
                      <th className="p-3 border-b text-center">Total Atrasos (Liberados)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALUNOS_MOCK.map(aluno => (
                      <tr key={aluno.ra} className="hover:bg-gray-50 transition border-b">
                        <td className="p-3 font-mono text-sm">{aluno.ra}</td>
                        <td className="p-3 font-semibold">{aluno.nome}</td>
                        <td className="p-3 text-sm">{aluno.turma}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block w-8 h-8 rounded-full leading-8 font-bold ${
                            getAtrasosCount(aluno.ra) > 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {getAtrasosCount(aluno.ra)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
