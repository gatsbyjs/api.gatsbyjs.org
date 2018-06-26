import dotenv from 'dotenv';
import getLogger from './lib/logger.mjs';

const logger = getLogger('server');

dotenv.config();

const host = process.env.APP_HOST;
const port = process.env.APP_PORT;

export const startServer = app => {
  app.listen(port, () => {
    logger.info(`started the server at http://%s:%d`, host, port);
  });
};
