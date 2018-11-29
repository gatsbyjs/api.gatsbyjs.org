import axios from 'axios';
import { getContributorInfo } from './github';

export const createShopifyCustomer = async ({
  githubUsername,
  email,
  firstName,
  acceptsMarketing
}) => {
  const { totalContributions } = await getContributorInfo(githubUsername);
  const tags = [];

  // I feel dirty.
  if (totalContributions > 0) {
    tags.push('contributor');
  }

  if (totalContributions >= 5) {
    tags.push('level2');
  }

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

  if (response.errors) {
    // TODO what do we do with errors?
  }

  // TODO store the ID in the Prisma database

  return response.data.data.customerCreate.customer.id;
};

// 1. need to know all available codes
// 2. determine whether contribution count qualifies for 1-2 codes
// 3. see which ones are used
const returnCodeStatus = (orders, contributionCount) => {
  const allContributorCodes = [
    {
      code: 'BUILDWITHGATSBY',
      // rename this shizz
      threshold: 1
    },
    {
      code: 'LEVEL2',
      threshold: 5
    }
  ];

  const earnedCodes = allContributorCodes
    .filter(code => {
      return contributionCount >= code.threshold;
    })
    .map(({ code }) => code);

  orders.map(({ node: { discountCode } }) => ({
    code: discountCode,
    used: earnedCodes.includes(discountCode)
  }));
};

export const getCustomerCodes = async (
  shopifyCustomerID,
  contributionCount
) => {
  const orders = await axios({
    method: 'post',
    url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
    },
    data: `
       {
        customer(id: "${shopifyCustomerID}") {
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

  // @todo: error handling
  return returnCodeStatus(
    orders.data.data.customer.orders.edges,
    contributionCount
  );
};
