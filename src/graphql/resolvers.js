import { ApolloError } from 'apollo-server-express';
import { createContributor, getContributorByGitHubUsername } from '../lib/db';
import {
  getContributorInfo,
  getOpenIssuesByLabel,
  isGitHubContributor,
  inviteIfNecessary
} from '../lib/github';
import {
  createShopifyCustomer,
  getShopifyDiscountCodes,
  getEarnedDiscountCodes,
  addTagsToCustomer
} from '../lib/shopify';
import getLogger from '../lib/logger';

const logger = getLogger('graphql/resolvers');

export default {
  Query: {
    contributorInformation: async (_, { githubUsername }) =>
      await getContributorInfo(githubUsername),
    openIssues: async (_, { label }) => await getOpenIssuesByLabel(label),
    getContributor: async (_, { githubUsername }) =>
      await getContributorByGitHubUsername(githubUsername)
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
          const shopifyCustomerID = await createShopifyCustomer({
            githubUsername,
            firstName,
            email,
            acceptsMarketing: subscribe
          });

          await addTagsToCustomer(shopifyCustomerID, ['contributor']);
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

    createContributor: async (_, { input }) => await createContributor(input),
    updateContributorTags: async (_, { githubUsername }) => {
      try {
        // 1. Load the contributor’s info from the database.
        const contributor = await getContributorByGitHubUsername(
          githubUsername
        );

        // If there’s no customer record or no contributions, return the data.
        if (
          !contributor.shopifyCustomerID ||
          contributor.github.contributionCount < 1
        ) {
          return contributor;
        }

        // 2. Update the tags for the contributor so the discount codes work.
        const tags = getEarnedDiscountCodes(
          contributor.github.contributionCount
        ).map(({ tag }) => tag);

        // Await this because we want any errors to prevent returning.
        await addTagsToCustomer(contributor.shopifyCustomerID, tags);

        return contributor;
      } catch (error) {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      }
    }
  },
  Contributor: {
    shopify: async data => {
      if (!data || !data.shopifyCustomerID) {
        return null;
      }

      return {
        id: data.shopifyCustomerID,
        // Passed through to child resolver at `ShopifyInfo.codes`
        count: data.github.contributionCount
      };
    }
  },
  ShopifyInfo: {
    codes: async data => await getShopifyDiscountCodes(data.id, data.count)
  }
};
