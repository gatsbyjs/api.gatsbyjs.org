import axios from 'axios';
import { getContributorInfo } from './github';

/*
 * @todo: add tests
 * @todo: handle the case where a Shopify customer already exists and we try to create one
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

  // TODO do we get error messages back from Shopify?
  // TODO how do we look up a customer by email?
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

  return response.data.data.customerCreate.customer.id;
};

const returnCodeStatus = (orders, contributionCount) => {
  const usedCodes = orders.map(({ node: { discountCode } }) => discountCode);

  return (
    SHOPIFY_DISCOUNT_CODES
      // filter out codes that contributor has earned
      .filter(code => {
        return contributionCount >= code.threshold;
      })
      // return the (used/not used) status of earned codes
      .map(({ code }) => ({
        code,
        used: usedCodes.includes(code)
      }))
  );
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

const getShopifyCustomer = async shopifyCustomerID => {
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
    orders: result.data.data.customer.orders.edges,
    tags: result.data.data.customer.tags
  };
};

export const getMissingTags = async (shopifyCustomerID, contributionCount) => {
  const { orders, tags } = await getShopifyCustomer(shopifyCustomerID);
  console.log(tags);

  const earnedCodes = returnCodeStatus(orders, contributionCount);

  console.log(earnedCodes);

  const newTags = earnedCodes
    .map(obj => {
      // tags: ["level2", "contributor"]
      // code: [{ code: 'BUILDWITHGATSBY', used: false }]
      // constant: [{ code: '', tag: '' }]
      const codeInfo = SHOPIFY_DISCOUNT_CODES.find(
        discount => discount.code === obj.code
      );
      return !tags.includes(codeInfo.tag) ? codeInfo.tag : false;
    })
    .filter(Boolean);

  console.log(newTags);
  return newTags;
};

export const getShopifyCustomerTags = async shopifyCustomerID => {
  const customer = await getShopifyCustomer(shopifyCustomerID);

  return customer.tags;
};

export const getShopifyDiscountCodes = async (
  shopifyCustomerID,
  contributionCount
) => {
  const customer = await getShopifyCustomer(shopifyCustomerID);

  // @todo: error handling
  return returnCodeStatus(customer.orders, contributionCount);
};
