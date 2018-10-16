import Octokit, { search } from '@octokit/rest';
import { isGitHubContributor } from '../github.mjs';
import mockIssues from '../../__fixtures__/github-issues.json';

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
});
