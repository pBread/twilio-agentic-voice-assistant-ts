const callSidRe = /CA[a-f0-9]{32}/;
function parseCallSid(idOrSid: string) {
  const match = idOrSid.match(callSidRe);
  if (!match) throw Error(`Unable to parse callSid from ${idOrSid}`);
  return match[0];
}

// each session's turns are stored in their own map
export function makeContextMapName(callSid: string) {
  const sid = parseCallSid(callSid);
  return `context-${sid}`;
}

// each session's turns are stored in their own map
export function makeTurnMapName(callSid: string) {
  const sid = parseCallSid(callSid);
  return `turns-${sid}`;
}
