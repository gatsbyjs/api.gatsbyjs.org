import dotenv from 'dotenv';
import { get, post, put } from './request';
import getLogger from './logger';

dotenv.config();

const logger = getLogger('lib/shopify');

const getShopifyEndpoint = endpoint => {
  const key = process.env.SHOPIFY_API_KEY;
  const secret = process.env.SHOPIFY_API_SECRET;
  const domain = process.env.SHOPIFY_URI;

  return `https://${key}:${secret}@${domain}${endpoint}`;
};

export const addContributorTagToCustomer = async customer => {
  const tags = customer.tags.split(',');

  if (tags.includes('contributor')) {
    return true;
  }

  const nextTags = ['contributor', ...tags].join();
  const uri = getShopifyEndpoint(`/admin/customers/${customer.id}.json`);
  const payload = { customer: { id: customer.id, tags: nextTags } };

  const response = await put(uri, payload);

  if (response.status !== 200) {
    throw new Error('Unable to add the “contributor” tag to the customer');
  }

  logger.verbose(
    'The “contributor” tag was added to the customer %s',
    payload.customer.email
  );

  return true;
};

export const getCustomerByEmail = async email => {
  const endpoint = `/admin/customers/search.json`;
  const uri = getShopifyEndpoint(endpoint);

  const { data: { customers = [] } = {} } = await get(uri, { query: email });

  if (!customers[0]) {
    throw new Error(`No customer found with the email ${email}`);
  }

  return customers[0];
};

export const createCustomer = async payload => {
  try {
    const uri = getShopifyEndpoint('/admin/customers.json');
    const response = await post(uri, payload);

    if (response.status !== 201) {
      throw new Error(response.statusText);
    }

    logger.verbose(
      '%s was added as a customer in Shopify',
      payload.customer.email
    );
    return true;
  } catch (e) {
    /*
     * If the attempt to create the customer fails, it means the customer
     * already exists, so we need to load the existing customer.
     */
    const customer = await getCustomerByEmail(payload.customer.email);

    // Ensure the customer has the `contributor` tag so the discount works.
    await addContributorTagToCustomer(customer);

    return true;
  }
};

export const createShopifyCustomer = async ({
  username,
  email,
  first_name,
  subscribe
}) => {
  const response = await createCustomer({
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
  });

  return response;
};
