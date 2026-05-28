import type { PlannerState } from "../../../shared/src/types.js";
import type { McpFacade } from "../mcpClient.js";
import { invokeModelJson } from "../model.js";
import type { RunGraphState } from "../state.js";

export async function updatePlan(state: RunGraphState, mcp: McpFacade): Promise<PlannerState> {
  const query = `${state.stateType} ${state.gameState?.screen ?? ""} reward route shop boss`;
  const contextHits = await mcp.call<Array<{ file: string; preview: string }>>("search_context", { query, limit: 3 }).catch(() => []);
  const baseline = baselinePlan(state, contextHits);

  const modelPlan = await invokeModelJson<Partial<PlannerState>>("You are the Planner node for a Slay the Spire 2 long-horizon agent. Update strategic policy from the current state and retrieved context. Keep facts separate from strategy.", {
    state_type: state.stateType,
    player: state.gameState?.player,
    enemies: state.gameState?.enemies,
    legal_actions: state.legalActions,
    previous_plan: state.plannerState,
    context_hits: contextHits
  }).catch(() => null);

  if (!modelPlan) return baseline;

  return {
    ...baseline,
    build_direction: typeof modelPlan.build_direction === "string" ? modelPlan.build_direction : baseline.build_direction,
    reward_policy: stringArray(modelPlan.reward_policy, baseline.reward_policy),
    route_policy: stringArray(modelPlan.route_policy, baseline.route_policy),
    shop_policy: stringArray(modelPlan.shop_policy, baseline.shop_policy),
    boss_plan: typeof modelPlan.boss_plan === "string" ? modelPlan.boss_plan : baseline.boss_plan,
    confidence: typeof modelPlan.confidence === "number" ? modelPlan.confidence : baseline.confidence,
    reasons: stringArray(modelPlan.reasons, baseline.reasons)
  };
}

function baselinePlan(state: RunGraphState, contextHits: Array<{ file: string; preview: string }>): PlannerState {
  return {
    build_direction: inferBuildDirection(state),
    reward_policy: ["优先补核心成长牌", "跳过低质量牌", "避免污染牌组"],
    route_policy: ["血量低于 45% 时避开精英", "Boss 前优先休息点和商店"],
    shop_policy: ["优先过牌和防御", "删牌仅在金币宽裕时执行"],
    boss_plan: state.stateType === "combat" ? "先建立易伤和力量，再用高伤牌收尾。" : "进入 Boss 前确认防御、过牌和药水。",
    confidence: contextHits.length > 0 ? 0.82 : 0.68,
    reasons: [
      `当前阶段 ${state.stateType} 触发 Planner。`,
      ...contextHits.map((hit) => `Context: ${hit.file} - ${hit.preview}`)
    ]
  };
}

function stringArray(value: unknown, defaultValue: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : defaultValue;
}

function inferBuildDirection(state: RunGraphState) {
  const deck = state.gameState?.player.deck ?? [];
  if (deck.includes("Inflame")) return "strength_scaling";
  if (deck.includes("Battle Trance")) return "card_draw_midrange";
  return state.plannerState?.build_direction ?? "ironclad_balanced";
}
