import axios from 'axios';

export const put = (uri, payload, config = {}) =>
  axios.put(uri, payload, config);

export const post = (uri, payload, config = {}) =>
  axios.post(uri, payload, config);
