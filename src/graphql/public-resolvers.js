import getLogger from '../lib/logger';
import { prisma } from '../prisma-client';

const logger = getLogger('graphql/public-resolvers');

export default {
  Query: {
    ping: () => 'pong'
  },
  Mutation: {
    submitFeedback: async (_, { input }) => {
      logger.info(`New feedback submitted for ${input.originUrl}`);
      const result = await prisma.createFeedback({
        comment: input.comment,
        rating: input.rating,
        originUrl: input.originUrl
      });

      if (!result.id) {
        return 'error';
      }

      return 'success';
    }
  }
};
