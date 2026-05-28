import type { CandidateAction, RiskAssessment } from "../../../shared/src/types.js";
import type { RunGraphState } from "../state.js";
import { invokeModelJson } from "../model.js";

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

type ActorResult = { candidateAction: CandidateAction | null; risk: RiskAssessment | null; lastError: string | null; haltReason?: string };

export async function chooseAction(state: RunGraphState): Promise<ActorResult> {
  const actions = state.legalActions;
  if (actions.length === 0) {
    return {
      candidateAction: null,
      risk: null,
      lastError: "No legal action is available",
      haltReason: "No legal action is available"
    };
  }

  const modelDecision = await invokeModelJson<{ action_id?: unknown; reason?: unknown }>("You are the Actor node for a Slay the Spire 2 long-horizon agent. Select exactly one current legal action_id. Never invent actions.", {
    state_type: state.stateType,
    screen: state.screen,
    player: state.gameState?.player,
    enemies: state.gameState?.enemies,
    planner_state: state.plannerState,
    memory: state.memory,
    legal_actions: actions
  }).catch(() => null);

  if (typeof modelDecision?.action_id === "string") {
    const legal = actions.find((action) => action.action_id === modelDecision.action_id);
    if (legal) {
      return buildResult(legal, typeof modelDecision.reason === "string" ? modelDecision.reason : legal.description);
    }
  }

  const selected =
    preferredActionPatterns
      .map((pattern) => actions.find((action) => action.action_id.includes(pattern) || action.action_type.includes(pattern)))
      .find(Boolean) ?? actions[0];

  return buildResult(selected, `选择 ${selected.label}：${selected.description}`);
}

function buildResult(selected: RunGraphState["legalActions"][number], reason: string): ActorResult {
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
      reason
    },
    risk,
    lastError: null
  };
}
