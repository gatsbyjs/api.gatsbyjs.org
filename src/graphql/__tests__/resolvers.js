import * as gh from '@octokit/rest';
import axios from 'axios';
import { prisma } from '../../prisma-client';
import * as github from '../../lib/github';
import resolvers from '../resolvers';

/*
 * Hi there! At first glance, these tests might seem pretty intense, but there’s
 * a reason we did it this way.
 *
 * These are integration tests for our resolvers, meaning they execute _all_ of
 * the code we wrote ourselves, but not third-party code or actual HTTP
 * requests. Our goal is to avoid writing lots of unit tests for the underlying
 * helper functions — we want to write as few tests as possible and still feel
 * really confident that our code is stable.
 *
 * To make that happen, we end up mocking the underlying data access tools:
 * 1. Prisma (for Gatsby’s internal contributor DB)
 * 2. Octokit’s REST lib (for GitHub)
 * 3. Axios (used to send requests to Shopify)
 *
 * To understand why each mocked in the tests below was added, follow the chain
 * of events from the resolver: we’re letting the code run as-is for as long as
 * we can, then mocking the calls to external data sources so can test without
 * an internet connection.
 *
 * We could pretty easily extend this to be a full-on e2e test suite; we’d just
 * need to write cleanup code to remove any data that’s created as part of the
 * tests. Which I don’t want to do right now. So integration tests these shall
 * remain. 😈
 */

jest.mock('axios');

jest.mock('../../prisma-client', () => ({
  prisma: {
    createContributor: jest.fn(),
    contributor: jest.fn()
  }
}));

const mockGitHubIssueSearchResult = {
  data: {
    total_count: 1,
    items: [
      {
        id: 1,
        title: 'test issue',
        html_url: 'https://github.com/gatsbyjs/gatsby/issues/1',
        number: 1,
        labels: [{ name: 'test label', url: 'https://example.org' }]
      }
    ]
  }
};

const mockShopifyCustomerCreateSuccess = {
  data: {
    data: {
      customerCreate: {
        customer: { id: 'gid://shopify/Customer/1234567891234' },
        userErrors: []
      }
    }
  }
};

const mockShopifyAddTagsSuccess = {
  data: { data: { tagsAdd: { userErrors: [] } } }
};

const mockPrismaContributor = {
  githubUsername: 'gatsbot',
  email: 'team@gatsbyjs.com',
  shopifyCustomerID: 'gid://shopify/Customer/1234567891234'
};

describe('graphql/resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query', () => {
    describe('contributorInformation', () => {
      test('returns pull request information for a contributor', async () => {
        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);

        const result = await resolvers.Query.contributorInformation(null, {
          githubUsername: 'gatsbot'
        });

        expect(result).toEqual({
          totalContributions: 1,
          pullRequests: [
            {
              id: 1,
              title: 'test issue',
              url: 'https://github.com/gatsbyjs/gatsby/issues/1',
              number: 1,
              labels: [{ name: 'test label', url: 'https://example.org' }]
            }
          ]
        });
      });
    });

    describe('openIssues', () => {
      test('loads open issues for a given label', async () => {
        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);

        const result = await resolvers.Query.openIssues(null, {
          label: 'test label'
        });

        expect(result).toEqual({
          totalIssues: 1,
          issues: [
            {
              id: 1,
              title: 'test issue',
              url: 'https://github.com/gatsbyjs/gatsby/issues/1',
              number: 1,
              labels: [{ name: 'test label', url: 'https://example.org' }]
            }
          ]
        });
      });
    });

    describe('getContributor', () => {
      test('loads a contributor by their GitHub username', async () => {
        prisma.contributor.mockResolvedValueOnce(mockPrismaContributor);
        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);

        const contributor = await resolvers.Query.getContributor(null, {
          githubUsername: 'gatsbot'
        });

        expect(contributor).toEqual({
          githubUsername: 'gatsbot',
          email: 'team@gatsbyjs.com',
          shopifyCustomerID: 'gid://shopify/Customer/1234567891234',
          github: {
            username: 'gatsbot',
            contributionCount: 1,
            pullRequests: [
              {
                id: 1,
                title: 'test issue',
                url: 'https://github.com/gatsbyjs/gatsby/issues/1',
                number: 1,
                labels: [{ name: 'test label', url: 'https://example.org' }]
              }
            ]
          }
        });
      });

      test('returns only GitHub data if no contributor record exists', async () => {
        prisma.contributor.mockResolvedValueOnce(null);

        gh.search.issues.mockResolvedValueOnce({
          data: { total_count: 0, items: [] }
        });

        const contributor = await resolvers.Query.getContributor(null, {
          githubUsername: 'gatsbot'
        });

        expect(contributor).toEqual({
          githubUsername: 'gatsbot',
          github: {
            username: 'gatsbot',
            contributionCount: 0,
            pullRequests: []
          }
        });
      });
    });
  });

  describe('Mutation', () => {
    describe.skip('discountCode', () => {
      const contributorInfo = {
        githubUsername: 'octocat',
        email: 'test@example.com',
        firstName: 'Test',
        subscribe: true
      };

      test('loads the discount code for a valid customer', async () => {
        process.env.SHOPIFY_DISCOUNT_CODE = 'TESTDISCOUNTCODE';
        github.isGitHubContributor.mockReturnValueOnce(true);

        const result = await resolvers.Mutation.discountCode(
          null,
          contributorInfo
        );

        expect(result).toEqual({
          discountCode: process.env.SHOPIFY_DISCOUNT_CODE,
          errors: []
        });
      });

      test('sends an error array if the customer is not a contributor', async () => {
        github.isGitHubContributor.mockReturnValueOnce(false);

        const response = await resolvers.Mutation.discountCode(
          null,
          contributorInfo
        );

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

        const response = await resolvers.Mutation.discountCode(
          null,
          contributorInfo
        );

        expect(response).toEqual({
          discountCode: null,
          errors: [new Error('Something went wrong')]
        });
      });
    });

    describe('createContributor', () => {
      const contributorInput = {
        input: {
          githubUsername: 'gatsbot',
          email: 'team@gatsbyjs.com',
          acceptsMarketing: true,
          firstName: 'Gatsbot'
        }
      };

      test('creates a new contributor record', async () => {
        /*
         * What we’re mocking here:
         *
         * 1. Creating a customer in Shopify (in lib/shopify.js)
         * 2. Adding tags to a customer in Shopify (in lib/shopify.js)
         * 3. Loading contribution data from GitHub (in lib/github.js)
         */

        axios
          .mockResolvedValueOnce(mockShopifyCustomerCreateSuccess)
          .mockResolvedValueOnce(mockShopifyAddTagsSuccess);

        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);

        const contributor = await resolvers.Mutation.createContributor(
          null,
          contributorInput
        );

        expect(contributor.shopifyCustomerID).toBe(
          'gid://shopify/Customer/1234567891234'
        );
      });

      test('invites the user to Gatsby’s GitHub org if necessary', async () => {
        axios
          .mockResolvedValueOnce(mockShopifyCustomerCreateSuccess)
          .mockResolvedValueOnce(mockShopifyAddTagsSuccess);

        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);
        gh.orgs.getTeamMembership.mockRejectedValueOnce({ code: 404 });

        await resolvers.Mutation.createContributor(null, contributorInput);

        expect(gh.orgs.addTeamMembership).toBeCalled();
      });

      test('fails gracefully to invite the user to GitHub if there’s a problem', async () => {
        axios
          .mockResolvedValueOnce(mockShopifyCustomerCreateSuccess)
          .mockResolvedValueOnce(mockShopifyAddTagsSuccess);

        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);
        gh.orgs.getTeamMembership.mockRejectedValueOnce({
          code: 500,
          message: 'Internal server error'
        });

        await resolvers.Mutation.createContributor(null, contributorInput);

        expect(gh.orgs.addTeamMembership).not.toBeCalled();
      });

      test('sends a helpful error message if a duplicate username is submitted', async () => {
        expect.assertions(1);
        axios.mockResolvedValueOnce(mockShopifyCustomerCreateSuccess);

        // Mock a duplicate field error from Prisma.
        prisma.createContributor.mockRejectedValueOnce(
          new Error(
            'A unique constraint would be violated for Field name = githubUsername'
          )
        );

        try {
          await resolvers.Mutation.createContributor(null, contributorInput);
        } catch (error) {
          expect(error.message).toMatch(/account already exists/);
        }
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

        const result = await resolvers.Mutation.createContributor(
          null,
          contributorInput
        );

        expect(result.shopifyCustomerID).toBe(
          'gid://shopify/Customer/1234567891234'
        );
      });

      test('passes through unknown customer creation errors', async () => {
        expect.assertions(1);

        axios.mockResolvedValueOnce({
          data: {
            data: {
              customerCreate: {
                customer: null,
                userErrors: [{ message: 'Error: Some other error.' }]
              }
            }
          }
        });

        try {
          await resolvers.Mutation.createContributor(null, contributorInput);
        } catch (error) {
          expect(error.message).toBe('Error: Some other error.');
        }
      });

      test('passes the error message through if an unknown error occurs', async () => {
        expect.assertions(1);

        axios.mockResolvedValueOnce(mockShopifyCustomerCreateSuccess);

        prisma.createContributor.mockRejectedValueOnce(
          new Error('Something unexpected happened.')
        );

        try {
          await resolvers.Mutation.createContributor(null, contributorInput);
        } catch (error) {
          expect(error.message).toBe('Something unexpected happened.');
        }
      });
    });

    describe('updateContributorTags', () => {
      test('adds the appropriate tags for a first-level contributor', async () => {
        prisma.contributor.mockResolvedValueOnce(mockPrismaContributor);
        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);
        axios.mockResolvedValueOnce(mockShopifyAddTagsSuccess);

        await resolvers.Mutation.updateContributorTags(null, {
          githubUsername: 'gatsbot'
        });

        const mutation = axios.mock.calls[0][0].data;

        expect(mutation).toMatch(/"contributor"/);
      });

      test('adds the appropriate tags for a second-level contributor', async () => {
        prisma.contributor.mockResolvedValueOnce(mockPrismaContributor);
        gh.search.issues.mockResolvedValueOnce({
          data: {
            ...mockGitHubIssueSearchResult.data,
            total_count: 5
          }
        });
        axios.mockResolvedValueOnce(mockShopifyAddTagsSuccess);

        await resolvers.Mutation.updateContributorTags(null, {
          githubUsername: 'gatsbot'
        });

        const mutation = axios.mock.calls[0][0].data;

        expect(mutation).toMatch(/"contributor","level2"/);
      });

      test('adds no tags if the contributor record doesn’t exist', async () => {
        prisma.contributor.mockResolvedValueOnce(null);
        gh.search.issues.mockResolvedValueOnce(mockGitHubIssueSearchResult);

        await resolvers.Mutation.updateContributorTags(null, {
          githubUsername: 'gatsbot'
        });

        expect(axios).not.toBeCalled();
      });

      test('adds no tags if the contributor has no contributions', async () => {
        prisma.contributor.mockResolvedValueOnce(mockPrismaContributor);
        gh.search.issues.mockResolvedValueOnce({
          data: {
            ...mockGitHubIssueSearchResult.data,
            total_count: 0
          }
        });

        await resolvers.Mutation.updateContributorTags(null, {
          githubUsername: 'gatsbot'
        });

        expect(axios).not.toBeCalled();
      });

      test('passes through error messages if something goes wrong', async () => {
        expect.assertions(1);

        gh.search.issues.mockImplementationOnce(() => {
          throw new Error('Something went wrong.');
        });

        try {
          await resolvers.Mutation.updateContributorTags(null, {
            githubUsername: 'gatsbot'
          });
        } catch (error) {
          expect(error.message).toBe('Something went wrong.');
        }
      });
    });
  });

  describe('Contributor', () => {
    describe('shopify', () => {
      test('returns an intermediate object when a customer ID exists', async () => {
        const result = await resolvers.Contributor.shopify({
          shopifyCustomerID: 'gid://shopify/Customer/1234567891234',
          github: { contributionCount: 1 }
        });

        expect(result).toEqual({
          id: 'gid://shopify/Customer/1234567891234',
          count: 1
        });
      });

      test('returns null when no customer ID exists', async () => {
        const result = await resolvers.Contributor.shopify({
          github: { contributionCount: 1 }
        });

        expect(result).toBeNull();
      });
    });
  });

  describe('ShopifyInfo', () => {
    describe('codes', () => {
      test('returns an array of available discount codes and their used status', async () => {
        axios.mockResolvedValueOnce({
          data: {
            data: {
              customer: {
                orders: {
                  edges: [{ node: { discountCode: 'BUILDWITHGATSBY' } }]
                }
              }
            }
          }
        });

        const result = await resolvers.ShopifyInfo.codes({
          id: 'gid://shopify/Customer/1234567891234',
          count: 5
        });

        expect(result).toEqual([
          { code: 'BUILDWITHGATSBY', used: true },
          { code: 'HOLYBUCKETS', used: false }
        ]);
      });
    });
  });
});
