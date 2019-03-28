import mem from 'mem';
import { ApolloError } from 'apollo-server-express';
import axios from 'axios';
import getLogger from './logger';

const logger = getLogger('lib/shopify');

/*
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
    code: 'HOLYBUCKETS',
    threshold: 5,
    tag: 'level2'
  }
];

/**
 * Executes a GraphQL query against the Shopify API.
 * @param {string} query - a GraphQL query or mutation
 * @return {Promise} a Promise containing the result and/or errors
 */
const fetchGraphQL = query =>
  axios({
    method: 'post',
    url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
    },
    data: query
  });

const getShopifyCustomerByEmail = async email => {
  const {
    data: {
      data: { customers }
    }
  } = await fetchGraphQL(
    `
      {
        customers(query: "email:${email}" first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `
  );

  return customers.edges.map(({ node }) => node).find(id => id);
};

/** @typedef {{ usedCodes: string[], tags: string[] }} CustomerData */
/** @typedef {(id: string) => CustomerData} ShopifyCustomer */

/**
 * Loads a given Shopify customer record by its ID.
 *
 * NOTE: This call is memoized (using `mem`) for 3 seconds to prevent wasted
 * requests since several parts of the Shopify resolver chain call this.
 *
 * @type ShopifyCustomer
 */
const getShopifyCustomer = mem(
  async id => {
    logger.verbose(`loading Shopify customer data...`);

    const result = await fetchGraphQL(
      `
        {
          customer(id: "${id}") {
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
    );

    logger.verbose(`Shopify customer data loaded!`);

    return {
      usedCodes: result.data.data.customer.orders.edges.map(
        ({ node: { discountCode } }) => discountCode
      ),
      tags: result.data.data.customer.tags
    };
  },
  { maxAge: 3000 }
);

export const createShopifyCustomer = async ({
  email,
  firstName,
  acceptsMarketing
}) => {
  try {
    const {
      data: {
        data: { customerCreate: response }
      }
    } = await fetchGraphQL(
      `
        mutation {
          customerCreate(input: {
            acceptsMarketing: ${acceptsMarketing}
            firstName: "${firstName}"
            email: "${email}"
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
      `
    );

    if (response.userErrors.length > 0) {
      // Hard-coding error messages feels gross but I don’t have a better idea.
      const isDuplicate = response.userErrors.find(err =>
        err.message.match(/Email has already been taken/)
      );

      if (isDuplicate) {
        logger.verbose(`A customer with the email ${email} already exists.`);

        // If the email is already taken, we load the existing customer data.
        const customer = await getShopifyCustomerByEmail(email);

        return customer.id;
      } else {
        logger.error(response.userErrors.map(({ message }) => message));
        throw new Error(response.userErrors[0].message);
      }
    }

    return response.customer.id;
  } catch (error) {
    throw new ApolloError(error.message);
  }
};

export const addTagsToCustomer = async (shopifyCustomerID, tags) => {
  const response = await fetchGraphQL(
    `
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
    `
  );

  const errors = response.data.data.tagsAdd.userErrors;

  if (response.errors || errors.length > 0) {
    const allErrors = [].concat(
      response.errors.map(({ message }) => message),
      errors.map(({ message }) => message)
    );

    logger.error(allErrors);

    throw new ApolloError(allErrors[0]);
  }

  logger.verbose(`Added new tags: ${tags.join(', ')}`);
};

export const getEarnedDiscountCodes = contributionCount =>
  SHOPIFY_DISCOUNT_CODES.filter(code => contributionCount >= code.threshold);

const getDiscountCodesWithStatus = (contributionCount, usedCodes) =>
  getEarnedDiscountCodes(contributionCount).map(({ code }) => ({
    code,
    used: usedCodes.includes(code)
  }));

export const getShopifyDiscountCodes = async (
  shopifyCustomerID,
  contributionCount
) => {
  const customer = await getShopifyCustomer(shopifyCustomerID);

  // @todo: error handling
  return getDiscountCodesWithStatus(contributionCount, customer.usedCodes);
};
