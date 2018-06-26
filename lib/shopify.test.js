import * as request from './request.mjs';
import { createShopifyCustomer } from './shopify.mjs';

let mockReturn = () => {};
const mockPayload = {
  username: 'testuser',
  email: 'test@example.org',
  first_name: 'Test',
  last_name: 'User'
};

jest.mock('./request.mjs', () => ({
  post: jest.fn(() => mockReturn)
}));

describe('lib/shopify', () => {
  describe('createShopifyCustomer()', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('creates a new customer in Shopify', async () => {
      request.post.mockReturnValueOnce(Promise.resolve({ status: 201 }));

      const response = await createShopifyCustomer(mockPayload);

      expect(response).toBe(true);
    });

    test('doesn’t throw an error if the customer already exists', async () => {
      request.post.mockReturnValueOnce(
        Promise.reject({
          response: { data: { errors: { email: ['has already been taken'] } } }
        })
      );

      const response = await createShopifyCustomer(mockPayload);
      expect(response).toBe(true);
    });

    test('throws an error if something other than a 201 comes back', () => {
      request.post.mockReturnValueOnce(
        Promise.resolve({ status: 404, statusText: 'Not Found' })
      );

      return expect(createShopifyCustomer(mockPayload)).rejects.toThrowError(
        'Not Found'
      );
    });

    test('throws an error if an empty response comes back', () => {
      request.post.mockReturnValueOnce(Promise.reject({}));

      return expect(createShopifyCustomer(mockPayload)).rejects.toThrowError(
        'Unable to register the user with Shopify'
      );
    });
  });
});
