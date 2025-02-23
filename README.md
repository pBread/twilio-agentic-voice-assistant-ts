# Twilio Agentic Voice Bot - TS

## Setup

```bash
# install deps
npm install
cd ui && npm install
cd ..

# setup .env files
cp .env.example .env
cp ui/.env.example ui/.env
```

### (Optional) Twilio Flex Account

The Voice Bot is empowered to transfer calls to a live human agent and reach out to a human agent with questions. This repository uses [Twilio Flex](https://www.twilio.com/en-us/flex), but other contact centers or no contact center at all are also supported by Twilio.

You will need a Twilio Flex Account to demonstrate these features: [Create a new Flex account](https://www.twilio.com/console/projects/create?g=/console/flex/setup).

### Setup Script

This application comes with a setup script that will configure your Twilio account completely. It is designed to only create things when the corresponding environment variables are undefined. In other words, you can define the variables that you want to and leave the rest to the script.

Here's what the script does:

- Create [Twilio API Key & Token](https://www.twilio.com/docs/iam/api-keys)
- Create [Twilio Sync Service](https://www.twilio.com/docs/sync)
- Purchase a Twilio Phone Number, if `DEFAULT_TWILIO_NUMBER` is undefined
- Configure the [voice webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks) for the `DEFAULT_TWILIO_NUMBER` to allow incoming calls
- Populate the personalization env vars: `DEVELOPERS_PHONE_NUMBER`, `DEVELOPERS_FIRST_NAME`, `DEVELOPERS_LAST_NAME`

#### Populate Required Env Variables

The .env.example

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
