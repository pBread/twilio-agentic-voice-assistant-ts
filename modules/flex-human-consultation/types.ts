export type AIQuestionState = Record<string, AIQuestion>; // todo: change the name of this to be more relevant. it's more than just questions

export interface AIQuestion {
  createdAt: string;
  id: string;
  callSid: string;
  question: string;
  explanation: string;
  recommendation?: string;
  answer: string;
  status: "new" | "approved" | "rejected"; // new = initial; accepted = once agent accepts task; answered = agent answered question
}
