import * as request from '../request';
import {
  addContributorTagToCustomer,
  createCustomer,
  createShopifyCustomer,
  getCustomerByEmail
} from '../shopify';

let mockReturn = () => {};
const mockPayload = {
  username: 'testuser',
  email: 'test@example.org',
  first_name: 'Test',
  subscribe: true
};

jest.mock('../request', () => ({
  get: jest.fn(() => mockReturn),
  post: jest.fn(() => mockReturn),
  put: jest.fn(() => mockReturn)
}));

describe('lib/shopify', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Provide the env vars expected by the lib
    process.env.SHOPIFY_API_KEY = 'TEST_SHOPIFY_API_KEY';
    process.env.SHOPIFY_API_SECRET = 'TEST_SHOPIFY_API_SECRET';
    process.env.SHOPIFY_URI = 'TEST_SHOPIFY_URI';
    process.env.SHOPIFY_DISCOUNT_CODE = 'TEST_SHOPIFY_DISCOUNT_CODE';
  });

  describe('addContributorTagToCustomer()', () => {
    test('hits the expected endpoint with a well-formed payload', async () => {
      expect.assertions(1);
      request.put.mockResolvedValueOnce({ status: 200 });
      await addContributorTagToCustomer({ id: 1, tags: 'foo,bar' });

      expect(request.put).toMatchSnapshot();
    });

    test('throws an error if the tag cannot be added', async () => {
      expect.assertions(1);
      request.put.mockResolvedValueOnce({ status: 500 });

      try {
        await addContributorTagToCustomer({ id: 1, tags: 'foo,bar' });
      } catch (e) {
        expect(e.message).toEqual(
          expect.stringMatching(/Unable to add the “contributor” tag/)
        );
      }
    });

    test('does nothing if the contributor tag already exists', async () => {
      expect.assertions(1);
      request.put.mockClear();

      await addContributorTagToCustomer({ id: 2, tags: 'contributor' });

      expect(request.put).not.toBeCalled();
    });
  });

  describe('getCustomerByEmail()', () => {
    test('hits the expected endpoint with a well-formed payload', async () => {
      expect.assertions(1);
      request.get.mockResolvedValueOnce({ data: { customers: [{}] } });

      await getCustomerByEmail('jason@gatsbyjs.com');

      expect(request.get).toMatchSnapshot();
    });

    test('throws an error if no customer is found', async () => {
      request.get.mockResolvedValueOnce({ status: 500 });

      try {
        await getCustomerByEmail('jason@gatsbyjs.com');
      } catch (e) {
        expect(e.message).toEqual(expect.stringMatching(/No customer found/));
      }
    });
  });

  describe('createCustomer()', () => {
    test('hits the expected endpoint with a well-formed payload', async () => {
      request.post.mockResolvedValueOnce({ status: 201 });
      await createCustomer({
        customer: {
          first_name: 'Test',
          email: 'test@example.com',
          accepts_marketing: true,
          tags: 'contributor',
          metafields: [
            {
              key: 'github',
              value: 'octocat',
              namespace: 'global',
              value_type: 'string'
            }
          ]
        }
      });

      expect(request.post).toMatchSnapshot();
    });

    test('loads a customer and adds the contributor tag for existing customers', async () => {
      request.post.mockResolvedValueOnce({ status: 500 });

      request.get.mockResolvedValueOnce({
        data: { customers: [{ id: 1, tags: 'foo,bar' }] }
      });

      request.put.mockReturnValueOnce({ status: 200 });
    });
  });

  describe('createShopifyCustomer()', () => {
    test('hits the expected endpoint with a well-formed payload', async () => {
      request.post.mockResolvedValueOnce({ status: 201 });
      await createShopifyCustomer(mockPayload);

      expect(request.post).toMatchSnapshot();
    });

    test('doesn’t sign the user up for emails if they didn’t subscribe', async () => {
      request.post.mockResolvedValueOnce({ status: 201 });
      await createShopifyCustomer({ ...mockPayload, subscribe: false });

      expect(request.post).toMatchSnapshot();
    });

    test('creates a new customer in Shopify', async () => {
      request.post.mockResolvedValueOnce({ status: 201 });

      const response = await createShopifyCustomer(mockPayload);

      expect(response).toBe(true);
    });

    test('doesn’t throw an error if the customer already exists', async () => {
      request.post.mockRejectedValueOnce({
        response: { data: { errors: { email: ['has already been taken'] } } }
      });

      request.get.mockResolvedValueOnce({
        data: { customers: [{ id: 1234, tags: 'contributor' }] }
      });

      request.put.mockResolvedValueOnce({ status: 200 });

      const response = await createShopifyCustomer(mockPayload);
      expect(response).toBe(true);
    });

    test('throws an error if something other than a 201 comes back', async () => {
      expect.assertions(1);
      request.post.mockResolvedValueOnce({ status: 500 });

      request.get.mockResolvedValueOnce({
        status: 404,
        statusText: 'Not found'
      });

      try {
        await createShopifyCustomer(mockPayload);
      } catch (e) {
        expect(e.message).toEqual(expect.stringMatching(/No customer found/));
      }
    });
  });
});
