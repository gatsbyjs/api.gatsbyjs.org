import express from 'express';
import cors from 'cors';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';
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

app.use(cors());

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
  playground: process.env.NODE_ENV === 'development'
});

server.applyMiddleware({ app, cors: true });

export default app;
