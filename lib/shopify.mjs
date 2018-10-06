import dotenv from 'dotenv';
import { get, post, put } from './request.mjs';
import getLogger from './logger.mjs';

dotenv.config();

const logger = getLogger('lib/shopify');

function getShopifyEndpoint(endpoint) {
  const key = process.env.SHOPIFY_API_KEY;
  const secret = process.env.SHOPIFY_API_SECRET;
  const domain = process.env.SHOPIFY_URI;
  const uri = `https://${key}:${secret}@${domain}${endpoint}`;
  return uri;
}

const addContributorTagToCustomer = (customerId, existingTags) => {
  const endpoint = `/admin/customers/${customerId}.json`;
  const payload = {
    customer: {
      id: customerId,
      tags: ['contributor', ...existingTags].join()
    }
  };

  const uri = getShopifyEndpoint(endpoint);

  return put(uri, payload);
};

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

const getCustomerByEmail = email => {
  const endpoint = `/admin/customers/search.json`;
  const uri = getShopifyEndpoint(endpoint);

  return get(uri, `query=${email}`);
};

const sendPost = (endpoint, payload) => {
  const uri = getShopifyEndpoint(endpoint);

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

  let isCustomer = false;
  let errorMessage;
  try {
    logger.verbose('Sending POST request to Shopify...');
    const response = await sendPost(endpoint, payload);
    logger.verbose('POST response:');
    logger.verbose(JSON.stringify(response.data));

    if (response.status === 201) {
      logger.verbose('@%s was added as a customer', username);
      isCustomer = true;
    }

    if (!isCustomer) {
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

    // TODO refactor this, because it got pretty messy in here.
    let customerResponse;
    try {
      customerResponse = await getCustomerByEmail(payload.customer.email);
      logger.verbose(JSON.stringify(customerResponse.data.customers));
    } catch (e) {
      throw new Error('Unable to retrieve customers.');
    }

    // If the response came back empty, something went wrong with Shopify; bail.
    if (
      !customerResponse ||
      !customerResponse.data ||
      !customerResponse.data.customers ||
      !customerResponse.data.customers.length > 0
    ) {
      throw Error('No customer data returned from Shopify.');
    }

    const customer = customerResponse.data.customers[0];
    const tags = customer.tags.split(',') || [];
    const isContributor = tags.filter(t => t === 'contributor').length > 0;

    // If the customer is already a contributor, we don’t need to do anything else.
    if (isContributor) {
      return true;
    }

    const tagResponse = await addContributorTagToCustomer(customer.id, tags);

    if (tagResponse.status === 200) {
      logger.verbose(
        `The “contributor” tag was added to ${payload.customer.email}`
      );
      isCustomer = true;
      return isCustomer;
    }

    if (!isCustomer) {
      errorMessage = 'Unable to register the user with Shopify';
    }
  }

  if (errorMessage) {
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return isCustomer;
};
