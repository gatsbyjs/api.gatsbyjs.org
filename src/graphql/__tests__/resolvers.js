import * as github from '../../lib/github';
import resolvers from '../resolvers';

jest.mock('../../lib/github.js', () => ({
  getContributorInfo: jest.fn(),
  isGitHubContributor: jest.fn(),
  inviteIfNecessary: jest.fn()
}));

jest.mock('../../lib/shopify.js', () => ({
  createShopifyCustomer: jest.fn()
}));

describe('github/resolvers', () => {
  describe('Query', () => {
    describe('contributorInformation', () => {
      test('returns pull request information for a contributor', async () => {
        const mockContributorInfo = {
          totalContributions: 2,
          pullRequests: [
            {
              title: 'fix: move async CSS load to gatsby-browser.js',
              url: 'https://github.com/gatsbyjs/gatsby/pull/6128',
              number: 6128
            },
            {
              title: 'feat: clarify that all prices are in USD',
              url: 'https://github.com/gatsbyjs/store.gatsbyjs.org/pull/35',
              number: 35
            }
          ]
        };

        github.getContributorInfo.mockReturnValueOnce(mockContributorInfo);
        const result = await resolvers.Query.contributorInformation(null, {
          githubUsername: 'jlengstorf'
        });
        expect(result).toEqual(mockContributorInfo);
      });
    });
  });

  describe('Mutation', () => {
    describe('discountCode', () => {
      test('loads the discount code for a valid customer', async () => {
        process.env.SHOPIFY_DISCOUNT_CODE = 'TESTDISCOUNTCODE';
        github.isGitHubContributor.mockReturnValueOnce(true);
        const result = await resolvers.Mutation.discountCode(null, {
          githubUsername: 'octocat',
          email: 'test@example.com',
          firstName: 'Test',
          subscribe: true
        });

        expect(result).toEqual({
          discountCode: process.env.SHOPIFY_DISCOUNT_CODE,
          errors: []
        });
      });

      test('sends an error array if the customer is not a contributor', async () => {
        github.isGitHubContributor.mockReturnValueOnce(false);
        const response = await resolvers.Mutation.discountCode(null, {
          githubUsername: 'octocat',
          email: 'test@example.com',
          firstName: 'Test',
          subscribe: true
        });

        expect(response).toEqual({
          discountCode: null,
          errors: [expect.stringMatching(/isn’t a contributor/)]
        });
      });

      test('doesn’t explode if there’s a network error', async () => {
        github.isGitHubContributor.mockReturnValueOnce(true);
        github.inviteIfNecessary.mockImplementationOnce(() => {
          throw new Error('Something went wrong');
        });

        const response = await resolvers.Mutation.discountCode(null, {
          githubUsername: 'octocat',
          email: 'test@example.com',
          firstName: 'Test',
          subscribe: true
        });

        expect(response).toEqual({
          discountCode: null,
          errors: [new Error('Something went wrong')]
        });
      });
    });
  });
});
