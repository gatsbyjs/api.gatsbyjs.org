import { ApolloError } from 'apollo-server-express';
import {
  getContributorInfo,
  getOpenIssuesByLabel,
  isGitHubContributor,
  inviteIfNecessary
} from '../lib/github';
import { createShopifyCustomer as createShopifyCustomerRest } from '../lib/shopify';
import {
  createShopifyCustomer,
  getShopifyDiscountCodes
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
      ]).catch(error => {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      });

      const githubInfo = {
        githubUsername,
        githubPullRequestCount: contributorInfo.totalContributions,
        githubPullRequests: contributorInfo.pullRequests
      };

      // no prisma record, return github info
      if (!contributor || !contributor.githubUsername) {
        return githubInfo;
      }

      try {
        const shopifyCodes = await getShopifyDiscountCodes(
          contributor.shopifyCustomerID,
          contributorInfo.totalContributions
        );

        return {
          ...githubInfo,
          ...contributor,
          shopifyCodes
        };
      } catch (error) {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      }
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
          await createShopifyCustomer({
            githubUsername,
            firstName,
            email,
            acceptsMarketing: subscribe
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

    createContributor: async (_, { input }) => {
      const shopifyCustomerID = await createShopifyCustomer(input);

      const [{ totalContributions }] = await Promise.all([
        getContributorInfo(input.githubUsername),
        prisma.createContributor({
          githubUsername: input.githubUsername,
          email: input.email,
          shopifyCustomerID
        })
      ]).catch(error => {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      });

      const shopifyCodes = await getShopifyDiscountCodes(
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
