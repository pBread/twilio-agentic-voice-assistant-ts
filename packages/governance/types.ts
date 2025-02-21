export interface GovernanceState {
  guidance: string; // guidance for the conscious LLM
  summary: string; // a summary of the bot's compliance with the procedures
  rating: number; // scale of 1-5 (1=bad, 5=perfect) how well is the agent adhearing to procedures
  procedures: Record<string, GovernanceStep[]>; // the key is the procedureId and each step represents the status of the procedure's steps
}

export interface GovernanceStep {
  id: string;
  summary: string; // a summary of the reasoning for the status and
  status: GovernanceStepStatus;
}

export type GovernanceStepStatus =
  | "not-started"
  | "missed" // the bot simply skipped this step
  | "in-progress" // the bot is currently performing this step
  | "complete" // the bot successfully completed this step
  | "not-necessary" // the step was not needed based on the conditions
  | "unresolved"; // the bot attempted, but failed
