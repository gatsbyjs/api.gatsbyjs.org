'use strict' 

const EasyGraphQLTester = require('easygraphql-tester')
const fs = require('fs')
const path = require('path')

const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.graphql'), 'utf8')

describe('Test GraphQL mutations', () => {
  let tester
  
  beforeAll(() => {
    tester = new EasyGraphQLTester(schema)
  })

  describe('Mutations', () => {
    test('Should pass a valid createContributor', () => {
      const mutation = `
        mutation CREATE_CONTRIBUTOR($input: CreateContributorInput) {
          createContributor(input: $input) {
            githubUsername
            email
            github {
              username
              contributionCount
              pullRequests {
                id
                title
                url
                number
                labels {
                  name
                  url
                }
              }
            }
            shopify {
              id
              codes {
                code
                used
              }
            }
          }
        }
      `
      tester.test(true, mutation, {
        githubUsername: 'demo',
        email: 'demo@demo.com',
        firstName: 'demo',
        acceptsMarketing: true
      })
    })

    test('Should pass a valid createContributor', () => {
      const mutation = `
        mutation {
          updateContributorTags(githubUsername: "demo") {
            githubUsername
            email
            github {
              username
              contributionCount
              pullRequests {
                id
                title
                url
                number
                labels {
                  name
                  url
                }
              }
            }
            shopify {
              id
              codes {
                code
                used
              }
            }
          }
        }
      `
      tester.test(true, mutation)
    })
  })
})
