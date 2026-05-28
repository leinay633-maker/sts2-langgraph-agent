import { describe, expect, it } from "vitest";
import { LocalRuntimeEngine } from "../local-runtime/src/scenario.js";

describe("LocalRuntimeEngine", () => {
  it("starts with legal combat actions", () => {
    const engine = new LocalRuntimeEngine();
    const state = engine.state();
    expect(state.state_type).toBe("combat");
    expect(state.legal_actions.length).toBeGreaterThan(0);
  });

  it("rejects unknown actions", () => {
    const engine = new LocalRuntimeEngine();
    const result = engine.execute("missing_action");
    expect(result.status).toBe("rejected");
  });
});
