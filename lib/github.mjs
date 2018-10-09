import Octokit from '@octokit/rest';
import dotenv from 'dotenv';
import getLogger from './logger.mjs';

dotenv.config();

const logger = getLogger('lib/github');
const github = new Octokit();
const GITHUB_ORG = process.env.GITHUB_ORG;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_TEAM_ID = process.env.GITHUB_TEAM_ID;

// Check if the given user has a merged PR in the GitHub org.
export const isGitHubContributor = async username => {
  logger.verbose('loading merged PRs from @%s', username);
  // const { data: { total_count = 0 } = {} } = await github.search.issues({
  const response = await github.search.issues({
    q: `org:${GITHUB_ORG}+author:${username}+type:pr+is:merged`
  });
  const total_count = response.data.total_count;
  logger.verbose('@%s has made %d contributions', username, total_count);

  return total_count > 0;
};

export const inviteIfNecessary = async username => {
  logger.verbose('checking if @%s was already invited to this team', username);

  // Make sure we can make authenticated requests to the GitHub API.
  github.authenticate({ type: 'token', token: GITHUB_TOKEN });
  const options = { team_id: GITHUB_TEAM_ID, username };

  try {
    const response = await github.orgs.getTeamMembership(options);

    if (response.status === 200) {
      logger.verbose('@%s has already been invited to this team', username);
      return;
    }
  } catch (err) {
    // If the user hasn’t been invited, Octokit throws with a 404.
    if (err.code === 404) {
      const invite = await github.orgs.addTeamMembership(options);

      if (invite.data.state === 'active') {
        logger.verbose('@%s is already a member of this team', username);
      } else {
        logger.verbose('@%s was invited to join the team', username);
      }

      return;
    }

    // If we get here, something _actually_ went wrong.
    logger.error('There was an error inviting @%s to the team', username);
    logger.error(err);
  }
};
