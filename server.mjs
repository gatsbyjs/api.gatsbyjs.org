import dotenv from 'dotenv';
import app from './app.mjs';
import getLogger from './lib/logger.mjs';

const logger = getLogger('server');

dotenv.config();

const host = process.env.APP_HOST;
const port = process.env.APP_PORT;

app.listen(port, () => {
  logger.info(`started the server at http://%s:%d`, host, port);
});

process.on('unhandledRejection', error => {
  logger.error('unhandledRejection');
  logger.error(error);
});
