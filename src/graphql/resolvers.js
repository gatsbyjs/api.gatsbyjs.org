import { ApolloError } from 'apollo-server-express';
import {
  getContributorInfo,
  getOpenIssuesByLabel,
  isGitHubContributor,
  inviteIfNecessary
} from '../lib/github';
import {
  createShopifyCustomer,
  getShopifyDiscountCodes,
  getShopifyCustomer,
  getMissingTags,
  addTagsToCustomer
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
      try {
        const [contributor, githubInfo] = await Promise.all([
          prisma.contributor({ githubUsername }),
          getContributorInfo(githubUsername)
        ]);

        const github = {
          username: githubUsername,
          contributionCount: githubInfo.totalContributions,
          pullRequests: githubInfo.pullRequests
        };

        if (!contributor || !contributor.githubUsername) {
          return {
            githubUsername,
            github
          };
        }

        return {
          ...contributor,
          github
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

      const [
        { totalContributions: contributionCount, pullRequests }
      ] = await Promise.all([
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

      return {
        githubUsername: input.githubUsername,
        email: input.email,
        shopifyCustomerID,
        github: {
          username: input.githubUsername,
          contributionCount,
          pullRequests
        }
      };
    },
    addTagsToShopifyCustomer: async (_, { id, tags }) => {
      return await addTagsToCustomer(id, tags);
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
    codes: async data => {
      try {
        return await getShopifyDiscountCodes(data.id, data.count);
      } catch (error) {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      }
    },
    tags: async data => {
      try {
        const customer = await getShopifyCustomer(data.id);
        return customer.tags;
      } catch (error) {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      }
    },
    newTags: async data => {
      try {
        return await getMissingTags(data.id, data.count);
      } catch (error) {
        // @todo: more useful error logging
        throw new ApolloError(error.message);
      }
    }
  }
};
