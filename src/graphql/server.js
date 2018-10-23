import express from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import serverless from 'serverless-http';
import graphiql from 'graphql-playground-middleware-express';
import { ApolloServer, gql } from 'apollo-server-express';
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

// Make sure a valid token is present before doing anything else.
app.use(requireValidJWT);

// If there’s an auth error, send it as JSON so it’s useful in the GraphQL output.
app.use((err, _, res, next) => {
  if (err) {
    res.json(err);
  }

  next();
});

// Set up the GraphQL server.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  path: '/graphql'
});

server.applyMiddleware({ app });

app.get('/playground', graphiql({ endpoint: '/graphql' }));

const handler = serverless(app);

export const graphql = async (event, context) => {
  return await handler(event, context);
};
