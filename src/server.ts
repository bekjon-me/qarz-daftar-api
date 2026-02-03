import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

async function main() {
  await prisma.$connect();
  console.log('Database connected');

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
