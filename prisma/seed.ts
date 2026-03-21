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
      update: {},
      create: adminData,
    })
  }
  console.log('✅ Administradores cadastrados.')

  // 2. Seed de Alunos
  const studentsFilePath = path.join(__dirname, '../src/data/students.json')
  const studentsData = JSON.parse(fs.readFileSync(studentsFilePath, 'utf-8'))

  for (const s of studentsData) {
    // Normaliza RA e RG (apenas números)
    const normalizedRa = s.ra.replace(/\D/g, '')
    const normalizedRg = s.rg.replace(/\D/g, '')

    // Se após normalizar o RA estiver vazio (casos como 'N26001'), mantenha o original mas avise
    // Ou no caso de produção, deveríamos ter RAs válidos
    const finalRa = normalizedRa || s.ra
    const finalRg = normalizedRg || s.rg

    await prisma.aluno.upsert({
      where: { ra: finalRa },
      update: {
        nome: s.nome,
        rg: finalRg,
        turma: s.turma,
        liberado_segunda_aula: s.liberadoSegundaAula ?? true
      },
      create: {
        nome: s.nome,
        rg: finalRg,
        ra: finalRa,
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
