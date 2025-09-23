import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_USER_EMAIL || 'alejo@cannashieldct.com'
  const password = process.env.SEED_USER_PASSWORD || 'AeroAttyValley2025'
  const firstName = process.env.SEED_USER_FIRST_NAME || 'Alejo'
  const lastName = process.env.SEED_USER_LAST_NAME || null

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, firstName, lastName },
    create: { email, password: hashed, firstName, lastName },
  })

  console.log('Seeded user:', { id: user.id, email: user.email })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

