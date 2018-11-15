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

  // TODO figure out how to insert a boolean in a template string
  const mutation = `
    mutation {
      customerCreate(input: {
        acceptsMarketing: true
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

export const getCustomer = () => {
  return axios({
    method: 'post',
    url: `https://${process.env.SHOPIFY_URI}/admin/api/graphql.json`,
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': process.env.SHOPIFY_GRAPHQL_TOKEN
    },
    data: `
       {
        customer(id: "gid://shopify/Customer/624470163544") {
          orders(first: 100) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `
  });
};
