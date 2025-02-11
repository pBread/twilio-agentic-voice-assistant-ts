# Twilio Conversation Relay

## Development

## Agent Runtime

The Agent Runtime system provides a flexible framework designed for LLM interoperability. The architecture ensures that your LLM implementations can be easily swapped or modified without affecting the rest of the application.

### Architecture

The system consists of two main parts:

- An AgentRuntime interface that the LLMService uses to interact with your agent
- An AgentRuntimeAbstract class that provides the base implementation structure

The app will automatically initialize any class that extends AgentRuntimeAbstract. However, the LLMService only knows about the AgentRuntime interface. This means you can:

- Create a full agent by extending the abstract class (recommended)
- Pass standalone functions that satisfy the interface (useful for testing or simple implementations)

### Basic Usage

```ts
// Full implementation using abstract class
class MyAgent extends AgentRuntimeAbstract<MyTools, MyConfig, MyParams> {
  getInstructions(): string {
    return this.params?.systemPrompt ?? "You are a friendly robot!";
  }

  getLLMConfig(): MyConfig {
    return this.config;
  }

  getToolManifest(): MyTools {
    return {
      name: "example-tool",
      description: "An example tool",
    };
  }
}

// Or lightweight implementation using just the interface
const lightweightAgent: AgentRuntime<MyTools, MyConfig> = {
  getInstructions: () => "You are a friendly robot!",
  getLLMConfig: () => ({ model: "gpt-4", temperature: 0.7 }),
  getToolManifest: () => ({
    name: "example-tool",
    description: "An example tool",
  }),
};
```

### Synchronizing Session Data

Real-time voice use-cases are extraordinarily sensitive to latency hence the conversation state (turns and context) are best handled in-memory. This data can be synchronized with external data storage by subscribing to the SessionManager events.

```ts
const session = new SessionManager("CA00000....");

session.on("turnUpdated", (id) => {
  const turn = session.turns.get(id);
  // send the data somewhere to be stored
});
```

#### Handling Rate Limits

There are often many successive updates that occur in memory, which is why in-memory is the best approach. For instance, when streaming an LLM completion, there will be dozens of updates made to the turn record that represents that text completion.

This app implements a versioning incrementor on each store record to provide a path to gauranteeing that external systems can be updated completely. The subscriber to the updates will simply need to track what version it has sent to an external system and continue to push updates until the version is up to date.

```ts
session.on("turnUpdated", (id) => {
  const turn = session.turns.get(id);
  if (turn?.role === "bot" && turn.type === "text") {
    console.log("\nVersion: ", turn.version, "Content: ", turn.content);
  }
});

const textTurn = session.turns.addBotText({ content: "" });
textTurn.content += "The first chunk.";
// Version:  1 Content:  The first chunk.

textTurn.content += "The next chunk. ";
// Version:  2 Content:  The first chunk.The next chunk.

for (let i = 0; i < 1000; i++) textTurn.content += `-${i}`;
// Version:  3 Content:  The first chunk.The next chunk. -0
// Version:  4 Content:  The first chunk.The next chunk. -0-1
// Version:  5 Content:  The first chunk.The next chunk. -0-1-2
// Version:  6 Content:  The first chunk.The next chunk. -0-1-2-3
// Version:  7 Content:  The first chunk.The next chunk. -0-1-2-3-4
// etc...
```
