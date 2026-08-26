/**
 * Seeds a ready-to-use demo account so reviewers can log in immediately.
 *
 *   email:    demo@moveo.dev
 *   password: Demo1234!
 *
 * Idempotent: safe to run repeatedly.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@moveo.dev';
const DEMO_PASSWORD = 'Demo1234!';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      name: 'Demo Investor',
      passwordHash,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      assets: JSON.stringify(['BTC', 'ETH', 'SOL']),
      archetype: 'HODLER',
      contentTypes: JSON.stringify(['MARKET_NEWS', 'CHARTS', 'FUN_MEMES']),
      goal: 'Build a long-term core position without watching charts all day.',
      completedAt: new Date(),
    },
  });

  console.log(`Seeded demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
