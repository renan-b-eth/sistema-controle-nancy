import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Seed...')

  // 1. Seed de Administradores
  const admins = [
    { nome: 'Carlos', email: 'carlos@adm.com', senha: 'carlos123' },
    { nome: 'Ivone', email: 'ivone@adm.com', senha: 'ivone123' },
  ]

  for (const adminData of admins) {
    await prisma.admin.upsert({
      where: { email: adminData.email },
      update: { senha: adminData.senha },
      create: adminData,
    })
  }
  console.log('✅ Administradores cadastrados.')

  // 2. Seed de Alunos
  const studentsFilePath = path.join(__dirname, '../src/data/students.json')
  const studentsData = JSON.parse(fs.readFileSync(studentsFilePath, 'utf-8'))

  for (const s of studentsData) {
    // Agora não normalizamos o RG/RA para números apenas, 
    // pois a lista oficial contém caracteres como hífens e letras.
    // O login será o valor exato presente no JSON/Lista.
    
    await prisma.aluno.upsert({
      where: { ra: s.ra },
      update: {
        nome: s.nome,
        rg: s.rg,
        turma: s.turma,
        liberado_segunda_aula: s.liberadoSegundaAula ?? true
      },
      create: {
        nome: s.nome,
        rg: s.rg,
        ra: s.ra,
        turma: s.turma,
        liberado_segunda_aula: s.liberadoSegundaAula ?? true
      },
    })
  }

  console.log(`✅ ${studentsData.length} alunos cadastrados/atualizados.`)
  console.log('✨ Seed finalizado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
