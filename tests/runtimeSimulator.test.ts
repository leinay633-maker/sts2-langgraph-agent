import { describe, expect, it } from "vitest";
import { RuntimeSimulatorEngine } from "../runtime-simulator/src/scenario.js";

describe("RuntimeSimulatorEngine", () => {
  it("starts with legal combat actions", () => {
    const engine = new RuntimeSimulatorEngine();
    const state = engine.state();
    expect(state.state_type).toBe("combat");
    expect(state.legal_actions.length).toBeGreaterThan(0);
  });

  it("rejects unknown actions", () => {
    const engine = new RuntimeSimulatorEngine();
    const result = engine.execute("missing_action");
    expect(result.status).toBe("rejected");
  });
});
