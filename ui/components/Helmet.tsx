import Head from "next/head";

export function Helmet() {
  return (
    <Head>
      <title>Conversation Relay</title>
      <meta name="description" content="Twilio Conversation Relay Demo" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
