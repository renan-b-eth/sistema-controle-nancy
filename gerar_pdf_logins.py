#!/usr/bin/env python3
"""
Gerador de PDF - Lista de Logins PortãoEdu
E.E. Nancy de Oliveira Fidalgo
"""

from fpdf import FPDF
from datetime import datetime

class PDF(FPDF):
    def header(self):
        # Logo/Header
        self.set_font('Arial', 'B', 16)
        self.set_text_color(59, 130, 246)  # Azul primary
        self.cell(0, 10, 'PORTÃOEDU - SISTEMA DE CONTROLE DE ENTRADA', 0, 1, 'C')
        self.set_font('Arial', '', 12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'E.E. Nancy de Oliveira Fidalgo', 0, 1, 'C')
        self.ln(5)
        
        # Linha separadora
        self.set_draw_color(59, 130, 246)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Página {self.page_no()} | Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 0, 'C')

def gerar_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Título
    pdf.set_font('Arial', 'B', 18)
    pdf.set_text_color(31, 41, 55)
    pdf.cell(0, 12, 'LISTA DE ACESSO - LOGINS E SENHAS', 0, 1, 'C')
    pdf.ln(8)
    
    # Seção ADMINISTRAÇÃO
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(59, 130, 246)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  ADMINISTRAÇÃO (ACESSO CARLOS / IVONE)', 0, 1, 'L', fill=True)
    pdf.ln(5)
    
    pdf.set_font('Arial', '', 11)
    pdf.set_text_color(0, 0, 0)
    
    # Tabela Admin
    pdf.set_fill_color(243, 244, 246)
    pdf.cell(60, 10, 'Nome', 1, 0, 'C', fill=True)
    pdf.cell(80, 10, 'Login', 1, 0, 'C', fill=True)
    pdf.cell(50, 10, 'Senha', 1, 1, 'C', fill=True)
    
    pdf.cell(60, 10, 'Carlos', 1, 0, 'L')
    pdf.cell(80, 10, 'carlos@adm.com', 1, 0, 'L')
    pdf.cell(50, 10, 'carlos123', 1, 1, 'L')
    
    pdf.cell(60, 10, 'Ivone', 1, 0, 'L')
    pdf.cell(80, 10, 'ivone@adm.com', 1, 0, 'L')
    pdf.cell(50, 10, 'ivone123', 1, 1, 'L')
    
    pdf.ln(10)
    
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(16, 185, 129)  # Verde
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  ALUNOS - 2º ANO (LOGIN/SENHA É O RG)', 0, 1, 'L', fill=True)
    pdf.ln(5)
    
    # Cabeçalho da tabela
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(243, 244, 246)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(90, 10, 'Nome do Aluno', 1, 0, 'C', fill=True)
    pdf.cell(60, 10, 'Login/Senha (RG)', 1, 0, 'C', fill=True)
    pdf.cell(40, 10, 'Turma', 1, 1, 'C', fill=True)
    
    # Dados dos alunos - 2º ANO
    pdf.set_font('Arial', '', 10)
    
    alunos_2ano = [
        ('DAVI DE MATOS FONSECA', '000111738164-X', '2ª A'),
        ('GUSTAVO VIEIRA DA SILVA', '000112274129-7', '2ª B'),
        ('JOAO VICTOR PEREIRA RODRIGUES', '000113380121-3', '2ª B'),
        ('KERRISON LIMA RIBEIRO', '000113183044-1', '2ª B'),
        ('ALANA GAMA DE ARAUJO', '000112164941-5', '2ª D'),
        ('GUILHERME BIZARRIAS DE SOUZA', '000114183041-3', '2ª D'),
        ('ISABELLY DA SILVA BESSA', '000111732839-9', '2ª D'),
        ('ISABELLY RODRIGUES GOES', '000114071847-2', '2ª D'),
        ('DAVID LOPES RODRIGUES COSTA', '000110391065-6', '2ª E'),
        ('EMANUELLY MARQUES BATISTA', '000114079075-4', '2ª E'),
        ('JEFFERSON BORGES BELMIRO', '000110414712-9', '2ª E'),
        ('JONATHAN LIMA DE JESUS', '000111878938-6', '2ª E'),
        ('RAFAELLA VITORIA RIOS ALVES', '000124489097-2', '2ª E'),
    ]
    
    fill = False
    for nome, rg, turma in alunos_2ano:
        if fill:
            pdf.set_fill_color(249, 250, 251)
        else:
            pdf.set_fill_color(255, 255, 255)
        
        pdf.cell(90, 8, nome, 1, 0, 'L', fill=fill)
        pdf.cell(60, 8, rg, 1, 0, 'C', fill=fill)
        pdf.cell(40, 8, turma, 1, 1, 'C', fill=fill)
        fill = not fill
    
    pdf.ln(5)
    
    # Seção 3º ANO - Nova página se necessário
    if pdf.get_y() > 200:
        pdf.add_page()
    
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(59, 130, 246)  # Azul
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  ALUNOS - 3º ANO (LOGIN/SENHA É O RG)', 0, 1, 'L', fill=True)
    pdf.ln(5)
    
    # Cabeçalho
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(243, 244, 246)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(90, 10, 'Nome do Aluno', 1, 0, 'C', fill=True)
    pdf.cell(60, 10, 'Login/Senha (RG)', 1, 0, 'C', fill=True)
    pdf.cell(40, 10, 'Turma', 1, 1, 'C', fill=True)
    
    # Dados 3º ANO
    pdf.set_font('Arial', '', 10)
    
    alunos_3ano = [
        ('ANA CAROLINA DA SILVA DIAS', '000110385221-8', '3ª B'),
        ('ANNY RAIANY MARCELINO DA SILVA', '000112550639-8', '3ª B'),
        ('GUSTAVO HENRIQUE DOS SANTOS', '000111878084-X', '3ª B'),
        ('RENAN ARTHUR INNOCENCIO', '000110403329-X', '3ª B'),
        ('GUILHERME PAIN DE SOUZA', '000112183892-3', '3ª B'),
        ('GEOVANNA DOS SANTOS SILVA', '000111844942-3', '3ª B'),
        ('MARIA LUISA DA SILVA XAVIER', '000113892805-7', '3ª B'),
        ('MARCELO WENDER MIRANDA', '000113097182-X', '3ª C'),
        ('KETHELLYN DOS SANTOS CAJANO', '000112360623-7', '3ª C'),
        ('KAUE DAS NEVES SOUSA DA SILVA', '000110358351-7', '3ª C'),
        ('JOSE HENRIQUE FERREIRA', '000110413405-6', '3ª C'),
        ('RENAN SILVA SOUZA', '000111838874-4', '3ª D'),
        ('JOANNA AZEVEDO DOS SANTOS', '000110379588-0', '3ª D'),
        ('RAYSSA RAKELLY RODRIGUES', '000111836580-X', '3ª D'),
        ('GLORIA STEPHANY PEREIRA', '000111844999-X', '3ª D'),
        ('JULIA DE LIMA PINHEIRO', '000113269559-4', '3ª D'),
        ('LUCAS VINICIUS DA SILVA', '000112793347-4', '3ª E'),
        ('RUAN ALDO FERREIRA DO AMARAL', '000111878754-7', '3ª E'),
        ('DOUGLAS FREIRE DE MELO', '000113493367-8', '3ª E'),
        ('MARCELLA DELAMARE VIEIRA', '000112884576-3', '3ª E'),
        ('BEATRYZ GONCALVES DA SILVA', '000112606661-8', '3ª E'),
        ('GABRIELE DA SILVA SANTOS', '000111836491-0', '3ª E'),
    ]
    
    for nome, rg, turma in alunos_3ano:
        if fill:
            pdf.set_fill_color(249, 250, 251)
        else:
            pdf.set_fill_color(255, 255, 255)
        
        pdf.cell(90, 8, nome, 1, 0, 'L', fill=fill)
        pdf.cell(60, 8, rg, 1, 0, 'C', fill=fill)
        pdf.cell(40, 8, turma, 1, 1, 'C', fill=fill)
        fill = not fill
    
    pdf.ln(10)
    
    # Regras de Acesso
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(239, 68, 68)  # Vermelho
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  REGRAS DE ACESSO (Turno Noturno 19h-22:45h)', 0, 1, 'L', fill=True)
    pdf.ln(5)
    
    pdf.set_font('Arial', '', 11)
    pdf.set_text_color(0, 0, 0)
    
    regras = [
        ('1ª Aula (19:00 - 19:45):', 'Entrada Liberada para todos.'),
        ('2ª Aula (19:45 - 20:30):', 'Entrada SOMENTE para alunos autorizados (lista acima).'),
        ('3ª a 5ª Aula:', 'Entrada BLOQUEADA. Aluno deve ir para a DIREÇÃO/SECRETARIA.'),
    ]
    
    for aula, regra in regras:
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(60, 8, aula, 0, 0, 'L')
        pdf.set_font('Arial', '', 11)
        pdf.cell(0, 8, regra, 0, 1, 'L')
        pdf.ln(2)
    
    pdf.ln(5)
    
    # Nota no rodapé da página
    pdf.set_font('Arial', 'I', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 6, 'Nota: Geração de PDF de assinatura automática no login (para 1ª e 2ª aula).', 0, 'C')
    
    # Salvar
    output_path = r'C:\Users\RenanBezerraDosSanto\Desktop\sistema-controle-nancy\LISTA_LOGINS_PORTAOEDU.pdf'
    pdf.output(output_path)
    print(f'✅ PDF gerado com sucesso!')
    print(f'📄 Local: {output_path}')
    return output_path

if __name__ == '__main__':
    gerar_pdf()
