'use strict' 

const EasyGraphQLTester = require('easygraphql-tester')
const fs = require('fs')
const path = require('path')

const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.graphql'), 'utf8')

describe('Test GraphQL queries', () => {
  let tester
  
  beforeAll(() => {
    tester = new EasyGraphQLTester(schema)
  })

  describe('Queries', () => {
    test('Get all fields on getContributor', () => {
      const getContributor = `
        {
          getContributor(githubUsername: "1234") {
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

      tester.test(true, getContributor)
    })

    test('Get all fields on openIssues', () => {
      const query = `
        {
          openIssues(label: "test") {
            totalIssues
            issues {
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
        }
      `

      tester.test(true, query)
    })
  })
})
