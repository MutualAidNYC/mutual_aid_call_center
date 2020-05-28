# Mutual Aid Call Center

## Intent of the project

Twilio Studio Flows are great but their default abilities are not very fancy. If we need to have fancy customized features like a dynamic schedule (as we do) Twilio allows for serverless functions in their [runtime](https://www.twilio.com/docs/runtime) enviroment for customized behavior.

While twilio allows for functions to be written using their UI only website to create new [functions(need access to a Twilo account)](https://www.twilio.com/console/functions/manage), there is no version control to see revisions within Twilio. As such we have decided to use their [api (needs acces to a Twilio account)](https://www.twilio.com/console/functions/api) to allow us to deploy from git repositories that do have revision history.

## Getting Started

1. Have nodeJS installed locally
2. Have [NVM](https://github.com/nvm-sh/nvm#installation-and-update "Node Version Manager") installed locally and use node version of 10.17.0 while developing. Verify using the comand `node -v`
3. Have NPM installed, verify with the command `npm -v`
4. Clone the repository to your local machine
5. Within the repo, run: `npm install`
6. In the root directory of the project, create a `.env` file
7. Request from an admin, API key and the secret
8. Create `.env` in the root of the project file

   1. Copy `.env-sample` to `.env` with the command: `$ cp .env-sample .env`
   2. Change the values in `.env` file, by getting the [Twilio API sid and auth_token](https://www.twilio.com/console/project/settings) or having an administrator provide it to you. This will NOT be commited to git for security as it is git ignored.
      - `ACCOUNT_SID`: The Account SID
      - `AUTH_TOKEN`: Auth Token
   3. If you add any addition key=value pairs, they will be uploaded to twilio as a enviroment variable within the twilio api serverless enviroment. It will also be available during local development.

## Instructions for local development

- Can only be used for functions that service webhooks, not for functions used in Twilio Studio

1. Start a locally running server with the command '\$ npm start`
   1. Do note any warnings like wrong version of NodeJS and resolve as needed.
2. Use a tool to expose your computer's local server using something like [ngrok](https://ngrok.com/)
3. Point twilio services i.e Phone numbers, TaskRouter or Studio Reidrect Widgets to use the locally running server instead of the serverless functions or hosted private/public assets

- This will only work if you provide Twiml responses such as [TwiML™ for Programmable Voice](https://www.twilio.com/docs/voice/twiml)
- JSON responses such as `Twilio.Response()` don't appear to work for passing variables back into Studio flows

## Deployment instructions

### deploy to dev enviroment

`$ npm run deploy`

### deploy to production enviroment

`$ npm run deploy-dev`
