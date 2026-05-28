import { END } from "@langchain/langgraph";
import type { CandidateAction, LegalAction } from "../../../shared/src/types.js";
import type { RunGraphState } from "../state.js";

export function routeAfterObserve(state: RunGraphState) {
  if (state.haltReason || state.stepNo >= state.maxSteps) return "halt";
  if (state.stateType === "busy" || state.stateType === "not_ready") return "wait_stable";
  if (state.gameState?.is_game_over || state.stateType === "victory" || state.stateType === "defeat" || state.stateType === "game_over") return END;
  if (shouldRunPlanner(state)) return "planner";
  return "actor";
}

export function shouldRunPlanner(state: RunGraphState) {
  return ["reward", "map", "shop", "event", "rest"].includes(state.stateType);
}

export function routeAfterActor(state: RunGraphState) {
  if (state.haltReason) return "halt";
  if (!state.candidateAction) return "halt";
  if (isHighRiskAction(state.candidateAction, state.legalActions, state)) return "verifier";
  return "execute_action";
}

export function routeAfterVerifier(state: RunGraphState) {
  if (state.verifierResult?.fatal) return "halt";
  if (state.verifierResult?.approved) return "execute_action";
  return "actor";
}

export function isHighRiskAction(action: CandidateAction, legalActions: LegalAction[], state?: RunGraphState) {
  const matched = legalActions.find((item) => item.action_id === action.action_id);
  return (
    matched?.risk === "high" ||
    matched?.risk === "fatal" ||
    action.action_type === "end_turn" ||
    action.action_type === "skip_reward" ||
    action.action_type === "remove_card" ||
    action.action_type === "choose_elite_route" ||
    action.action_type === "buy_expensive_item" ||
    state?.risk?.level === "high" ||
    state?.risk?.level === "fatal"
  );
}
