# Gatsby Store API

This is the REST API that powers the Maintainer Dashboard for the [Gatsby Store](https://store.gatsbyjs.org). It handles calls to privileged services such as Shopify and MailChimp to avoid exposing API keys in a client-side app.

## API Reference

### `/store/discount-code`

Whitelists a maintainer to get free swag from the store.

#### Parameters

| Name       | Type   | Description                                                       |
| ---------- | ------ | ----------------------------------------------------------------- |
| username   | String | the GitHub username                                               |
| email      | String | email address (can be any email, but is typically a GitHub email) |
| first_name | String | maintainer’s first name                                           |
| last_name  | String | maintainer’s last name                                            |

> _**NOTE:** All parameters are required._

#### Response

On success (`200`):

```json
{
  "contributor": true,
  "customer": true,
  "subscribed": true,
  "discount_code": "DISCOUNTCODEHERE"
}
```

#### Test this endpoint

Using cURL:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -d '{"username":"[GITHUB_USERNAME]","email":"[EMAIL]","first_name":"[FNAME]","last_name":"[LNAME]"}' \
  http://localhost:8080/store/discount-code
```

> _**NOTE:** See the ["How to Test This API"](#how-to-test-this-api) section for instructions on getting a JWT token._

## How to Test This API

### Step 1: Start the API locally

```bash
git clone git@github.com:ichabod-cranes/mansion.git
cd mansion/api.gatsbyjs.com
yarn
yarn start
```

### Step 2: Get your access token

To get your JWT token, visit <https://store.gatsbyjs.org> and log in with your GitHub account. Next, open Chrome Developer tools and follow these steps.

![Getting a JWT token in Chrome dev tools](docs/images/jwt-token.png)

1.  Navigate to the "Application" tab
2.  Select `https://store.gatsbyjs.org` under "Local Storage" in the left-hand panel
3.  Select `access_token` in the main panel
4.  Copy the JWT token, which will be a value starting with `ey`

### Step 3: Send a test request using cURL

**IMPORTANT:** Open another terminal. The API needs to still be running.

See the endpoint docs above for test commands.
