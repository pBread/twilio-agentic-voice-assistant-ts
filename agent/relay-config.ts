import type { ConversationRelayAttributes } from "twilio/lib/twiml/VoiceResponse.js";

const goodTTS = {
  google: { journeyD: { ttsProvider: "google", voice: "en-US-Journey-D" } },
  elevenLabs: {
    jessicaAnne: { ttsProvider: "ElevenLabs", voice: "g6xIsTj2HwM6VR4iXFCw" }, // friendly and conversational female voice, motherly
    mark: { ttsProvider: "ElevenLabs", voice: "UgBBYS2sOqTuMpoF3BR0" }, // conversational, natural
    cassidy: { ttsProvider: "ElevenLabs", voice: "56AoDkrOh6qfVPDXZ7Pt" }, //
    grandpaSpuds: { ttsProvider: "ElevenLabs", voice: "NOpBlnGInO9m6vDvFkFC" }, // humorous, disarming
    james: { ttsProvider: "ElevenLabs", voice: "EkK5I93UQWFDigLMpZcX" }, // husky, engaging
    ana: { ttsProvider: "ElevenLabs", voice: "rCmVtv8cYU60uhlsOo1M" }, // soft, british
    adamStone: { ttsProvider: "ElevenLabs", voice: "NFG5qt843uXKj4pFvR7C" }, // Adam Stone - late night radio
    theo: { ttsProvider: "ElevenLabs", voice: "NyxenPOqNyllHIzSoPbJ" }, // Theo - Smart, warm, open
  },
};

export const relayConfig: Omit<ConversationRelayAttributes, "url"> = {
  ...goodTTS.elevenLabs.mark,
};
