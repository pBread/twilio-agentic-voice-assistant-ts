import { createRoundRobinPicker } from "../lib/round-robin-picker.js";
import { interpolateTemplate } from "../lib/template.js";
import type { SessionContext } from "../shared/session/context.js";

const picker = createRoundRobinPicker();

export const greetings = [
  "You've reached {{company.name}}. A live agent will be available in approximately {{contactCenter.waitTime}} minutes. Can you tell me why you're calling so I can pass it along to the agent?",
  "Hello you've reached {{company.name}}. It will be approximately {{contactCenter.waitTime}} minutes to speak with a live agent. Can I gather a few details from you while we wait?",
];

export function getGreeting(context: Partial<SessionContext>) {
  const template = picker(greetings);
  return interpolateTemplate(template, context);
}
