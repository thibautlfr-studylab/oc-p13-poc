import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  await prisma.user.upsert({
    where: { email: 'client@ycyw.com' },
    update: {},
    create: {
      email: 'client@ycyw.com',
      passwordHash: hash,
      firstName: 'Alice',
      lastName: 'Client',
      role: 'client',
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent@ycyw.com' },
    update: {},
    create: {
      email: 'agent@ycyw.com',
      passwordHash: hash,
      firstName: 'Bob',
      lastName: 'Agent',
      role: 'agent',
    },
  });

  console.log('Seed terminé : client@ycyw.com / agent@ycyw.com (password: password123)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
