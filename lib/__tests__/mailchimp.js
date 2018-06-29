import * as request from '../request.mjs';
import { addMailChimpSubscriber } from '../mailchimp.mjs';

jest.mock('dotenv', () => ({
  config: () => {
    // Provide the env vars expected by the lib
    process.env.MAILCHIMP_API_URI = 'https://us001.api.mailchimp.com/3.0';
    process.env.MAILCHIMP_LIST_ID = 'TEST_MAILCHIMP_LIST_ID';
    process.env.MAILCHIMP_API_KEY = 'TEST_MAILCHIMP_API_KEY';
  }
}));

let mockReturn = () => {};
const mockPayload = {
  username: 'testuser',
  email: 'test@example.org',
  first_name: 'Test',
  last_name: 'User'
};

jest.mock('../request.mjs', () => ({
  put: jest.fn(() => mockReturn)
}));

describe('lib/mailchimp', () => {
  test('calls the correct endpoint with the correct payload', () => {
    addMailChimpSubscriber(mockPayload);
    expect(request.put.mock).toMatchSnapshot();
  });
});
