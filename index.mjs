import app from './app.mjs';
import { startServer } from './server.mjs';
import getLogger from './lib/logger.mjs';

const logger = getLogger('index');

startServer(app);

process.on('unhandledRejection', error => {
  logger.error('unhandledRejection');
  logger.error(error);
});
