import { ApolloError } from 'apollo-server-express';
import axios from 'axios';
import { getContributorInfo } from './github';

/*
 * @todo: handle the case where a Shopify customer already exists and we try to create one (lookup and associate existing user with prisma account)
 * @todo: use email address associated with user's github account (account for this in UI also)
 * @todo: add tests
 */

const SHOPIFY_DISCOUNT_CODES = [
  {
    code: 'BUILDWITHGATSBY',
    // rename this shizz
    threshold: 1,
    tag: 'contributor'
  },
  {
    code: 'LEVEL2',
    threshold: 5,
    tag: 'level2'
  }
];

export const createShopifyCustomer = async ({
  githubUsername,
  email,
  firstName,
  acceptsMarketing
}) => {
  const { totalContributions } = await getContributorInfo(githubUsername);
  const tags = getEarnedCodes(totalContributions).map(({ tag }) => tag);

  // doesnt work when a customer already exists
  // need to get ID and add to prisma
  const mutation = `
    mutation {
      customerCreate(input: {
        acceptsMarketing: ${acceptsMarketing}
        firstName: "${firstName}"
        email: "${email}"
        tags: ${JSON.stringify(tags)}
      }) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // TODO do we get error messages back from Shopify?
  // TODO how do we look up a customer by email?
  try {
    const {
      data: {
        data: { customerCreate: response }
      }
    } = await axios({
      method: 'post',
      url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
      headers: {
        'Content-Type': 'application/graphql',
        'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
      },
      data: mutation
    });

    if (response.userErrors.length > 0) {
      throw new Error(response.userErrors[0].message);
    }

    return response.customer.id;
  } catch (error) {
    throw new ApolloError(error.message);
  }
};

export const addTagsToCustomer = async (shopifyCustomerID, tags) => {
  const mutation = `
    mutation {
      tagsAdd(id: "${shopifyCustomerID}", tags: ${JSON.stringify(tags)}) {
        userErrors {
          field
          message
        }
        node {
          id
        }
      }
    }
  `;

  const response = await axios({
    method: 'post',
    url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
    },
    data: mutation
  });

  const hasErrors = response.data.data.tagsAdd.userErrors.length > 0;

  if (response.errors || hasErrors) {
    // @todo: more useful error logging
    throw new ApolloError(error.message);
  }

  return !hasErrors;
};

export const getShopifyCustomer = async shopifyCustomerID => {
  const result = await axios({
    method: 'post',
    url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
    },
    data: `
       {
        customer(id: "${shopifyCustomerID}") {
          tags
          orders(first: 100) {
            edges {
              node {
                discountCode
              }
            }
          }
        }
      }
    `
  });

  return {
    usedCodes: result.data.data.customer.orders.edges.map(
      ({ node: { discountCode } }) => discountCode
    ),
    tags: result.data.data.customer.tags
  };
};

// gets earned codes by contribution count (external to user account)
const getEarnedCodes = contributionCount =>
  SHOPIFY_DISCOUNT_CODES
    // filter out codes that contributor has earned
    .filter(code => {
      return contributionCount >= code.threshold;
    });

const getEarnedCodesStatus = (contributionCount, usedCodes) => {
  const earnedCodes = getEarnedCodes(contributionCount);
  return earnedCodes.map(({ code }) => ({
    code,
    used: usedCodes.includes(code)
  }));
};

// for existing shopify customer
export const getMissingTags = async (shopifyCustomerID, contributionCount) => {
  const { tags, usedCodes } = await getShopifyCustomer(shopifyCustomerID);
  const earnedCodesStatus = getEarnedCodesStatus(contributionCount, usedCodes);
  const newTags = earnedCodesStatus
    .map(obj => {
      const codeInfo = SHOPIFY_DISCOUNT_CODES.find(
        discount => discount.code === obj.code
      );
      return !tags.includes(codeInfo.tag) ? codeInfo.tag : false;
    })
    .filter(Boolean);

  return newTags;
};

export const getShopifyDiscountCodes = async (
  shopifyCustomerID,
  contributionCount
) => {
  const customer = await getShopifyCustomer(shopifyCustomerID);

  // @todo: error handling
  return getEarnedCodesStatus(contributionCount, customer.usedCodes);
};
