import type { VerifierResult } from "../../../shared/src/types.js";
import type { RunGraphState } from "../state.js";

export function verifyAction(state: RunGraphState): VerifierResult {
  const action = state.candidateAction;
  if (!action) {
    return { approved: false, fatal: true, reason: "没有候选动作，停止执行。" };
  }

  const legal = state.legalActions.find((item) => item.action_id === action.action_id);
  if (!legal) {
    return { approved: false, reason: "候选 action_id 已不在当前合法动作列表中。", retry_hint: "重新 observe 后再选择动作。" };
  }

  if (legal.risk === "fatal" && action.action_type === "end_turn") {
    return { approved: false, fatal: true, reason: "结束回合会触发 fatal 风险，禁止 POST 动作。" };
  }

  if (action.action_type === "end_turn") {
    const incoming = state.gameState?.enemies.reduce((sum, enemy) => sum + enemy.incomingDamage, 0) ?? 0;
    const block = state.gameState?.player.block ?? 0;
    if (incoming > block + 6) {
      return { approved: false, reason: `结束回合前防御不足：incoming=${incoming}, block=${block}。`, retry_hint: "优先选择防御或斩杀动作。" };
    }
  }

  return { approved: true, reason: `复核通过：${legal.label}` };
}
