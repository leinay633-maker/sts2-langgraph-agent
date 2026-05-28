import { describe, expect, it } from "vitest";
import { readContextSection, searchContext } from "../mcp-server/src/contextStore.js";

describe("agent context tools", () => {
  it("finds LangGraph context", async () => {
    const hits = await searchContext("LangGraph Planner Actor", 3);
    expect(hits.some((hit) => hit.file.includes("04_langgraph"))).toBe(true);
  });

  it("prevents path traversal", async () => {
    await expect(readContextSection("../package.json")).rejects.toThrow(/escapes agent context root/);
  });
});
