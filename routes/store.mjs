import express from 'express';
import dotenv from 'dotenv';
import { isGitHubContributor } from '../lib/github.mjs';
import { createShopifyCustomer } from '../lib/shopify.mjs';
import { addMailChimpSubscriber } from '../lib/mailchimp.mjs';
import getLogger from '../lib/logger.mjs';

dotenv.config();

const logger = getLogger('routes/store');
const router = express.Router();

logger.verbose('adding /store routes...');

router.post(
  '/discount-code',
  async ({ body: { username, email, first_name, last_name } }, res) => {
    const user = { username, email, first_name, last_name };

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

    const customer = await createShopifyCustomer(user);
    const subscriber = await addMailChimpSubscriber(user);

    res.status(200).json({
      contributor,
      customer,
      subscribed: !!subscriber.data.id,
      discount_code: process.env.SHOPIFY_DISCOUNT_CODE
    });
  }
);

logger.verbose('added /store routes');

export default router;
