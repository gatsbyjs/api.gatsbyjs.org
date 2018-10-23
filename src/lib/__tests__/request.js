import axios from 'axios';
import { get, post, put } from '../request';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve()),
  post: jest.fn(() => Promise.resolve()),
  put: jest.fn(() => Promise.resolve())
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

    test('doesn’t complain without config options', () => {
      post('/test', { foo: 'bar' });

      expect(axios.post).not.toThrow();
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

    test('doesn’t complain without config options', () => {
      put('/test', { foo: 'bar' });

      expect(axios.put).not.toThrow();
    });
  });

  describe('get()', () => {
    test('uses axios to make a GET request', () => {
      get('/test', { foo: 'bar' }, { config: 'options' });

      expect(axios.get).toBeCalledWith('/test?foo=bar', { config: 'options' });
    });

    test('doesn’t complain without config options', () => {
      get('/test', { foo: 'bar' });

      expect(axios.get).not.toThrow();
    });
  });
});
