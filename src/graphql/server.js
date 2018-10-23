import express from 'express';
import serverless from 'serverless-http';
import graphiql from 'graphql-playground-middleware-express';
import { ApolloServer, gql } from 'apollo-server-express';
import typeDefs from './schema.graphql';
import resolvers from './resolvers';

const app = express();

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
