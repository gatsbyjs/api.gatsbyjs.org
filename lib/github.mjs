import Octokit from '@octokit/rest';
import dotenv from 'dotenv';
import getLogger from './logger.mjs';

dotenv.config();

const logger = getLogger('lib/github');
const github = new Octokit();
const GITHUB_ORG = process.env.GITHUB_ORG;

// Check if the given user has a merged PR in the GitHub org.
export const isGitHubContributor = async username => {
  logger.verbose('loading merged PRs from @%s', username);
  logger.verbose(Object.keys(github));
  // const { data: { total_count = 0 } = {} } = await github.search.issues({
  const response = await github.search.issues({
    q: `org:${GITHUB_ORG}+author:${username}+type:pr+is:merged`
  });
  logger.verbose(JSON.stringify(response, null, 2));
  const total_count = response.data.total_count;
  logger.verbose('@%s has made %d contributions', username, total_count);

  return total_count > 0;
};
