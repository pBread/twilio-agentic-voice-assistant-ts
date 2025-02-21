import type { ConversationRelayAttributes } from "twilio/lib/twiml/VoiceResponse.js";

// LtPsVjX1k0Kl4StEMZPK: (Sophia) Good pace and meets criteria
// nBoLwpO4PAjQaQwVKPI1: () Good pace and meets criteria
// 9Ft9sm9dzvprPILZmLJl: (Patrick)  Good pace and authoritative
// HDA9tsk27wYi3uq0fPcK (Stuart) Slightly younger
// Jessica-flash_v2_5
// Mark-Natural Conversations UgBBYS2sOqTuMpoF3BR0

// google: en-US-Journey-D, en-US-Journey-F, en-US-Journey-O, en-IN-Journey-D, en-IN-Journey-F, en-GB-Journey-D, en-GB-Journey-F, de-DE-Journey-D, de-DE-Journey-F
// Amazon: Amy-Generative, Matthew-Generative, Ruth-Generative

// export const relayConfig: Omit<ConversationRelayAttributes, "url"> = {
//   ttsProvider: "google",
//   voice: "en-US-Journey-D",
// };

// Mark-Natural Conversations UgBBYS2sOqTuMpoF3BR0
export const relayConfig: Omit<ConversationRelayAttributes, "url"> = {
  ttsProvider: "ElevenLabs",
  voice: "UgBBYS2sOqTuMpoF3BR0",
};

// // Cassidy 56AoDkrOh6qfVPDXZ7Pt
// export const relayConfig: Omit<ConversationRelayAttributes, "url"> = {
//   ttsProvider: "ElevenLabs",
//   voice: "56AoDkrOh6qfVPDXZ7Pt",
// };
