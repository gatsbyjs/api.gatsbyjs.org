import axios from 'axios';
import { createShopifyCustomer } from '../../lib/shopify';

jest.mock('axios');

describe('lib/shopify', () => {
  describe('createShopifyCustomer', () => {
    test('creates a new customer in Shopify', async () => {
      axios.mockResolvedValueOnce({
        data: {
          data: {
            customerCreate: {
              customer: { id: 'gid://shopify/Customer/1234567891234' },
              userErrors: []
            }
          }
        }
      });

      const customerID = await createShopifyCustomer({
        email: 'team@gatsbyjs.com',
        firstName: 'Gatsbot',
        acceptsMarketing: true
      });

      expect(customerID).toBe('gid://shopify/Customer/1234567891234');
    });

    test('loads a customer if the email address is taken', async () => {
      axios
        .mockResolvedValueOnce({
          data: {
            data: {
              customerCreate: {
                customer: null,
                userErrors: [
                  { message: 'Error: Email has already been taken.' }
                ]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              customers: {
                edges: [
                  { node: { id: 'gid://shopify/Customer/1234567891234' } }
                ]
              }
            }
          }
        });

      const customerID = await createShopifyCustomer({
        email: 'team@gatsbyjs.com',
        firstName: 'Gatsbot',
        acceptsMarketing: true
      });

      expect(customerID).toBe('gid://shopify/Customer/1234567891234');
    });

    test('throws an error if something else goes wrong', async () => {
      expect.assertions(1);

      axios.mockResolvedValueOnce({
        data: {
          data: {
            customerCreate: {
              customer: null,
              userErrors: [{ message: 'some other error' }]
            }
          }
        }
      });

      try {
        await createShopifyCustomer({
          email: 'team@gatsbyjs.com',
          firstName: 'Gatsbot',
          acceptsMarketing: true
        });
      } catch (error) {
        expect(error.message).toBe('some other error');
      }
    });
  });

  // describe('addTagsToCustomer()', () => {
  //   test.skip('')
  // });
});
