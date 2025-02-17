export interface Procedure {
  id: string;
  description: string;
  steps?: Step[];
}

export interface Step {
  id: string;
  description: string; // a description of the purpose of this step
  strictness: StrictLevel; // the degree to which this step is required for
  completionCriteria: string; // criteria to determine whether this step has been completed
  conditions?: string; // conditions on when this step should or should not be taken
  instructions?: string; // notes on how to conduct this step
}

type StrictLevel =
  | "conditional" // refer to the 'conditions' property to determine if the step is relevant
  | "recommended" // should be attempted but prioritize a smooth customer experience
  | "required" // only skip this step if it is absolutely neccessary
  | "critical"; // never ever ever skip steps marked critical
