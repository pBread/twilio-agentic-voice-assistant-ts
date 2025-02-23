export interface CallSummary {
  title: string; // 1 sentence title of the call
  description: string; // 2-3 paragraph description
  topics: string[]; // at most 2 topic ids at a time
}
