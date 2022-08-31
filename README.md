# Gatsby API

This is the GraphQL API that powers the maintainer dashboard for the [Gatsby Store](https://store.gatsbyjs.org) and the relevant parts of [the docs](https://gatsbyjs.org) like the feedback widget. It handles calls to privileged services such as Shopify and MailChimp to avoid exposing API keys in a client-side app.

## Production environment

Services:

- [Google Cloud Functions](https://cloud.google.com/functions)
- [Prisma Cloud](https://prisma.io/cloud)
- [Shopify](https://shopify.com)

API:

- [GitHub](https://developer.github.com/v4/)

Frameworks:

- [ExpressJS](https://expressjs.com/)
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

```shell
# Clone the repo.
git clone git@github.com:gatsbyjs/api.gatsbyjs.org.git

# Move into the newly cloned project.
cd api.gatsbyjs.org

# Install dependencies
yarn # or `npm install`
```

### Step 2: Configure `env` variables

```shell
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

### Step 3: Testing the API

The `serverless-offline` package only works to emulate AWS serverless code, since transitioning to GCP it's less ergonomic to test locally.

You can invoke a function locally with this command, (from to the [serverless documentation](https://www.serverless.com/framework/docs/providers/google/cli-reference/invoke-local/)):

```shell
serverless invoke local --function public --data '{ "query": "query { ping }" }'
```

However there are some issues circulating on the serverless-google-cloudfunctions package around better support for local emulation and development.

#### How to Test This API Using cURL

If you want to send straight-up `POST` requests so you can wear sunglasses indoors and pretend you’re a hacker, you can also send cURL requests like so:

```shell
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

**Note:** These commands need the POST url to match a place where they are running like `api.gatsbyjs.org`, or to a local port if you're emulating the functions locally.

## Deploying Changes

Before the functions can be deployed, you need to save a keys file to your local machine that the `serverless.yml` references.

Verify that you have downloaded the keys file from where it's stored (in 1Password for Gatsby employees) and referenced in the `serverless.yml`:

```yaml
provider:
  name: google
  stage: dev
  runtime: nodejs10
  region: us-central1
  project: gatsby-core
  credentials: ~/Downloads/gatsby-core.json # <-- this needs to match where you're file is
```

The serverless deploy command is set up in the `package.json` to be run by the following yarn command:

```shell
yarn deploy
```

Serverless will zip up all the files and deploy them to Google Cloud Functions over the top of existing functions of the same name and project.

For deployment to multiple environments

## Architecture

This repository is deployed using the Serverless framework to configure all the pieces of the infrastructure required to function. The following things take place on GCP:

- the source code is packaged up uploaded to Google Cloud Storage
- Functions are created for each GraphQL endpoint

Other pieces of the puzzle that fit everything together:

- a DNS record pointing at the deployed functions needs to be set up for the domain that the API is being deployed to
- a prisma service serves as the database for the feedback gathered by the feedback widget on gatsbyjs.org, the endpoint for it is in `prisma/prisma.yml`
