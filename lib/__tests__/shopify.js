import * as request from '../request.mjs';
import { createShopifyCustomer } from '../shopify.mjs';

jest.mock('dotenv', () => ({
  config: () => {
    // Provide the env vars expected by the lib
    process.env.SHOPIFY_API_KEY = 'TEST_SHOPIFY_API_KEY';
    process.env.SHOPIFY_API_SECRET = 'TEST_SHOPIFY_API_SECRET';
    process.env.SHOPIFY_URI = 'TEST_SHOPIFY_URI';
    process.env.SHOPIFY_DISCOUNT_CODE = 'TEST_SHOPIFY_DISCOUNT_CODE';
  }
}));

let mockReturn = () => {};
const mockPayload = {
  username: 'testuser',
  email: 'test@example.org',
  first_name: 'Test',
  subscribe: true
};

jest.mock('../request.mjs', () => ({
  get: jest.fn(() => mockReturn),
  post: jest.fn(() => mockReturn),
  put: jest.fn(() => mockReturn)
}));

describe('lib/shopify', () => {
  describe('createShopifyCustomer()', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('hits the expected endpoint with a well-formed payload', async () => {
      request.post.mockReturnValueOnce(Promise.resolve({ status: 201 }));
      await createShopifyCustomer(mockPayload);

      expect(request.post).toMatchSnapshot();
    });

    test('doesn’t sign the user up for emails if they didn’t subscribe', async () => {
      request.post.mockReturnValueOnce(Promise.resolve({ status: 201 }));
      await createShopifyCustomer({ ...mockPayload, subscribe: false });

      expect(request.post).toMatchSnapshot();
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

      request.get.mockReturnValueOnce(
        Promise.resolve({
          data: { customers: [{ id: 1234, tags: 'contributor' }] }
        })
      );

      request.put.mockReturnValueOnce(
        Promise.resolve({
          status: 200
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
      request.get.mockReturnValueOnce(Promise.reject({}));

      return expect(createShopifyCustomer(mockPayload)).rejects.toThrowError(
        'Unable to retrieve customers.'
      );
    });
  });
});
