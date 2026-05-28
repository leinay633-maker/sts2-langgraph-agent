import { describe, expect, it } from "vitest";
import { MockRunEngine } from "../mock-bridge/src/scenario.js";

describe("MockRunEngine", () => {
  it("starts with legal combat actions", () => {
    const engine = new MockRunEngine();
    const state = engine.state();
    expect(state.state_type).toBe("combat");
    expect(state.legal_actions.length).toBeGreaterThan(0);
  });

  it("rejects unknown actions", () => {
    const engine = new MockRunEngine();
    const result = engine.execute("missing_action");
    expect(result.status).toBe("rejected");
  });
});
