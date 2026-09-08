import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

async function main() {
  // Fail fast if the database is unreachable
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`\n🌾 KisanSetu AI backend running`);
    console.log(`   API   : http://localhost:${env.PORT}/api`);
    console.log(`   Docs  : http://localhost:${env.PORT}/api/docs`);
    console.log(`   CORS  : ${env.FRONTEND_URL}\n`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  await prisma.$disconnect();
  process.exit(1);
});
