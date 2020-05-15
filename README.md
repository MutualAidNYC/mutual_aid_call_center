# twilio-callcenter-server

![Node.js CI](https://github.com/MutualAidNYC/twilio-server/workflows/Node.js%20CI/badge.svg)

A web api server for managing a Twilio IVR system and using airtable as a front end for configurations.

# setup for local development

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
   9. TWILIO_TASKROUTER_VM_SID: SID of the woker that represents VM
   10. HOST_NAME: Your hostname for example www.google.com
4. Run `$ npm install`

# NPM Scripts

1. `$ npm test` - Runs the mocha test suite
2. `$ npn run debug` - Used by VSCode
3. `$ npm start` - Starts a local server using nodemon which will re-run the project on every file save
4. `$ npm run coverage` - Starts an Istanbul test coverage report.
   1. Will generate a simplifed report to console
   2. Will generate and open in browser a more detailed report
   3. Generated files are git ignored

# Debugging server locally using VSCode

1. A `launch.json` file is included with some settings to debug the server withi
   VSCode
   1. Select 'Launch via NPM' in the debugger menu This will start a local server and attach it to vscode. Output will be in the debug console instead
      of terminal.
   2. Select 'Mocha Tests' to run the tests and attach it to the vscode debugger

# Running server locally in a simulated heroku enviroment

1. Ensure your .env file is created, heroku will load the enviroment variables
2. Run `heroku local`
