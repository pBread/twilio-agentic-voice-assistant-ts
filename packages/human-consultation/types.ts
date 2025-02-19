export interface HumanConsultationContext {
  consultations?: Record<string, HumanConsultRequest>;
}

export interface HumanConsultRequest {
  callSid: string;
  createdAt: string; // iso
  id: string;

  approvals: ApprovalRequest[];
}

export interface ApprovalRequest {
  createdAt: string; // iso
  id: string;
  callSid: string;
  question: string;
  explanation: string;
  recommendation: string;

  response: string;
  status: "new" | "approved" | "rejected";
}
