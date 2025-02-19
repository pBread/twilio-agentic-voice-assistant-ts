import type { HumanConsultationContext } from "./types.js";

export function initialHumanConsultationContext() {
  return { consultations: {} } as HumanConsultationContext;
}
