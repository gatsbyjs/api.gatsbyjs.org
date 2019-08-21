import getLogger from '../lib/logger';
import { prisma } from '../prisma-client';

const logger = getLogger('graphql/public-resolvers');

export default {
  Query: {
    ping: () => 'pong',
    getFeedback: async () => {
      const result = await prisma.feedbacks({
        where: {
          AND: {
            originUrl_contains: 'gatsbyjs.org'
          }
        },
        orderBy: 'originUrl_ASC'
      });

      return result;
    }
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
  },
  Feedback: {
    date: source => source.createdAt
  }
};
