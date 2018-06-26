import dotenv from 'dotenv';
import { post } from './request.mjs';
import getLogger from './logger.mjs';

dotenv.config();

const logger = getLogger('lib/shopify');

const verifyCustomerExists = error => {
  logger.verbose(JSON.stringify(error));
  const { response: { data = {}, status, statusText } = {} } = error;

  // If the error is that the customer already exists, we can safely ignore that.
  if (
    data.errors &&
    data.errors.email &&
    data.errors.email[0] === 'has already been taken'
  ) {
    return true;
  }

  // If we get here, something went wrong that we didn’t expect.
  logger.error('Error %d: %s', status, statusText, { data });

  return false;
};

const sendPost = (endpoint, payload) => {
  const key = process.env.SHOPIFY_API_KEY;
  const secret = process.env.SHOPIFY_API_SECRET;
  const domain = process.env.SHOPIFY_URI;

  const uri = `https://${key}:${secret}@${domain}${endpoint}`;

  return post(uri, payload);
};

export const createShopifyCustomer = async ({
  username,
  email,
  first_name,
  last_name
}) => {
  const endpoint = '/admin/customers.json';
  const payload = {
    customer: {
      first_name,
      last_name,
      email,
      tags: 'contributor',
      metafields: [
        {
          key: 'github',
          value: username,
          namespace: 'global',
          value_type: 'string'
        }
      ]
    }
  };

  let customer = false;
  let errorMessage;
  try {
    const response = await sendPost(endpoint, payload);
    logger.verbose(JSON.stringify(response));

    if (response.status === 201) {
      customer = true;
    }

    if (!customer) {
      logger.error(JSON.stringify(response));
      errorMessage = response.statusText;
    }
  } catch (error) {
    // If the customer was already created in Shopify, we get an error back.
    // However, we don’t want to fail for that case, so check for it here.
    customer = verifyCustomerExists(error);

    if (!customer) {
      logger.error(JSON.stringify(error));
      errorMessage = 'Unable to register the user with Shopify';
    } else {
      logger.info('Customer %s already exists!', email);
    }
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return customer;
};
