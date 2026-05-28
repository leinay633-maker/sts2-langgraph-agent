import { describe, expect, it } from "vitest";
import { RuntimeEngine } from "../bridge-runtime/src/scenario.js";

describe("RuntimeEngine", () => {
  it("starts with legal combat actions", () => {
    const engine = new RuntimeEngine();
    const state = engine.state();
    expect(state.state_type).toBe("combat");
    expect(state.legal_actions.length).toBeGreaterThan(0);
  });

  it("rejects unknown actions", () => {
    const engine = new RuntimeEngine();
    const result = engine.execute("missing_action");
    expect(result.status).toBe("rejected");
  });
});
