import {
  getContributorInfo,
  getOpenIssuesByLabel,
  isGitHubContributor,
  inviteIfNecessary
} from '../lib/github';
import { createShopifyCustomer as createShopifyCustomerRest } from '../lib/shopify';
import {
  createShopifyCustomer,
  getCustomerCodes
} from '../lib/shopify-graphql';
import getLogger from '../lib/logger';
import { prisma } from '../prisma-client';

const logger = getLogger('graphql/resolvers');

export default {
  Query: {
    contributorInformation: async (_, { githubUsername }) => {
      return await getContributorInfo(githubUsername);
    },
    openIssues: async (_, { label }) => {
      return await getOpenIssuesByLabel(label);
    },
    getContributor: async (_, { githubUsername }) => {
      const [contributor, contributorInfo] = await Promise.all([
        prisma.contributor({ githubUsername }),
        getContributorInfo(githubUsername)
      ]);

      // no prisma record, return github info
      if (!contributor || !contributor.githubUsername) {
        return {
          githubUsername,
          githubPullRequestCount: contributorInfo.totalContributions
        };
      }

      const shopifyCodes = await getCustomerCodes(
        contributor.shopifyCustomerID,
        contributorInfo.totalContributions
      );

      // return existing prisma contributor and GH details
      return {
        ...contributor,
        shopifyCodes,
        githubPullRequestCount: contributorInfo.totalContributions
      };
    }
  },
  Mutation: {
    discountCode: async (
      _,
      { githubUsername, email, firstName, subscribe }
    ) => {
      const org = process.env.GITHUB_ORG;
      const code = process.env.SHOPIFY_DISCOUNT_CODE;
      let errors = [];

      logger.verbose('requesting a discount code for @%s', githubUsername);

      try {
        // TODO will need to return level
        const isContributor = await isGitHubContributor(githubUsername);

        logger.verbose(
          `@%s %s a contributor.`,
          githubUsername,
          isContributor ? 'is' : 'is not'
        );

        if (isContributor) {
          // Ensure all contributors have been invited to the GitHub org.
          await inviteIfNecessary(githubUsername);

          // Create a Shopify customer to associate with the discount code.
          await createShopifyCustomerRest({
            username: githubUsername,
            first_name: firstName,
            email,
            subscribe
          });
        } else {
          errors.push(
            `@${githubUsername} isn’t a contributor to the ${org} org`
          );
        }
      } catch (err) {
        errors.push(err);
      }

      return {
        discountCode: errors.length === 0 ? code : null,
        errors
      };
    },

    createCustomer: async (_, { input }) => {
      const shopifyCustomerID = await createShopifyCustomer(input);

      // @todo: error handling
      const prismaRecord = await prisma.createContributor({
        githubUsername: input.githubUsername,
        email: input.email,
        shopifyCustomerID
      });

      const { totalContributions } = await getContributorInfo(
        input.githubUsername
      );

      const shopifyCodes = await getCustomerCodes(
        shopifyCustomerID,
        totalContributions
      );

      return {
        githubUsername: input.githubUsername,
        email: input.email,
        githubPullRequestCount: totalContributions,
        shopifyCustomerID,
        shopifyCodes
      };
    }
  }
};
