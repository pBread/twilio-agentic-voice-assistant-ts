import Twilio from "twilio";
import { fileURLToPath } from "url";
import { closeRL, EnvManager, makeFriendlyName, sLog } from "./helpers.js";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async () => {
    if (!isMainModule) return;
    const env = new EnvManager(".env");
    await voiceIntelligenceSetupScripts(env);

    closeRL();
  })();
}

export async function voiceIntelligenceSetupScripts(env: EnvManager) {
  sLog.title("Voice Intelligence Setup Script");

  env.assertAccountSid();
  env.assertApiKeys();
  env.assertHostName();

  await checkVoiceIntelligence(env);
  await checkVoiceIntelligenceOperators(env);
}

async function checkVoiceIntelligence(env: EnvManager) {
  if (env.vars.TWILIO_VOICE_INTELLIGENCE_SVC_SID)
    return sLog.info(`voice intelligence sid defined`);

  try {
    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });

    sLog.info("creating voice intelligence service");

    const name = makeFriendlyName(env);

    const viService = await twlo.intelligence.v2.services.create({
      autoRedaction: true,
      autoTranscribe: true,
      friendlyName: name,
      uniqueName: name,
      webhookHttpMethod: "POST",
      webhookUrl: `https://${env.vars.HOSTNAME}/voice-intelligence`,
    });

    sLog.success(
      `successfully created voice intelligence service: ${viService.sid}`,
    );

    env.vars.TWILIO_VOICE_INTELLIGENCE_SVC_SID = viService.sid;
    env.save();
  } catch (error) {
    sLog.error("error creating voice intelligence service. error: ", error);
    throw error;
  }
}

async function checkVoiceIntelligenceOperators(env: EnvManager) {
  sLog.info("checking voice intelligence operators");
  try {
    if (!env.vars.TWILIO_VOICE_INTELLIGENCE_SVC_SID)
      throw Error("TWILIO_VOICE_INTELLIGENCE_SVC_SID is undefined");

    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });

    const viService = await twlo.intelligence.v2
      .services(env.vars.TWILIO_VOICE_INTELLIGENCE_SVC_SID)
      .fetch();

    const webhookUrl = `https://${env.vars.HOSTNAME}/voice-intelligence`;

    if (
      viService.webhookUrl !== webhookUrl ||
      viService.webhookHttpMethod !== "POST"
    ) {
      sLog.info(
        `updating voice intelligence webhook to https://${env.vars.HOSTNAME}/voice-intelligence`,
      );

      await twlo.intelligence.v2
        .services(env.vars.TWILIO_VOICE_INTELLIGENCE_SVC_SID)
        .update({ webhookUrl, webhookHttpMethod: "POST" });

      sLog.success(
        `updated voice intelligence webhook to https://${env.vars.HOSTNAME}/voice-intelligence`,
      );
    }

    const prebuiltOperators =
      await twlo.intelligence.v2.prebuiltOperators.list();

    const operatorsToAdd = prebuiltOperators
      .filter((operator) =>
        [
          "CallTransfer",
          "EscalationRequest",
          "SentimentAnalysis",
          "Summarization",
        ]
          .map((item) => item.toLowerCase())
          .includes(operator.operatorType.toLowerCase()),
      )
      .filter(
        (operator) =>
          !viService.readOnlyAttachedOperatorSids.includes(operator.sid),
      );

    if (operatorsToAdd.length) {
      sLog.info(`configuring voice intelligence operators`);
      for (const operator of operatorsToAdd) {
        await twlo.intelligence.v2
          .operatorAttachment(viService.sid, operator.sid)
          .create();
      }

      sLog.success(`configured voice intelligence operators`);
    }
  } catch (error) {
    sLog.error("error creating voice intelligence service. error: ", error);
    throw error;
  }
}
