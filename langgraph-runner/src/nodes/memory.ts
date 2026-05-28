import type { RunSummary } from "../../../shared/src/types.js";
import type { McpFacade } from "../mcpClient.js";
import type { RunGraphState } from "../state.js";

export async function updateMemory(state: RunGraphState, mcp: McpFacade): Promise<RunSummary> {
  const diff = {
    strategy: {
      build_direction: state.plannerState?.build_direction ?? "unknown",
      last_action_reason: state.candidateAction?.reason ?? "action executed",
      source_step: state.stepNo
    },
    risks: state.risk
      ? {
          last_risk: state.risk,
          source_step: state.stepNo
        }
      : {}
  };

  return mcp.call<RunSummary>("update_run_summary", { diff });
}
