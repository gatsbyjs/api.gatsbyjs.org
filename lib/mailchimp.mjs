import dotenv from 'dotenv';
import crypto from 'crypto';
import { put } from './request.mjs';
import getLogger from '../lib/logger.mjs';

const logger = getLogger('lib/mailchimp');

dotenv.config();

const api = process.env.MAILCHIMP_API_URI;
const list = process.env.MAILCHIMP_LIST_ID;
const key = process.env.MAILCHIMP_API_KEY;

const getSubscriberHash = email =>
  crypto
    .createHash('md5')
    .update(email.toLowerCase())
    .digest('hex');

const putWithAuth = async (endpoint, payload) => {
  const uri = `${api}${endpoint}`;

  return await put(uri, payload, {
    auth: {
      username: 'apikey',
      password: key
    }
  });
};

export const addMailChimpSubscriber = async ({
  email,
  username,
  first_name,
  last_name
}) => {
  const hash = getSubscriberHash(email);
  const endpoint = `/lists/${list}/members/${hash}`;
  const payload = {
    email_address: email,
    email_type: 'html',
    status_if_new: 'subscribed',
    merge_fields: {
      FNAME: first_name,
      LNAME: last_name,
      GITHUB: username
    }
  };

  logger.info('Sending PUT request to %s', endpoint);

  return putWithAuth(endpoint, payload);
};
