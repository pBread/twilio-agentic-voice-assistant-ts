const callSidRe = /CA[a-f0-9]{32}/;
function parseCallSid(idOrSid: string) {
  const match = idOrSid.match(callSidRe);
  if (!match) throw Error(`Unable to parse callSid from ${idOrSid}`);
  return match[0];
}

// session context objects are all stored in a single Sync Map
export const SYNC_SESSION_CONTEXT_MAP = "session-context";
export function makeContextItemId(callSid: string) {
  const sid = parseCallSid(callSid);
  return `ctx-${sid}`;
}

// each session's turns are stored in their own map
export function makeSessionTurnMapName(callSid: string) {
  const sid = parseCallSid(callSid);
  return `turns-${sid}`;
}
