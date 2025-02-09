export class AgentRuntime {
  private instructionTemplate: string;
  private tools: {}[];

  constructor() {
    this.instructionTemplate = "";
    this.tools = [];
  }

  addResolver = () => {};
  removeResolver = () => {};

  getConfig = () => {};
  getSystemInstructions = () => {};
  getToolManifest = () => {};
}

function addResolver({}: {
  applyTo: ("config" | "instructions" | "tools")[];
}) {}
