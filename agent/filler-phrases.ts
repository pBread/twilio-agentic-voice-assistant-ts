// These are the default filler phrases. They are only spoken if the tool does not have it's own filler phrases defined.

// these are spoken first when any request may have dead air
const primary = [
  "One moment, please.",
  "Give me a minute.",
  "Just a second, {{context.user.name}}.",
  "Hold on while I access my systems.",
  "Bear with me for a moment.",
];

// these are spoken when a request is taking a very long time to complete
const secondary = [
  "My systems are taking a little while to respond.",
  "This request is taking a little longer than usual.",
  "This is taking a little longer than normal.",
  "Taking a bit longer than expected.",
  "The response is still processing.",
].flatMap((phrase0) =>
  // create a cartesian product to increase the variety
  [
    "Pardon the delay.",
    "One more moment {{user.name}}.",
    "Just another moment.",
    "Thanks for the patience, {{user.name}}",
    "I appreciate the patience",
    "Won't be much longer, {{user.name}}",
    "Should be ready shortly",
    "Almost there.",
  ].map((phrase1) => `${phrase0} ${phrase1}`),
);

export const fillerPhrases = { primary, secondary };
