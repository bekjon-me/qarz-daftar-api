import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { startScheduler } from './services/scheduler.service.js';

async function main() {
  await prisma.$connect();
  console.log('Database connected');

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Start the daily notification scheduler
  startScheduler();

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(() => {
      console.log('HTTP server closed');
    });

    await prisma.$disconnect();
    console.log('Database disconnected');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
