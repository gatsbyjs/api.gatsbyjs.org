import dotenv from 'dotenv';
import { post } from './request.mjs';
import getLogger from './logger.mjs';

dotenv.config();

const logger = getLogger('lib/shopify');

const verifyCustomerExists = error => {
  const { response: { data = {}, status, statusText } = {} } = error;
  logger.verbose('%d: %s — %s', status, statusText, JSON.stringify(data));

  // If the error is that the customer already exists, we can safely ignore that.
  if (
    data.errors &&
    data.errors.email &&
    data.errors.email[0] === 'has already been taken'
  ) {
    return true;
  }

  // If we get here, something went wrong that we didn’t expect.
  logger.error('Error %d: %s', status, statusText, { data, error });

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
  subscribe
}) => {
  const endpoint = '/admin/customers.json';
  const payload = {
    customer: {
      first_name,
      email,
      accepts_marketing: subscribe,
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
    logger.verbose('Sending POST request to Shopify...');
    const response = await sendPost(endpoint, payload);
    logger.verbose('POST response:');
    logger.verbose(JSON.stringify(response.data));

    if (response.status === 201) {
      logger.verbose('@%s was added as a customer', username);
      customer = true;
    }

    if (!customer) {
      logger.verbose(
        'There was a problem adding @%s as a customer: %s',
        username,
        response.statusText
      );
      logger.error(JSON.stringify(response));
      errorMessage = response.statusText;
    }
  } catch (error) {
    logger.verbose('An error was thrown while trying to create a customer.');

    // If the customer was already created in Shopify, we get an error back.
    // However, we don’t want to fail for that case, so check for it here.
    customer = verifyCustomerExists(error);

    logger.verbose(
      '@%s %s already a customer',
      username,
      customer ? 'is' : 'is not'
    );

    if (!customer) {
      errorMessage = 'Unable to register the user with Shopify';
    }
  }

  if (errorMessage) {
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return customer;
};
