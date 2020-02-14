# Gatsby API

This is the GraphQL API that powers the maintainer dashboard for the [Gatsby Store](https://store.gatsbyjs.org) and the relevant parts of [the docs](https://gatsbyjs.org) like the feedback widget. It handles calls to privileged services such as Shopify and MailChimp to avoid exposing API keys in a client-side app.

## Production environment

Services:

- [AWS Lambda](https://aws.com/lambda)
- [Prisma Cloud](https://prisma.io/cloud)
- [Shopify](https://shopify.com)

API:

- [GitHub](https://developer.github.com/v4/)

Frameworks:

- [Prisma Client](https://www.prisma.io/client/client-typescript)
- [Serverless Framework](https://serverless.com/)

_The way these services and frameworks work together is explained in more detail in the Architecture section below_

## API Reference

### `/graphql`

All GraphQL calls for the store are sent to this endpoint.

For a full schema reference, see [the schema](./src/graphql/schema.graphql).

### `/public`

All GraphQL calls from gatsbyjs.org are sent to this endpoint.

For a full schema reference, see [the schema](./src/graphql/public-schema.graphql).

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

The develop script will run the `serverless offline start` command, spinning up a local version of the serverless lambda functions that run on your machine to test with.

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

## Deploying Changes

```bash
yarn deploy
```

## Architecture

This repository is deployed using the Serverless framework to configure all the pieces of the AWS infrastructure required to function. The following things take place on AWS:

- the source code is packaged up uploaded to S3
- Lambda functions are created for each GraphQL endpoint
- an API is created on API gateway
- a Cloudfront distribution is created (and it's address will be output at the end of the logs of a successful deploy under the heading "Distribution Domain Name")

Other pieces of the puzzle that fit everything together:

- a DNS record pointing at the Cloudfront distribution needs to be set up for the domain that the API is being deployed to
- a prisma service serves as the database for the feedback gathered by the feedback widget on gatsbyjs.org, the endpoint for it is in `prisma/prisma.yml`

Some gotchas in this process:

- you must have created and verified a certificate in AWS Certificate Manageer for the domain you are attempting to deploy to (the domain you are deploying to is listed in the `serverless.yml` under custom:customDomain:domainName)
- you cannot deploy to a domain if another existing cloudfront distribution is already using that domain (for instance, if the API were deployed to a personal AWS account, it would have to be removed there before being deployed to an organization's AWS console)
- some of the serverless plugins have some quirky bugs
  - `serverless-domain-manager` will error out of the deployment with `ConfigError: Missing region in config` if AWS_REGION=us-east-1 is not included before the deploy command
- you might see an error: `Error: Could not set up basepath mapping. Try running sls create_domain first.` if you are deploying for the first time, running `sls create_domain` should resolve it, this occurs if AWS doesn't have a custom domain name set up in API Gateway
