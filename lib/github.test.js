import { isGitHubContributor } from './github.mjs';
import issues from '../fixtures/github-issues.json';

let mockIssues = issues;

jest.mock('@octokit/rest', () => {
  return jest.fn().mockImplementation(() => ({
    search: {
      issues: () => mockIssues
    }
  }));
});

describe('lib/github', () => {
  describe('isGitHubContributor()', () => {
    afterEach(() => {
      mockIssues = {
        data: { total_count: 0 }
      };
    });

    test('returns true when the user has merged PRs in the org', async () => {
      const val = await isGitHubContributor('jlengstorf');
      expect(val).toBe(true);
    });

    test('returns false when the user has NOT merged any PRs in the org', async () => {
      const val = await isGitHubContributor('jlengstorf');
      expect(val).toBe(false);
    });
  });
});
