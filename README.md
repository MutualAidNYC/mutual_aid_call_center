![Node.js CI](https://github.com/MutualAidNYC/twilio-server/workflows/Node.js%20CI/badge.svg)

# Mutual Aid NYC call center

Our call center uses two of Twilio's orchestration products, [Studio](https://www.twilio.com/studio)
and [TaskRouter](https://www.twilio.com/taskrouter). To support our Studio environment, we use
Twilio's [runtime for serverless functions](https://www.twilio.com/runtime). To support our
TaskRouter environment, we use a NodeJS server, presently on Heroku.

This repo supports both. We have three main root folders: src, test, and
twilio_serverless. src contains our NodeJS server. twilio_serverless contains
the serverless dev environment. Lastly test will contain the tests for both
halves.

- Readme for the [NodeJS Server](#NodeJS-Server)
- Readme for the [serverless runtime](#twilio-serverless-function-runtime)

## NodeJS Server

For the NodeJS server, the root of the project (not code) is the root of the
repo, you would `npm install` & `npm run` in the same folder as this readme.

A web api server for managing a Twilio IVR system and using airtable as a front end for configurations.

### setup for local development

1. Have NodeJS 12.16.x or greater installed
2. Copy `.env-sample` to `.env` (.env is git ignored)
   - `$ cp .env-sample .env`
3. Replace the values in your new `.env` file
   1. PORT: The port the server will listen on
   2. ACCOUNT_SID: Twilio account sid
   3. AUTH_TOKEN: Twilio auth token
   4. WORKSPACE_SID: Twilio taskrouter workspace sid
   5. PHONE_BASE: base id for a phone Airtable base
   6. AIRTABLE_VM_PHONE_BASE: base id for the VM base
   7. AIRTABLE_DELAY: delay in milliseconds between checking the airtable bases
   8. AIRTABLE_API_KEY: airtable api key
   9. TWILIO_TASKROUTER_VM_SID: SID of the worker that represents VM
   10. HOST_NAME: Your hostname for example www.google.com
   11. Optional variables, omittance = false
       1. ENABLE_VM: `true`or`false`, enables or disables voicemail recordings
       2. ENABLE_VM_ENGLISH_TRANSCRIPTION: `true` or `false` enables of disable transcription of english VMs
       3. ENABLE_ANSWER_MACHINE_DETECTION: `true` or `false` enables automatic answer machine detection (AMD) when calling volunteers
4. Run `$ npm install`

### NPM Scripts

1. `$ npm test` - Runs the mocha test suite
2. `$ npn run debug` - Used by VSCode
3. `$ npm start` - Starts a local server using nodemon which will re-run the project on every file save
4. `$ npm run coverage` - Starts an Istanbul test coverage report.
   1. Will generate a simplified report to console
   2. Will generate and open in browser a more detailed report
   3. Generated files are git ignored

### Debugging server locally using VSCode

1. A `launch.json` file is included with some settings to debug the server with
   VSCode
   1. Select 'Launch via NPM' in the debugger menu This will start a local server and attach it to vscode. Output will be in the debug console instead
      of terminal.
   2. Select 'Mocha Tests' to run the tests and attach it to the vscode debugger

### Running server locally in a simulated heroku environment

1. Ensure your .env file is created, heroku will load the environment variables
2. Run `heroku local`

## Twilio Serverless Function Runtime

For the serverless runtime, the root of the project is in `./twilio_serverless` relative to this
readme. You would `npm install` & `npm run` from that folder.

### Intent of the project

Twilio Studio Flows are great but their default abilities are not very fancy. If we need to have fancy customized features like a dynamic schedule (as we do) Twilio allows for serverless functions in their [runtime](https://www.twilio.com/docs/runtime) environment for customized behavior.

While twilio allows for functions to be written using their UI only website to create new [functions(need access to a Twilio account)](https://www.twilio.com/console/functions/manage), there is no version control to see revisions within Twilio. As such we have decided to use their [api (needs access to a Twilio account)](https://www.twilio.com/console/functions/api) to allow us to deploy from git repositories that do have revision history.

### Getting Started

1. Have nodeJS installed locally
2. Have [NVM](https://github.com/nvm-sh/nvm#installation-and-update 'Node Version Manager') installed locally and use node version of 10.17.0 while developing. Verify using the command `node -v`
3. Have NPM installed, verify with the command `npm -v`
4. Clone the repository to your local machine
5. Within the repo, run: `npm install`
6. In the root directory of the project, create a `.env` file
7. Request from an admin, API key and the secret
8. Create `.env` in the root of the project file

   1. Copy `.env-sample` to `.env` with the command: `$ cp .env-sample .env`
   2. Change the values in `.env` file, by getting the [Twilio API sid and auth_token](https://www.twilio.com/console/project/settings) or having an administrator provide it to you. This will NOT be committed to git for security as it is git ignored.
      - `ACCOUNT_SID`: The Account SID
      - `AUTH_TOKEN`: Auth Token
   3. If you add any addition key=value pairs, they will be uploaded to twilio as a environment variable within the twilio api serverless environment. It will also be available during local development.

### Instructions for local development

- Can only be used for functions that service webhooks, not for functions used in Twilio Studio

1. Start a locally running server with the command '\$ npm start`
   1. Do note any warnings like wrong version of NodeJS and resolve as needed.
2. Use a tool to expose your computer's local server using something like [ngrok](https://ngrok.com/)
3. Point twilio services i.e Phone numbers, TaskRouter or Studio Redirect Widgets to use the locally running server instead of the serverless functions or hosted private/public assets

- This will only work if you provide Twiml responses such as [TwiML™ for Programmable Voice](https://www.twilio.com/docs/voice/twiml)
- JSON responses such as `Twilio.Response()` don't appear to work for passing variables back into Studio flows

### Deployment instructions

#### deploy to dev environment

`$ npm run deploy`

#### deploy to production environment

`$ npm run deploy-dev`
