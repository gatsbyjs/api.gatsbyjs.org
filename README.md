# Gatsby Store API

This is the GraphQL API that powers the Maintainer Dashboard for the [Gatsby Store](https://store.gatsbyjs.org). It handles calls to privileged services such as Shopify and MailChimp to avoid exposing API keys in a client-side app.

## Production environment

Services:
- [AWS Lambda](https://aws.com/lambda) 
- [Prisma Cloud](https://prisma.io/cloud)
- [Shopify](https://shopify.com)

API:
- [GitHub](https://developer.github.com/v4/)

Frameworks:
- [ExpressJS](https://expressjs.com/)
- [Prisma Client](https://www.prisma.io/client/client-typescript)
- [Serverless Framework](https://serverless.com/)

## API Reference

### `/graphql`

All GraphQL calls are sent to this endpoint.

For a full schema reference, see [the schema](./src/graphql/schema.graphql).

## Running This Repo Locally

### Step 1: Clone the API

```bash
# Clone the repo.
git clone git@github.com:gatsbyjs/api.gatsbyjs.org.git

# Move into the newly cloned project.
cd api.gatsbyjs.org

# Install dependencies
yarn # or `npm install`
```

### Step 2: Configure `env` variables

```bash
# Copy the example .env file into a real .env file
cp .env.EXAMPLE .env
```

The `.env.EXAMPLE` file contains a list of `env` variables used in various locations throughout the repository. Set each variable's value per your environment setup and credentials in `.env`.

| Name                    | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `APP_LOGLEVEL`          | The debug log output level.                                      |
| `APP_HOST`              | The hostname of the API server.                                  |
| `APP_PORT`              | The port number for the API server.                              |
| `AUTH0_AUDIENCE`        | The unique identifier for your Auth0 API.                        |
| `AUTH0_DOMAIN`          | Your Auth0 domain.                                               |
| `GITHUB_TEAM_ID`        | The GitHub team to which the user should be added.               |
| `GITHUB_TOKEN`          | Your GitHub authentication token.                                |
| `GITHUB_ORG`            | The GitHub organization to search for the user's contributions.  |
| `NODE_ENV`              | The current Node environment in which the API server is running. |
| `SHOPIFY_API_KEY`       | Your Shopify API key.                                            |
| `SHOPIFY_API_SECRET`    | Your Shopify API secret.                                         |
| `SHOPIFY_DISCOUNT_CODE` | The discount code supplied by the Shopify API for the user.      |
| `SHOPIFY_URI`           | The Shopify API domain.                                          |

### Step 3: Start the API locally

```bash
yarn develop
```

### Step 4: Open the GraphQL Playground

Open http://localhost:3000/playground to use this API locally.

> **NOTE:** The JWT authentication is explicitly disabled in development. This is because we assume that if you’ve got access to the various API keys required to run this API, you’re trustworthy. 😅

#### How to Test This API Using cURL

If you want to send straight-up `POST` requests so you can wear sunglasses indoors and pretend you’re a hacker, you can also send cURL requests like so:

```bash
curl \
  -H "Content-Type: application/json" \
  --data '{
      "query": "query($user:String!) { contributorInformation(githubUsername:$user) { totalContributions } }",
      "variables": {
        "user": "[GITHUB_USERNAME]"
      }
    }' \
  -X POST http://localhost:3000/graphql
```

**IMPORTANT:** Open another terminal. The API needs to still be running.
