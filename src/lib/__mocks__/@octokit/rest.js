export const search = {
  issues: jest.fn(() => ({
    data: {
      total_count: 0,
      incomplete_results: false,
      items: []
    }
  }))
};

export const orgs = {
  addTeamMembership: jest.fn(() => ({
    data: {
      state: 'active'
    }
  })),
  getTeamMembership: jest.fn(() => ({
    status: 200
  }))
};

const Octokit = jest.fn().mockImplementation(() => ({
  authenticate: () => {},
  orgs,
  search
}));

export default Octokit;
