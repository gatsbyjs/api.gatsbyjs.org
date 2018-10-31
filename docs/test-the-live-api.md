# How to Test the Live API

In the event you want to send a request to the live API, you'll need to get a JWT from the store first. Here's how to do it.

## Step 1: Get your access token

To get your JWT token, visit <https://store.gatsbyjs.org> and log in with your GitHub account. Next, open Chrome Developer tools and follow these steps.

![Getting a JWT token in Chrome dev tools](images/jwt-token.png)

1.  Navigate to the "Application" tab
2.  Select `https://store.gatsbyjs.org` under "Local Storage" in the left-hand panel
3.  Select `access_token` in the main panel
4.  Copy the JWT token, which will be a value starting with `ey`

## Step 2: Send a cURL request

```bash
curl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  --data '{
      "query": "query($user:String!) { contributorInformation(githubUsername:$user) { totalContributions } }",
      "variables": {
        "user": "[GITHUB_USERNAME]"
      }
    }' \
  -X POST https://api.gatsbyjs.org/graphql
```
