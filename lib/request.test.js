import axios from 'axios';
import { post, put } from './request.mjs';

jest.mock('axios', () => ({
  post: jest.fn(),
  put: jest.fn()
}));

describe('lib/request', () => {
  describe('post()', () => {
    test('uses axios to make a POST request', () => {
      post('/test', { foo: 'bar' }, { config: 'options' });

      expect(axios.post).toBeCalledWith(
        '/test',
        { foo: 'bar' },
        { config: 'options' }
      );
    });
  });

  describe('put()', () => {
    test('uses axios to make a PUT request', () => {
      put('/test', { foo: 'bar' }, { config: 'options' });

      expect(axios.put).toBeCalledWith(
        '/test',
        { foo: 'bar' },
        { config: 'options' }
      );
    });
  });
});
