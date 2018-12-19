import Octokit from '@octokit/rest';
import getLogger from './logger';

const { GITHUB_ORG, GITHUB_TOKEN, GITHUB_TEAM_ID } = process.env;

const logger = getLogger('lib/github');
const github = new Octokit();

export const getContributorInfo = async username => {
  logger.verbose('loading merged PRs from @%s', username);
  const response = await github.search.issues({
    q: `org:${GITHUB_ORG}+author:${username}+type:pr+is:merged`
  });

  return {
    totalContributions: response.data.total_count,
    pullRequests: response.data.items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.html_url,
      number: item.number,
      labels: item.labels.map(({ name, url }) => ({ name, url }))
    }))
  };
};

export const getOpenIssuesByLabel = async label => {
  logger.verbose('loading issues with the label %s', label);

  const response = await github.search.issues({
    q: `org:gatsbyjs type:issue label:"${label}" is:open`,
    sort: 'updated',
    order: 'desc'
  });

  return {
    totalIssues: response.data.total_count,
    issues: response.data.items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.html_url,
      number: item.number,
      labels: item.labels.map(({ name, url }) => ({ name, url }))
    }))
  };
};

// Check if the given user has a merged PR in the GitHub org.
export const isGitHubContributor = async username => {
  const response = await getContributorInfo(username);

  return response.totalContributions > 0;
};

export const inviteIfNecessary = async username => {
  logger.verbose('checking if @%s was already invited to this team', username);

  // Make sure we can make authenticated requests to the GitHub API.
  github.authenticate({ type: 'token', token: GITHUB_TOKEN });
  const options = { team_id: GITHUB_TEAM_ID, username };

  try {
    const response = await github.orgs.getTeamMembership(options);

    if (response.status !== 200) {
      logger.error('The status code returned was %d', response.status);
      throw new Error('There was a problem sending data to GitHub’s API.');
    }

    logger.verbose('@%s has already been invited to this team', username);
    return true;
  } catch (err) {
    // If the user hasn’t been invited, Octokit throws with a 404.
    if (err.code === 404) {
      await github.orgs.addTeamMembership(options);

      return true;
    }

    // If we get here, something _actually_ went wrong.
    logger.error('There was an error inviting @%s to the team', username);
    logger.error(err);
    return false;
  }
};
