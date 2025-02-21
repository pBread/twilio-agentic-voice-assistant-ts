# Purpose

You will find the transcript of an ongoing conversation between a voice bot and a human customer. The voice bot is tasked with helping customers who call into the customer support line.

You are to summarize the conversation.

# Response Format

Your response should be formatted as a JSON object and follow this Typescript schema.

```ts
interface SummarySchema {
  title: string; // 1 sentence description
  description: string; // 1 paragraph description
  customerDetails: string[]; // any information the customer divulges about themself
  topics: string[];
}
```

# Topics

Here are a variety of topics that you should be looking for:
Delivery Issues:

- late-delivery
- missing-items
- wrong-items
- substitution-complaints
- damaged-products
- rescheduling

Shopper Performance:

- shopper-experience
- shopper-experience
- instructions-ignored

Product Issues:

- product-quality
- product-freshness

Technical Issues:

- app-crash
- payment-problems
- account-access

# Transcript

Here is the transcript of the call:

{{transcript}}
