import express from 'express';
import serverless from 'serverless-http';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from './public-schema.graphql';
import resolvers from './public-resolvers';

const app = express();

// Set up the GraphQL server.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true
});

server.applyMiddleware({ app, cors: true, path: '/public' });

// Turn the Express server into a lambda-compatible handler function.
const handler = serverless(app);

export const graphql = async (event, context) => {
  // Prevents Lambda cold starts
  if (event.source === 'serverless-plugin-warmup') {
    return 'Lambda is warm!';
  }

  return await handler(event, context);
};
