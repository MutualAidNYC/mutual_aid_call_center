# Mutual Aid Call Center

## Setup

1. Have nodeJS installed locally
2. Have NVM installed locally with node version of 8.10.0
3. Have NPM installed
4. Clone the repository to your local machine
5. Within the repo, run `npm install`
6. In the root directory of the project, create a `.env` file
7. Request from an admin, API key and the secret
8. Create `.env` in the root of the project file
   1. Add the following 2 lines to the `.env` file

```
ACCOUNT_SID=replace-me-with-provided-sid
AUTH_TOKEN=replace-me-with-the-secret-key
```

2.  Replace the right-side of each line with the values provided by an administrator - please note this will not be uploaded to github for security purposes.

## Deployment insttuctions

### deploy to dev enviroment

`npm run deploy`

### deploy to production enviroment

`npm run deploy-dev`
