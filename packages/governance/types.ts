export interface GovernanceState {
  guidance: string; // guidance for the conscious LLM
  summary: string; // a summary of the bot's compliance with the procedures
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
  | "unresolved"; // the bot attempted, but failed
