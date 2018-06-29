import app from './app.mjs';
import { startServer } from './server.mjs';

startServer(app);

process.on('unhandledRejection', error => {
  logger.error('unhandledRejection');
  logger.error(error);
});
