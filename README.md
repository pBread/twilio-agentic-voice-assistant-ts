# Twilio Agentic Voice Assistant

THIS IS NOT YET RELEASED. IT IS PUBLIC FOR INTERNAL TESTING REASONS

## Setup

### Step 0: Prerequisites

#### Obtain Twilio Flex Account

This repo demonstrates how to facilitate realtime communication between an AI assistant and a contact center agent. This is possible with many contact center applications. This one happens to use [Twilio Flex](https://www.twilio.com/en-us/flex).

You will need to create (recommended) or use an existing Twilio Flex Account. You can create a trial account here: [Create a new Flex account](https://www.twilio.com/console/projects/create?g=/console/flex/setup).

#### OpenAI Account and API Key

This project uses OpenAI's GPT models to power the AI assistant's conversations. You can get an API key here: [OpenAI API Keys](https://platform.openai.com/api-keys)

#### Ngrok Domain

To run this project locally, you need a publicly accessible URL for Twilio's webhooks. We use ngrok for this purpose. While you can use a dynamic ngrok URL, we recommend using their free static domains to avoid constantly updating webhook URLs.

1. Get your free static domain: https://ngrok.com/blog-post/free-static-domains-ngrok-users
2. Make note of your domain (e.g., your-domain.ngrok-free.app) for the `HOSTNAME` environment variable

### Step 1: Initial Setup

```bash
# install deps
npm install
cd ui && npm install
cd ..

# setup .env files
cp .env.example .env
cp ui/.env.example ui/.env
```

### Step 2: Populate Required Env Variables

```bash
# Your ngrok or server hostname, e.g. 123.ngrok.app
# nGrok provides free static domains: https://ngrok.com/blog-post/free-static-domains-ngrok-users
HOSTNAME=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN= # The Twilio auth token is only required to run setup script and it's only used to generate TWILIO_API_KEY & TWILIO_API_SECRET. If you provide the key/secret, then the auth token is is not required.
OPENAI_API_KEY=
```

### Step 3: Run Setup Script

This application comes with a setup script that automatically configures your Twilio account. The script is intelligent - it only creates resources when needed, checking for undefined environment variables before taking action. You can set specific variables manually and let the script handle the rest.

```bash
npm run setup
```

Or, you can run the setup script for each individually. Note, you must have the `TWILIO_API_KEY` and `TWILIO_API_SECRET` variables defined to run most of these.

```bash
npm run setup:apikey
npm run setup:sync
npm run setup:info
npm run setup:phone
npm run setup:vi
npm run setup:flex
```

### Step 4: Start

Open 2-3 terminal windows:

- 2 required: one for the server, one for the nGrok tunnel
- 1 optional (but recommended): for the UI

#### Terminal 1: Server

```bash
npm run dev
```

#### Terminal 2: nGrok

```bash
npm run grok
```

Note: The script uses the `HOSTNAME` env var as the ngrok private domain.

#### Terminal 3: UI

```bash
npm run ui
```

### Step 5: Try It

- The UI is running on http://localhost:3002/
- [Open your Flex agent view](https://www.twilio.com/console/flex/service-login) to respond to the bot when it has questions.

  - Don't forget to set your status to "Available"
    <img src="/docs/flex-set-availability.png">

- Then call the `DEFAULT_TWILIO_NUMBER` in your variables

### What the Setup Script Does

Here's what the script does:

- Create [Twilio API Key & Token](https://www.twilio.com/docs/iam/api-keys)
- Create [Twilio Sync Service](https://www.twilio.com/docs/sync)
- Configure Sync Service webhook url
- Populate the personalization env vars: `DEVELOPERS_EMAIL`, `DEVELOPERS_PHONE_NUMBER`, `DEVELOPERS_FIRST_NAME`, `DEVELOPERS_LAST_NAME`
  - These are only used to demonstrate personalization.
- Purchase a Twilio Phone Number, if `DEFAULT_TWILIO_NUMBER` is undefined
- Configure the [voice webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks) for the `DEFAULT_TWILIO_NUMBER` to allow incoming calls
- Create a Voice Intelligence service, if `TWILIO_VOICE_INTELLIGENCE_SVC_SID` is undefined
- Configure Voice Intelligence with operators
