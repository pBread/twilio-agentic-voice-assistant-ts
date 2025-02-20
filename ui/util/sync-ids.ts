const callSidRe = /CA[a-f0-9]{32}/;
export function parseCallSid(idOrSid: string) {
  const match = idOrSid.match(callSidRe);
  if (!match) {
    const msg = `Unable to parse callSid from ${idOrSid}`;
    console.error(msg);
    throw Error(msg);
  }
  return match[0];
}

// each session's turns are stored in their own map
export function makeContextMapName(callSid: string) {
  return `context-${callSid}`;
}

export function isContextMapName(id: string) {
  return /^context-CA[a-f0-9]{32}$/.test(id);
}

// each session's turns are stored in their own map
export function makeTurnMapName(callSid: string) {
  return `turns-${callSid}`;
}
export function isTurnMapName(id: string) {
  return /^turns-CA[a-f0-9]{32}$/.test(id);
}

export const CALL_STREAM = "call-stream";
