import express from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from './public-schema.graphql';
import resolvers from './public-resolvers';

const app = express();

app.use(cors());

// Set up the GraphQL server.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true
});

server.applyMiddleware({ app, cors: true });

export default app;
