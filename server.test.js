import dotenv from 'dotenv';
import { startServer } from './server.mjs';

dotenv.config();

describe('server', () => {
  test('starts a server on the correct port', () => {
    const app = { listen: jest.fn((_, fn) => fn()) };

    startServer(app);

    expect(app.listen).toBeCalledWith(
      process.env.APP_PORT,
      expect.any(Function)
    );
  });
});
