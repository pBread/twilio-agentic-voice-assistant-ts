const callSidRe = /CA[a-f0-9]{32}/;
export function parseCallSid(idOrSid: string) {
  const match = idOrSid.match(callSidRe);
  if (!match) throw Error(`Unable to parse callSid from ${idOrSid}`);
  return match[0];
}

// each session's turns are stored in their own map
export function makeContextMapName(callSid: string) {
  const sid = parseCallSid(callSid);
  return `context-${sid}`;
}
export function isContextMapName(id: string) {
  return /^context-CA[a-f0-9]{32}$/.test(id);
}

// each session's turns are stored in their own map
export function makeTurnMapName(callSid: string) {
  const sid = parseCallSid(callSid);
  return `turns-${sid}`;
}
export function isTurnMapName(id: string) {
  return /^turns-CA[a-f0-9]{32}$/.test(id);
}

export const CALL_STREAM = "call-stream";
