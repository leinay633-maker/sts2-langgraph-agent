import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { GameState, LegalAction, PlannerState, RunSummary } from "../../shared/src/types.js";
import { RunEventLogger } from "./eventLogger.js";
import { McpFacade } from "./mcpClient.js";
import { chooseAction } from "./nodes/actor.js";
import { updateMemory } from "./nodes/memory.js";
import { updatePlan } from "./nodes/planner.js";
import { verifyAction } from "./nodes/verifier.js";
import { routeAfterActor, routeAfterObserve, routeAfterVerifier } from "./routing/rules.js";
import type { RunGraphState } from "./state.js";

const GraphAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  maxSteps: Annotation<number>(),
  stepNo: Annotation<number>({ reducer: (_, value) => value, default: () => 0 }),
  gameState: Annotation<GameState | null>({ reducer: (_, value) => value, default: () => null }),
  stateType: Annotation<RunGraphState["stateType"]>({ reducer: (_, value) => value, default: () => "unknown" }),
  screen: Annotation<string | null>({ reducer: (_, value) => value, default: () => null }),
  stateFingerprint: Annotation<string | null>({ reducer: (_, value) => value, default: () => null }),
  legalActions: Annotation<LegalAction[]>({ reducer: (_, value) => value, default: () => [] }),
  plannerState: Annotation<PlannerState | null>({ reducer: (_, value) => value, default: () => null }),
  candidateAction: Annotation<RunGraphState["candidateAction"]>({ reducer: (_, value) => value, default: () => null }),
  risk: Annotation<RunGraphState["risk"]>({ reducer: (_, value) => value, default: () => null }),
  verifierResult: Annotation<RunGraphState["verifierResult"]>({ reducer: (_, value) => value, default: () => null }),
  memory: Annotation<RunSummary | null>({ reducer: (_, value) => value, default: () => null }),
  lastError: Annotation<string | null>({ reducer: (_, value) => value, default: () => null }),
  haltReason: Annotation<string | null>({ reducer: (_, value) => value, default: () => null })
});

export function createGraph(mcp: McpFacade, logger: RunEventLogger) {
  const graph = new StateGraph(GraphAnnotation)
    .addNode("observe_state", async (state: RunGraphState) => {
      const gameState = await mcp.call<GameState>("get_game_state");
      await logger.event("observe_state", {
        step_no: state.stepNo,
        state_type: gameState.state_type,
        status: gameState.status,
        actions: gameState.legal_actions.map((item) => item.action_id)
      });

      return {
        stepNo: gameState.status === "stable" ? state.stepNo + 1 : state.stepNo,
        gameState,
        stateType: gameState.state_type,
        screen: gameState.screen,
        stateFingerprint: gameState.state_fingerprint,
        legalActions: gameState.legal_actions,
        lastError: gameState.status === "stable" ? null : gameState.message ?? gameState.status
      };
    })
    .addNode("wait_stable", async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await logger.event("wait_stable", {});
      return {};
    })
    .addNode("planner", async (state: RunGraphState) => {
      const plannerState = await updatePlan(state, mcp);
      await logger.event("planner", { build_direction: plannerState.build_direction, confidence: plannerState.confidence });
      return { plannerState };
    })
    .addNode("actor", async (state: RunGraphState) => {
      const result = await chooseAction(state);
      await logger.event("actor", {
        action_id: result.candidateAction?.action_id,
        risk: result.risk?.level,
        error: result.lastError
      });
      return result;
    })
    .addNode("verifier", async (state: RunGraphState) => {
      const verifierResult = verifyAction(state);
      await logger.event("verifier", verifierResult as unknown as Record<string, unknown>);
      return { verifierResult };
    })
    .addNode("execute_action", async (state: RunGraphState) => {
      if (!state.candidateAction) {
        return { haltReason: "execute_action reached without candidateAction" };
      }

      const execution = await mcp.call("execute_action", { action_id: state.candidateAction.action_id });
      await logger.event("execute_action", {
        action_id: state.candidateAction.action_id,
        execution
      });
      return { candidateAction: null, verifierResult: null, lastError: null };
    })
    .addNode("memory_update", async (state: RunGraphState) => {
      const memory = await updateMemory(state, mcp);
      await logger.event("memory_update", { event_count: memory.events.length });
      return { memory };
    })
    .addNode("halt", async (state: RunGraphState) => {
      const haltReason = state.haltReason ?? state.lastError ?? "Max steps reached or manual halt required";
      await logger.event("halt", { haltReason });
      return { haltReason };
    })
    .addEdge(START, "observe_state")
    .addConditionalEdges("observe_state", routeAfterObserve, ["wait_stable", "planner", "actor", "halt", END])
    .addEdge("wait_stable", "observe_state")
    .addEdge("planner", "actor")
    .addConditionalEdges("actor", routeAfterActor, ["verifier", "execute_action", "halt"])
    .addConditionalEdges("verifier", routeAfterVerifier, ["execute_action", "actor", "halt"])
    .addEdge("execute_action", "memory_update")
    .addEdge("memory_update", "observe_state")
    .addEdge("halt", END);

  return graph.compile();
}
