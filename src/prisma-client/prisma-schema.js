module.exports = {
        typeDefs: /* GraphQL */ `type AggregateContributor {
  count: Int!
}

type BatchPayload {
  count: Long!
}

type Contributor {
  email: String
  githubUsername: String!
  shopifyCustomerID: String
}

type ContributorConnection {
  pageInfo: PageInfo!
  edges: [ContributorEdge]!
  aggregate: AggregateContributor!
}

input ContributorCreateInput {
  email: String
  githubUsername: String!
  shopifyCustomerID: String
}

type ContributorEdge {
  node: Contributor!
  cursor: String!
}

enum ContributorOrderByInput {
  email_ASC
  email_DESC
  githubUsername_ASC
  githubUsername_DESC
  shopifyCustomerID_ASC
  shopifyCustomerID_DESC
  id_ASC
  id_DESC
  createdAt_ASC
  createdAt_DESC
  updatedAt_ASC
  updatedAt_DESC
}

type ContributorPreviousValues {
  email: String
  githubUsername: String!
  shopifyCustomerID: String
}

type ContributorSubscriptionPayload {
  mutation: MutationType!
  node: Contributor
  updatedFields: [String!]
  previousValues: ContributorPreviousValues
}

input ContributorSubscriptionWhereInput {
  mutation_in: [MutationType!]
  updatedFields_contains: String
  updatedFields_contains_every: [String!]
  updatedFields_contains_some: [String!]
  node: ContributorWhereInput
  AND: [ContributorSubscriptionWhereInput!]
  OR: [ContributorSubscriptionWhereInput!]
  NOT: [ContributorSubscriptionWhereInput!]
}

input ContributorUpdateInput {
  email: String
  githubUsername: String
  shopifyCustomerID: String
}

input ContributorUpdateManyMutationInput {
  email: String
  githubUsername: String
  shopifyCustomerID: String
}

input ContributorWhereInput {
  email: String
  email_not: String
  email_in: [String!]
  email_not_in: [String!]
  email_lt: String
  email_lte: String
  email_gt: String
  email_gte: String
  email_contains: String
  email_not_contains: String
  email_starts_with: String
  email_not_starts_with: String
  email_ends_with: String
  email_not_ends_with: String
  githubUsername: String
  githubUsername_not: String
  githubUsername_in: [String!]
  githubUsername_not_in: [String!]
  githubUsername_lt: String
  githubUsername_lte: String
  githubUsername_gt: String
  githubUsername_gte: String
  githubUsername_contains: String
  githubUsername_not_contains: String
  githubUsername_starts_with: String
  githubUsername_not_starts_with: String
  githubUsername_ends_with: String
  githubUsername_not_ends_with: String
  shopifyCustomerID: String
  shopifyCustomerID_not: String
  shopifyCustomerID_in: [String!]
  shopifyCustomerID_not_in: [String!]
  shopifyCustomerID_lt: String
  shopifyCustomerID_lte: String
  shopifyCustomerID_gt: String
  shopifyCustomerID_gte: String
  shopifyCustomerID_contains: String
  shopifyCustomerID_not_contains: String
  shopifyCustomerID_starts_with: String
  shopifyCustomerID_not_starts_with: String
  shopifyCustomerID_ends_with: String
  shopifyCustomerID_not_ends_with: String
  AND: [ContributorWhereInput!]
  OR: [ContributorWhereInput!]
  NOT: [ContributorWhereInput!]
}

input ContributorWhereUniqueInput {
  email: String
  githubUsername: String
  shopifyCustomerID: String
}

scalar Long

type Mutation {
  createContributor(data: ContributorCreateInput!): Contributor!
  updateContributor(data: ContributorUpdateInput!, where: ContributorWhereUniqueInput!): Contributor
  updateManyContributors(data: ContributorUpdateManyMutationInput!, where: ContributorWhereInput): BatchPayload!
  upsertContributor(where: ContributorWhereUniqueInput!, create: ContributorCreateInput!, update: ContributorUpdateInput!): Contributor!
  deleteContributor(where: ContributorWhereUniqueInput!): Contributor
  deleteManyContributors(where: ContributorWhereInput): BatchPayload!
}

enum MutationType {
  CREATED
  UPDATED
  DELETED
}

interface Node {
  id: ID!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  contributor(where: ContributorWhereUniqueInput!): Contributor
  contributors(where: ContributorWhereInput, orderBy: ContributorOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [Contributor]!
  contributorsConnection(where: ContributorWhereInput, orderBy: ContributorOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): ContributorConnection!
  node(id: ID!): Node
}

type Subscription {
  contributor(where: ContributorSubscriptionWhereInput): ContributorSubscriptionPayload
}
`
      }
    