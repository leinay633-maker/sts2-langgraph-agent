import type { CandidateAction, RiskAssessment } from "../../../shared/src/types.js";
import type { RunGraphState } from "../state.js";

const preferredActionPatterns = [
  "play_strike",
  "play_defend",
  "choose_reward",
  "choose_safe_route",
  "buy_card_draw",
  "leave_shop",
  "play_bash",
  "play_heavy_blade",
  "end_turn"
];

export function chooseAction(state: RunGraphState): { candidateAction: CandidateAction | null; risk: RiskAssessment | null; lastError: string | null; haltReason?: string } {
  const actions = state.legalActions;
  if (actions.length === 0) {
    return {
      candidateAction: null,
      risk: null,
      lastError: "No legal action is available",
      haltReason: "No legal action is available"
    };
  }

  const selected =
    preferredActionPatterns
      .map((pattern) => actions.find((action) => action.action_id.includes(pattern) || action.action_type.includes(pattern)))
      .find(Boolean) ?? actions[0];

  const risk: RiskAssessment = {
    level: selected.risk,
    needs_verifier: selected.risk === "high" || selected.risk === "fatal",
    reason: selected.risk === "low" ? "低风险合法动作，可直接执行。" : `动作风险为 ${selected.risk}，需要复核：${selected.description}`
  };

  return {
    candidateAction: {
      action_id: selected.action_id,
      action_type: selected.action_type,
      target_id: typeof selected.metadata?.target_id === "string" ? selected.metadata.target_id : undefined,
      reason: `选择 ${selected.label}：${selected.description}`
    },
    risk,
    lastError: null
  };
}
