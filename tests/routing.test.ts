import { describe, expect, it } from "vitest";
import type { LegalAction } from "../shared/src/types.js";
import { isHighRiskAction, routeAfterObserve, shouldRunPlanner } from "../langgraph-runner/src/routing/rules.js";
import { initialState } from "../langgraph-runner/src/state.js";

describe("LangGraph routing rules", () => {
  it("routes busy states to wait_stable", () => {
    const state = { ...initialState("test", 10), stateType: "busy" as const };
    expect(routeAfterObserve(state)).toBe("wait_stable");
  });

  it("runs planner only on strategic screens", () => {
    expect(shouldRunPlanner({ ...initialState("test", 10), stateType: "reward" })).toBe(true);
    expect(shouldRunPlanner({ ...initialState("test", 10), stateType: "combat" })).toBe(false);
  });

  it("marks irreversible actions as high risk", () => {
    const legalActions: LegalAction[] = [
      {
        action_id: "remove_strike",
        action_type: "remove_card",
        label: "Remove Strike",
        description: "Irreversible card removal.",
        risk: "high"
      }
    ];

    expect(
      isHighRiskAction(
        {
          action_id: "remove_strike",
          action_type: "remove_card",
          reason: "test"
        },
        legalActions
      )
    ).toBe(true);
  });
});
