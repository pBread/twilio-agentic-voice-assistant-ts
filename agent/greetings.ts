import log from "../lib/logger.js";
import { interpolateTemplate } from "../lib/template.js";
import { SessionContext } from "../shared/session/context.js";

const picker = createPhrasePicker();

export const greetings = [
  "You've reached Owl Shopping. A live agent will be available in approximately {{contactCenter.waitTime}} minutes. Can you tell me why you're calling so I can pass it along to the agent?",
  "Hello you've reached Owl Shopping. It will be approximately {{contactCenter.waitTime}} minutes to speak with a live agent. Can I gather a few details from you while we wait?",
];

export function getGreeting(context: Partial<SessionContext>) {
  const template = picker(greetings);
  return interpolateTemplate(template, context);
}

function createPhrasePicker() {
  let phraseCounters: { [key: string]: number } = {};

  return function pickLeastUsedPhrase(phrases: string[]): string {
    const minUsage = Math.min(
      ...phrases.map((phrase) => phraseCounters[phrase] ?? 0),
    );

    const leastUsedPhrases = phrases.filter(
      (phrase) => (phraseCounters[phrase] ?? 0) === minUsage,
    );

    const selected =
      leastUsedPhrases[Math.floor(Math.random() * leastUsedPhrases.length)];

    phraseCounters[selected] = (phraseCounters[selected] ?? 0) + 1;

    return selected;
  };
}
