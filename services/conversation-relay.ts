import type { WebSocket } from "ws";

export class RelayService {
  constructor(public callSid: string, public ws: WebSocket) {}

  /****************************************************
   Websocket Actions
  ****************************************************/
  /**
   * Sends an action to the Conversation Relay WebSocket.
   * @param {TwilioAction} action - The action to dispatch.
   */
  dispatch = (action: TwilioAction) => this.ws.send(JSON.stringify(action));

  /**
   * Ends the session and optionally provides handoff data.
   * @param {object} [handoffData={}] - Data to pass during session handoff.
   */
  end = (handoffData: object = {}) =>
    this.dispatch({ type: "end", handoffData: JSON.stringify(handoffData) });

  /**
   * Plays media to the caller.
   * @param {string} source - The URL of the media to play.
   * @param {object} [opts] - Optional settings.
   * @param {1} [opts.loop=1] - Number of times to loop the media.
   * @param {false} [opts.preemptible=false] - Whether the media can be interrupted.
   */
  playMedia = (source: string, opts: { loop?: 1; preemptible?: false } = {}) =>
    this.dispatch({ ...opts, type: "play", source });

  /**
   * Sends DTMF tones to the caller.
   * @param {string} digits - The DTMF digits to send.
   */
  sendDTMF = (digits: string) => this.dispatch({ type: "sendDigits", digits });

  /**
   * Sends a text token for TTS to the caller. Note: when streaming LLM responses, it is recommended to send each text token as it is received and not to wait until the entire completion is finished.
   * @param {string} text - The text token to send.
   * @param {boolean} last - Indicates if this is the last token.
   * @param {string} [fullText] - The full text if available.
   */
  sendTextToken = (text: string, last: boolean) => {
    this.dispatch({ type: "text", token: text, last });
  };

  /**
   * Switches the transcription language.
   */
  switchSTTLanguage = (ttsLanguage: string) =>
    this.dispatch({ type: "language", ttsLanguage });

  /**
   * Switches the spoken language.
   */
  switchTTSLanguage = (ttsLanguage: string) =>
    this.dispatch({ type: "language", ttsLanguage });

  /****************************************************
   Websocket Listeners
  ****************************************************/
  /**
   * Registers a listener for error websocket messages.
   * Note: this only messages sent from the ConversationRelay websocket, not local errors.
   */
  onError = (listener: (ev: ErrorMessage) => void) =>
    this.onMessage((ev) => ev.type === "error" && listener(ev));

  /**
   * Registers a listener for incoming websocket messages.
   */
  onMessage = (listener: (msg: TwilioRelayMessage) => void) =>
    this.ws.on("message", (data: string) => {
      const msg = JSON.parse(data) as TwilioRelayMessage;
      listener(msg);
    });

  /**
   * Registers a listener for DTMF messages.
   * The callback receives a `DTMFMessage` object containing:
   * - `digit`: The DTMF digit pressed by the user.
   */
  onDTMF = (listener: (ev: DTMFMessage) => void) =>
    this.onMessage((ev) => ev.type === "dtmf" && listener(ev));

  /**
   * Registers a listener for interruption events.
   * The callback receives a `HumanInterrupt` object containing:
   * - `durationUntilInterruptMs`: The duration in milliseconds until the interruption occurred.
   * - `utteranceUntilInterrupt`: The part of the bot's speech that was being spoken when interrupted.
   */
  onInterrupt = (listener: (ev: HumanInterrupt) => void) =>
    this.onMessage((ev) => ev.type === "interrupt" && listener(ev));

  /**
   * Registers a listener for human speech (prompt) messages.
   * The callback receives a `PromptMessage` object containing:
   * - `voicePrompt`: The transcribed text of the user's speech.
   * - `lang`: The language code (e.g., `"en-US"`).
   * - `last`: If `true`, `voicePrompt` contains the complete transcript; if `false`, it contains the latest chunk of words.
   */
  onPrompt = (listener: (ev: PromptMessage) => void) =>
    this.onMessage((ev) => ev.type === "prompt" && listener(ev));

  /**
   * Registers a listener for setup messages.
   * The callback receives a `SetupMessage` object containing call setup details:
   * - Various call-related properties like `callSid`, `from`, `to`, etc.
   */
  onSetup = (listener: (ev: SetupMessage) => void) =>
    this.onMessage((ev) => ev.type === "setup" && listener(ev));
}

/****************************************************
 Twilio Conversation Relay Actions
****************************************************/
type TwilioAction =
  | EndSession
  | PlayMedia
  | SendDigits
  | SendTextToken
  | SwitchLanguage;

type EndSession = {
  type: "end";
  handoffData: string; // stringified json
};

type PlayMedia = {
  type: "play";
  loop?: 1; // Default is 1
  preemptible?: false; // Default is false
  source: string;
};

type SendDigits = {
  type: "sendDigits";
  digits: string;
};

type SendTextToken = {
  type: "text";
  last: boolean;
  token: string;
};

type SwitchLanguage = {
  type: "language";
  ttsLanguage?: string;
  transcriptionLanguage?: string;
};

/****************************************************
 Twilio Conversation Relay Incoming Websocket Messages
****************************************************/
type TwilioRelayMessage =
  | DTMFMessage
  | ErrorMessage
  | HumanInterrupt
  | PromptMessage
  | SetupMessage;

type ExtractMessageEvent<T> = T extends { type: infer U } ? U : never;
export type TwilioRelayMessageTypes = ExtractMessageEvent<TwilioRelayMessage>;

type DTMFMessage = {
  type: "dtmf";
  digit: string;
};

type ErrorMessage = {
  type: "error";
  description: string;
};

// when a human interrupts a bot
type HumanInterrupt = {
  type: "interrupt";

  durationUntilInterruptMs: string; // the ms when interruption occured
  utteranceUntilInterrupt: string; // the clause that was being spoken when the user interrupted
};

type PromptMessage = {
  type: "prompt";
  voicePrompt: string;
  lang: "en-US";
  last: true;
};

type SetupMessage = {
  accountSid: string;
  applicationSid: string | null;
  callerName: string;
  callSid: string;
  callStatus: string;
  callType: "PSTN";
  customParameters?: { [key: string]: string };
  direction: "inbound";
  forwardedFrom: string;
  from: string;
  parentCallSid: string;
  sessionId: string;
  to: string;
  type: "setup";
};
