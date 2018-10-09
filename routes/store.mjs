import express from 'express';
import dotenv from 'dotenv';
import { isGitHubContributor, inviteIfNecessary } from '../lib/github.mjs';
import { createShopifyCustomer } from '../lib/shopify.mjs';
import getLogger from '../lib/logger.mjs';

dotenv.config();

const logger = getLogger('routes/store');
const router = express.Router();

logger.verbose('adding /store routes...');

router.post(
  '/discount-code',
  async ({ body: { username, email, first_name, subscribe } }, res) => {
    const user = { username, email, first_name, subscribe };

    logger.verbose('requesting a discount code for @%s', username);

    const contributor = isGitHubContributor(username);
    logger.verbose(
      `@%s %s a contributor.`,
      username,
      contributor ? 'is' : 'is not'
    );

    if (!contributor) {
      const org = process.env.GITHUB_ORG;
      res.status(200).json({
        error: `Whoops! @${username} has not contributed to ${org} on GitHub.`
      });
      return;
    }

    await inviteIfNecessary(username);
    const customer = await createShopifyCustomer(user);

    res.status(200).json({
      contributor,
      customer,
      subscribed: subscribe,
      discount_code: process.env.SHOPIFY_DISCOUNT_CODE
    });
  }
);

logger.verbose('added /store routes');

export default router;
