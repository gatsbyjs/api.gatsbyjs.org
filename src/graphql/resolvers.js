import {
  getContributorInfo,
  getOpenIssuesByLabel,
  isGitHubContributor,
  inviteIfNecessary
} from '../lib/github';
import { createShopifyCustomer as createShopifyCustomerRest } from '../lib/shopify';
import { createShopifyCustomer } from '../lib/shopify-graphql';
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
      // TODO when should we create the contributor the first time?
      // const resp = await prisma.createContributor({
      //   githubUsername: 'jlengstorf',
      //   email: 'jason@gatsbyjs.com'
      // });

      const [contributor, contributorInfo] = await Promise.all([
        prisma.contributor({ githubUsername }),
        getContributorInfo(githubUsername)
      ]);

      if (!contributor || !contributor.githubUsername) {
        return null;
      }

      return {
        ...contributor,
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

    createShopifyCustomer: async (_, { input }) => {
      return await createShopifyCustomer(input);
    }
  }
};
