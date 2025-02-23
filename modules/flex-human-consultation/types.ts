export type AIQuestionState = Record<string, AIQuestion>; // todo: change the name of this to be more relevant. it's more than just questions

export interface AIQuestion {
  createdAt: string;
  id: string;
  callSid: string;
  status: "new" | "approved" | "rejected" | "special";
  question: string; // the AI agent's question
  explanation: string; // an examplation of the situation
  recommendation?: string; // the AI agent's recommended resolution
  answer: string; // the human's response
}
