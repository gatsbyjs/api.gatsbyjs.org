import Octokit, { search } from '@octokit/rest';
import { isGitHubContributor, inviteIfNecessary } from '../github';
import mockIssues from '../__fixtures__/github-issues.json';
import { orgs } from '../__mocks__/@octokit/rest';

describe('lib/github', () => {
  beforeEach(() => {
    Octokit.mockClear();
    search.issues.mockClear();
  });

  describe('isGitHubContributor()', () => {
    test('returns true when the user has merged PRs in the org', async () => {
      search.issues.mockReturnValueOnce(mockIssues);

      const val = await isGitHubContributor('jlengstorf');
      expect(val).toBe(true);
    });

    test('returns false when the user has NOT merged any PRs in the org', async () => {
      const val = await isGitHubContributor('jlengstorf');
      expect(val).toBe(false);
    });
  });

  describe('inviteIfNecessary()', () => {
    test('invites a user who hasn’t already been invited', async () => {
      const result = await inviteIfNecessary('jlengstorf');
      expect(result).toBe(true);
    });

    test('doesn’t explode if there’s a server error', async () => {
      orgs.getTeamMembership.mockReturnValueOnce({ status: 500 });
      const result = await inviteIfNecessary('jlengstorf');
      expect(result).toBe(false);
    });

    test('handles the error when someone has already been invited', async () => {
      orgs.getTeamMembership.mockRejectedValueOnce({ code: 404 });
      const result = await inviteIfNecessary('jlengstorf');
      expect(result).toBe(true);
    });

    test('invites the user if they’re not part of the org already', async () => {
      orgs.getTeamMembership.mockRejectedValueOnce({ code: 404 });
      orgs.addTeamMembership.mockReturnValueOnce({
        data: { status: 'pending' }
      });

      const result = await inviteIfNecessary('jlengstorf');
      expect(result).toBe(true);
    });
  });
});
