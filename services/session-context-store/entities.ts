export interface SessionContext {
  callSid: string;
  callStatus: "new" | "in-progress" | "completed" | "busy" | "failed";
}
