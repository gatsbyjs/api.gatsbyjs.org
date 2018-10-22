import Octokit, { search } from '@octokit/rest';
import mockIssues from '../../__fixtures__/github-issues.json';
import store from '../store.mjs';
import { createShopifyCustomer } from '../../lib/shopify.mjs';

jest.mock('../../lib/shopify.mjs');

const defaultRequest = {
  url: '/discount-code',
  method: 'POST',
  body: {
    username: 'jlengstorf',
    email: 'jason@gatsbyjs.com',
    first_name: 'Jason',
    subscribe: false
  }
};

describe('routes/store', () => {
  beforeEach(() => {
    Octokit.mockClear();
    search.issues.mockClear();
    createShopifyCustomer.mockReturnValueOnce(true);
  });

  test('should return a discount code', done => {
    search.issues.mockReturnValueOnce(mockIssues);

    const res = {
      status: () => ({
        json: json => {
          expect(json.contributor).toBe(true);
          expect(json.customer).toBe(true);
          expect(json.subscribed).toBe(false);
          expect(json.discount_code).toBe(process.env.SHOPIFY_DISCOUNT_CODE);
          done();
        }
      })
    };

    store.handle(defaultRequest, res);
  });

  test('should return error if username is not a contributor', done => {
    const res = {
      status: () => ({
        json: json => {
          expect(json.error).toBe(
            `Whoops! @${defaultRequest.body.username} has not contributed to ${
              process.env.GITHUB_ORG
            } on GitHub.`
          );
          done();
        }
      })
    };

    store.handle(defaultRequest, res);
  });
});
