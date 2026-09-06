import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 STAS-RG Recruitment API server running on port ${PORT} in ${env.NODE_ENV} mode`);
  console.log(`📡 Healthcheck available at: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
