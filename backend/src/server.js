import { createApp } from './app.js';
import { config } from './utils/config.js';
import { prisma } from './utils/prisma.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`QA Builder API → http://localhost:${config.port}/api`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
