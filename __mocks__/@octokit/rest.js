export const search = {
  issues: jest.fn(() => ({
    data: {
      total_count: 0,
      incomplete_results: false,
      items: []
    }
  }))
};

const Octokit = jest.fn().mockImplementation(() => ({ search }));

export default Octokit;
