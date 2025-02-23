# Twilio Agentic Voice Bot - TS

## Setup

### Step 1:

```bash
# install deps
npm install
cd ui && npm install
cd ..

# setup .env files
cp .env.example .env
cp ui/.env.example ui/.env
```

### Step 2 Obtain A Twilio Flex Account

The Voice Bot is empowered to transfer calls to a live human agent and reach out to a human agent with questions. This repository uses [Twilio Flex](https://www.twilio.com/en-us/flex), but other contact centers or no contact center at all are also supported by Twilio.

You will need a Twilio Flex Account to demonstrate these features: [Create a new Flex account](https://www.twilio.com/console/projects/create?g=/console/flex/setup).

### Step 3: Populate Env Variables

This application comes with a setup script that will configure your Twilio account completely. It is designed to only create things when the corresponding environment variables are undefined. In other words, you can define the variables that you want to and leave the rest to the script.

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

#### Required Env Variables

```bash
HOSTNAME= # Your ngrok or server hostname, e.g. 123.ngrok.app¸
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN= # The Twilio auth token is only required to run setup script and it's only used to generate TWILIO_API_KEY & TWILIO_API_SECRET. If you provide the key/secret, then the auth token is is not required.
OPENAI_API_KEY=
```

### Step 4: Setting Up Flex

The Flex setup script will

#### Required For Flex Transfer

```bash
FLEX_WORKFLOW_SID=WWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Required for Flex Agent Consultation

```bash
FLEX_WORKSPACE_SID=WSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLEX_WORKFLOW_SID=WWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLEX_QUEUE_SID=WQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLEX_WORKER_SID=WKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CONVERSATIONS_SVC_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Run Setup Script(s)

You can either run the main setup script and it everything will be setup for you.

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

## How the App Works

- Designed to align to multi-server implementation: Agent, Completion Server, Integration Server, Modules
- UI is designed for debugging
- Relationship between classes: store, conscious-loop, resolver
- Sync

## Guides

- Adding LLM providers
- Configuring the demo
- adding tools
- adjusting prompts
