import { fileURLToPath } from "url";
import { askQuestion, closeRL, EnvManager, sLog } from "./helpers.js";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async () => {
    const env = new EnvManager(".env");
    await infoSetupScript(env);

    closeRL();
  })();
}

export async function infoSetupScript(env: EnvManager) {
  sLog.title("Info Setup Script");

  await gatherDeveloperDetails(env);
}

async function gatherDeveloperDetails(env: EnvManager) {
  if (!env.vars.DEVELOPERS_FIRST_NAME) {
    let firstName = await askQuestion(
      "(optional) What is the first name of your demo persona?",
    );
    firstName = firstName?.trim();
    if (firstName.length > 0) env.vars.DEVELOPERS_FIRST_NAME = firstName;
  }

  if (env.vars.DEVELOPERS_FIRST_NAME && !env.vars.DEVELOPERS_LAST_NAME) {
    let lastName = await askQuestion(
      "(optional) What is the last name of your demo persona?",
    );
    lastName = lastName?.trim();
    if (lastName.length > 0) env.vars.DEVELOPERS_LAST_NAME = lastName;
  }

  if (!env.vars.DEVELOPERS_PHONE_NUMBER) {
    let phone = await askQuestion(
      "What is your phone number? This is used to populate a demo user record. It's required to enable the AI agent to send you SMS. IMPORTANT: You must use E164 format, i.e. +18885550001",
    );
    phone = phone?.trim();
    if (phone.length > 0) env.vars.DEVELOPERS_PHONE_NUMBER = phone;
  }

  if (!env.vars.DEVELOPERS_EMAIL) {
    let email = await askQuestion(
      "What is your email address? This is used to populate the user record. It's required to enable the AI agent to send you emails.",
    );
    email = email?.trim();
    if (email.length > 0) env.vars.DEVELOPERS_EMAIL = email;
  }

  if (!env.isChanged()) sLog.info("no changes made to info");

  await env.save();
}
