import { ApolloError } from 'apollo-server-express';
import { getContributorInfo, inviteIfNecessary } from '../lib/github';
import {
  createShopifyCustomer,
  getEarnedDiscountCodes,
  addTagsToCustomer
} from '../lib/shopify';
import { prisma } from '../prisma-client';
import getLogger from './logger';

const logger = getLogger('lib/db');

/** @typedef {{ name: string, url: string }} GitHubLabel */

/**
 * @typedef {Object} GitHubIssue
 * @prop {string} id
 * @prop {string} title - the title displayed on GitHub for the issue
 * @prop {string} url - URL to open the issue on GitHub
 * @prop {number} number - the GitHub issue number
 * @prop {GitHubLabel[]} labels - array of labels applied to the issue
 */

/**
 * @typedef {Object} GitHubInfo
 * @prop {string} username - the contributor’s GitHub username
 * @prop {number} contributionCount - number of merged PRs by this user
 * @prop {GitHubIssue[]} pullRequests - details on merged PRs by this user
 */

/** @typedef {{ code: string, used: boolean}} ShopifyDiscountCode */
/** @typedef {{ id: string, codes: ShopifyDiscountCode[] }} ShopifyInfo */

/**
 * @typedef {Object} Contributor - contributor record for storage in Prisma
 * @prop {string} githubUsername - the contributor’s GitHub username
 * @prop {string} email - the contributor’s email address
 * @prop {GitHubInfo} github - the contributor’s GitHub details
 * @prop {ShopifyInfo} shopify - the contributor’s Shopify details
 */

/**
 * Retrieves details about a contributor using their GitHub username.
 *
 * This combines data from Gatsby’s internal, Prisma-managed database, GitHub,
 * and Shopify to create a “Contributor” object that rolls up relevant details
 * into a nice, tidy package.
 *
 * @param {string} githubUsername
 * @return {Contributor}
 */
export const getContributorByGitHubUsername = async githubUsername => {
  logger.verbose(`Loading the contributor record for @${githubUsername}`);
  const [contributor, githubInfo] = await Promise.all([
    prisma.contributor({ githubUsername }),
    getContributorInfo(githubUsername)
  ]);

  const github = {
    username: githubUsername,
    contributionCount: githubInfo.totalContributions,
    pullRequests: githubInfo.pullRequests
  };

  if (!contributor) {
    logger.error(`No contributor record found for @${githubUsername}`);

    return {
      githubUsername,
      github
    };
  }

  return {
    ...contributor,
    github
  };
};

/**
 * @typedef ContributorInput
 * @prop {string} githubUsername
 * @prop {string} email
 * @prop {string} firstName - used for greetings
 * @prop {boolean} acceptsMarketing - if true, they’ll receive the Gatsby newsletter
 */

/**
 * Creates a new contributor record in Shopify and Prisma.
 *
 * @param {ContributorInput} input details about the contributor record to be created
 * @return {Contributor}
 */
export const createContributor = async input => {
  logger.verbose(
    `Creating a new contributor record for @${input.githubUsername}...`
  );

  // 1. Create a new customer in Shopify
  const shopifyCustomerID = await createShopifyCustomer(input);

  // 2. Load GitHub data and create a Prisma record in parallel.
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
    logger.error(error.message);

    const [, field] =
      error.message.match(
        /unique constraint would be violated.+Field name = (\w+)$/
      ) || [];

    if (field === 'githubUsername') {
      throw new ApolloError(
        `An account already exists for the GitHub user @${input.githubUsername}`
      );
    }

    throw new ApolloError(error.message);
  });

  logger.verbose(`New contributor record created`);

  if (contributionCount > 0) {
    /*
     * 3. Add tags to the Shopify customer and invite them to GitHub.
     *
     * This is done here (and not in the initial customer creation) because
     * there’s a possibility that someone might use a different email to
     * register the same GitHub username. This would cause the Prisma entry to
     * fail, but if the Shopify customer is already created and tagged, the
     * discount codes would work despite not having a valid contributor account
     * created in Prisma.
     *
     * Of course, only a _real jerk_ would abuse this, but since we’re all
     * Responsible Developers™ here, we do it this way to avoid a rollback step
     * if there’s a duplicate contributor account for the GitHub user.
     *
     * We also wait to invite them to GitHub because we need to know whether or
     * not they’ve got any contributions to the repo.
     */
    const tags = getEarnedDiscountCodes(contributionCount).map(
      ({ tag }) => tag
    );

    await Promise.all([
      addTagsToCustomer(shopifyCustomerID, tags),
      inviteIfNecessary(input.githubUsername)
    ]);
  }

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
};
