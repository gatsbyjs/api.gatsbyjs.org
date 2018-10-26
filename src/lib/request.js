import axios from 'axios';
import querystring from 'querystring';
import getLogger from './logger';

const logger = getLogger('lib/request');

export const put = (uri, payload, config = {}) => {
  logger.verbose('Sending a PUT request to %s', uri);
  return axios.put(uri, payload, config);
};

export const post = (uri, payload, config = {}) => {
  logger.verbose('Sending a POST request to %s', uri);
  return axios.post(uri, payload, config);
};

export const get = (uri, queryObject, config = {}) => {
  const queryString = querystring.stringify(queryObject);
  logger.verbose('Sending a GET request to %s', uri);
  logger.verbose('QueryString: %s', queryString);

  return axios.get(`${uri}?${queryString}`, config);
};
