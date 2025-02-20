const callSidRe = /CA[a-f0-9]{32}/;
export function parseCallSid(idOrSid: string) {
  const match = idOrSid.match(callSidRe);
  if (!match) throw Error(`Unable to parse callSid from ${idOrSid}`);
  return match[0];
}
