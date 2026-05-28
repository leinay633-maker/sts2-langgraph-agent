import type { PlannerState } from "../../../shared/src/types.js";
import type { McpFacade } from "../mcpClient.js";
import type { RunGraphState } from "../state.js";

export async function updatePlan(state: RunGraphState, mcp: McpFacade): Promise<PlannerState> {
  const query = `${state.stateType} ${state.gameState?.screen ?? ""} reward route shop boss`;
  const contextHits = await mcp.call<Array<{ file: string; preview: string }>>("search_context", { query, limit: 3 }).catch(() => []);

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

function inferBuildDirection(state: RunGraphState) {
  const deck = state.gameState?.player.deck ?? [];
  if (deck.includes("Inflame")) return "strength_scaling";
  if (deck.includes("Battle Trance")) return "card_draw_midrange";
  return state.plannerState?.build_direction ?? "ironclad_balanced";
}
