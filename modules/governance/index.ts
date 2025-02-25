import { readFileSync } from "fs";
import OpenAI from "openai";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { AgentResolver } from "../../completion-server/agent-resolver/index.js";
import type { SessionStore } from "../../completion-server/session-store/index.js";
import { getMakeLogger } from "../../lib/logger.js";
import { OPENAI_API_KEY } from "../../shared/env.js";
import { interpolateTemplate } from "../../lib/template.js";
import { ChatCompletion } from "openai/resources/index.mjs";
import type {
  GovernanceState,
  GovernanceStep,
  GovernanceStepStatus,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const instructionsTemplate = readFileSync(
  join(__dirname, "instructions-subconscious.md"),
  "utf-8",
);

interface GovernanceServiceConfig {
  frequency: number;
}

export class GovernanceService {
  log: ReturnType<typeof getMakeLogger>;
  constructor(
    private store: SessionStore,
    private agent: AgentResolver,
    private config: GovernanceServiceConfig,
  ) {
    this.log = getMakeLogger(store.callSid);
  }

  private timeout: NodeJS.Timeout | undefined;
  start = () => {
    if (this.timeout) throw Error("The Governance loop is already started.");
    this.timeout = setInterval(this.execute, this.config.frequency);
  };

  stop = () => clearInterval(this.timeout);

  execute = async () => {
    const transcript = this.getTranscript();
    const instructions = interpolateTemplate(instructionsTemplate, {
      ...this.store.context,
      transcript,
    });

    let completion: ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: instructions }],
        response_format: { type: "json_object" },
        stream: false,
      });
    } catch (error) {
      this.log.error(
        "governance",
        "Governance Bot competion request failed",
        error,
      );
      return;
    }

    const choice = completion.choices[0];
    const content = choice.message.content;
    if (!content) {
      const msg = "Governance Bot returned no content from completion";
      this.log.error(msg);
      return;
    }

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const msg =
        "Governance Bot has no tools but LLM is attempting to execute fns";
      this.log.error(msg);
      return;
    }

    if (choice.finish_reason === "stop") {
      let result: GovernanceState;
      try {
        result = JSON.parse(content) as GovernanceState;
        if (typeof result !== "object") throw "";
      } catch (error) {
        this.log.error(
          "sub.gov",
          "execute LLM responded with a non-JSON format",
          content,
        );
        return;
      }

      const prev = this.store.context?.governance ?? ({} as GovernanceState);

      const governance: GovernanceState = {
        ...prev,
        ...result,
        rating: (calculateGovernanceScore(result) + (prev.rating ?? 3)) / 2,
        procedures: { ...(prev?.procedures ?? {}), ...result.procedures },
      };

      this.store.setContext({ governance });
    }
  };

  private getTranscript = () =>
    this.store.turns
      .list()
      .map((turn) => {
        if (turn.role === "bot") {
          if (turn.origin === "filler") return;
          if (turn.type === "tool") return;

          return `[${turn.role.toUpperCase()}]: ${turn.content}`;
        }

        if (turn.role === "human") {
          return `[${turn.role.toUpperCase()}]: ${turn.content}`;
        }

        if (turn.role === "system") {
          return false;
        }
      })
      .filter((line) => !!line)
      .join("\n\n");
}
/**
 * Calculates a comprehensive governance score based on multiple weighted factors
 * @param governance The current governance state
 * @returns A score between 1 and 5
 */
export function calculateGovernanceScore(governance: GovernanceState): number {
  // Extract all steps from all procedures
  const allSteps = Object.values(governance.procedures).flat();

  // Score 1: Task status score - penalizes missed/unresolved tasks
  const statusScore = calculateTaskStatusScore(allSteps);

  // Score 2: Governance LLM's own rating (converted from 1-5 scale to 0-100)
  const llmRatingScore = (governance.rating / 5) * 100;

  // Score 3: Critical step score - heavily penalizes missing critical steps
  const criticalStepScore = calculateCriticalStepScore(governance);

  // Score 4: Procedure completion score - rewards completing full procedures
  const completionScore = calculateProcedureCompletionScore(governance);

  // Score 5: Procedure progression score - rewards forward progress
  const progressionScore = calculateProgressionScore(governance);

  // Apply weights to each score
  // These weights should be configured based on your specific use case
  const weights = {
    statusScore: 0.25, // 25% weight
    llmRatingScore: 0.2, // 20% weight
    criticalStepScore: 0.3, // 30% weight
    completionScore: 0.15, // 15% weight
    progressionScore: 0.1, // 10% weight
  };

  // Calculate final weighted score
  const finalScore =
    statusScore * weights.statusScore +
    llmRatingScore * weights.llmRatingScore +
    criticalStepScore * weights.criticalStepScore +
    completionScore * weights.completionScore +
    progressionScore * weights.progressionScore;

  // Convert 0-100 scale to 1-5 scale and round to nearest tenth
  const scaledScore = 1 + (finalScore / 100) * 4;
  return Math.round(scaledScore * 10) / 10;
}

/**
 * Calculates score based on the status of all tasks
 * @param steps All governance steps
 * @returns Score between 0 and 100
 */
function calculateTaskStatusScore(steps: GovernanceStep[]): number {
  if (steps.length === 0) return 100; // If no steps, assume perfect score

  // Count steps by status
  const statusCounts = steps.reduce((counts, step) => {
    counts[step.status] = (counts[step.status] || 0) + 1;
    return counts;
  }, {} as Record<GovernanceStepStatus, number>);

  // Get total number of steps
  const totalSteps = steps.length;

  // Calculate percentages
  const missedPercent = ((statusCounts.missed || 0) / totalSteps) * 100;
  const unresolvedPercent = ((statusCounts.unresolved || 0) / totalSteps) * 100;
  const completePercent = ((statusCounts.complete || 0) / totalSteps) * 100;
  const notNecessaryPercent =
    ((statusCounts["not-necessary"] || 0) / totalSteps) * 100;

  // Penalize based on missed and unresolved tasks
  // Base score is 100, subtract penalties
  const basePenalty = missedPercent * 1.5 + unresolvedPercent * 1.0;

  // Reward for completed tasks and properly identified not-necessary tasks
  const bonus = (completePercent + notNecessaryPercent) * 0.2;

  // Calculate final status score (capped between 0-100)
  return Math.max(0, Math.min(100, 100 - basePenalty + bonus));
}

/**
 * Identifies if critical steps are missed in any procedure
 * @param governance The current governance state
 * @returns Score between 0 and 100
 */
function calculateCriticalStepScore(governance: GovernanceState): number {
  // Define critical steps for each procedure type
  // This should be customized to your business logic
  const criticalSteps: Record<string, string[]> = {
    process_refund_request: [
      "identify_user",
      "locate_order",
      "verify_refund_details",
    ],
    handle_complaint: [
      "identify_user",
      "document_complaint",
      "escalate_if_needed",
    ],
    place_order: ["verify_payment", "confirm_inventory", "send_confirmation"],
    // Add other procedures and their critical steps
  };

  let totalCriticalSteps = 0;
  let missedCriticalSteps = 0;

  // Check each procedure for critical steps
  Object.entries(governance.procedures).forEach(([procedureId, steps]) => {
    // Skip if procedure doesn't have defined critical steps
    if (!criticalSteps[procedureId]) return;

    criticalSteps[procedureId].forEach((criticalStepId) => {
      totalCriticalSteps++;

      // Find the step in the current procedure
      const step = steps.find((s) => s.id === criticalStepId);

      // If step doesn't exist or is missed/unresolved, count as missed critical
      if (!step || step.status === "missed" || step.status === "unresolved") {
        missedCriticalSteps++;
      }
    });
  });

  // If no critical steps are relevant, return perfect score
  if (totalCriticalSteps === 0) return 100;

  // Calculate percentage of critical steps missed
  const missedPercent = (missedCriticalSteps / totalCriticalSteps) * 100;

  // Heavily penalize missed critical steps
  // Even one missed critical step should significantly impact the score
  return Math.max(0, 100 - missedPercent * 2.5);
}

/**
 * Calculates how many full procedures are properly completed
 * @param governance The current governance state
 * @returns Score between 0 and 100
 */
function calculateProcedureCompletionScore(
  governance: GovernanceState,
): number {
  const procedureCount = Object.keys(governance.procedures).length;
  if (procedureCount === 0) return 100; // If no procedures, assume perfect score

  let completedProcedures = 0;

  // Check each procedure to see if it's fully completed
  Object.values(governance.procedures).forEach((steps) => {
    // A procedure is complete if all steps are either "complete" or "not-necessary"
    const isComplete = steps.every(
      (step) => step.status === "complete" || step.status === "not-necessary",
    );

    if (isComplete) {
      completedProcedures++;
    }
  });

  // Calculate percentage of completed procedures
  return (completedProcedures / procedureCount) * 100;
}

/**
 * Measures progression of steps (rewarding forward movement)
 * @param governance The current governance state
 * @returns Score between 0 and 100
 */
function calculateProgressionScore(governance: GovernanceState): number {
  // Extract all steps from all procedures
  const allSteps = Object.values(governance.procedures).flat();
  if (allSteps.length === 0) return 100; // If no steps, assume perfect score

  // Count steps by status
  const statusCounts = allSteps.reduce((counts, step) => {
    counts[step.status] = (counts[step.status] || 0) + 1;
    return counts;
  }, {} as Record<GovernanceStepStatus, number>);

  // Calculate percentage of steps that show progression
  // "in-progress", "complete", and "not-necessary" indicate progression
  const progressingSteps =
    (statusCounts["in-progress"] || 0) +
    (statusCounts.complete || 0) +
    (statusCounts["not-necessary"] || 0);

  const progressionPercent = (progressingSteps / allSteps.length) * 100;

  return progressionPercent;
}
