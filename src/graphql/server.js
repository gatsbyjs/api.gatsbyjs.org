import express from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import serverless from 'serverless-http';
import graphqlPlayground from 'graphql-playground-middleware-express';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from './schema.graphql';
import resolvers from './resolvers';

// We use Auth0 for validation, so we need to check that JWTs are valid.
const requireValidJWT = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

const app = express();

// Disable the GraphQL Playground in production; it doesn’t work well anyways.
const playground =
  process.env.NODE_ENV === 'development'
    ? graphqlPlayground({ endpoint: '/graphql' })
    : (_, res) => res.send(404);

// We have to set up the GraphQL Playground _before_ the auth check.
app.get('/playground', playground);

if (process.env.NODE_ENV !== 'development') {
  // In production, make sure a valid token is present before doing anything.
  app.use(requireValidJWT);

  // If there’s an error, send it as JSON so it’s useful in the GraphQL output.
  app.use((err, _, res, next) => {
    if (err) {
      res.json(err);
    }

    next();
  });
}

// Set up the GraphQL server.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  path: '/graphql'
});

server.applyMiddleware({ app });

// Turn the Express server into a lambda-compatible handler function.
const handler = serverless(app);

export const graphql = async (event, context) => {
  // Prevents Lambda cold starts
  if (event.source === 'serverless-plugin-warmup') {
    return callback(null, 'Lambda is warm!');
  }

  return await handler(event, context);
};
