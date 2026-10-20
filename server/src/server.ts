import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🏨 Servidor de Inventarios iniciado en http://localhost:${env.PORT}`);
  logger.info(`⚙️  Entorno: ${env.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  logger.info('Recibido SIGTERM, cerrando servidor elegantemente...');
  server.close(() => {
    logger.info('Servidor cerrado.');
    process.exit(0);
  });
});
