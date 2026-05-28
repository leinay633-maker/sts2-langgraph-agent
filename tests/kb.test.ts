import { describe, expect, it } from "vitest";
import { readKbSection, searchKnowledge } from "../mcp-server/src/kb.js";

describe("knowledge base tools", () => {
  it("finds LangGraph knowledge", async () => {
    const hits = await searchKnowledge("LangGraph Planner Actor", 3);
    expect(hits.some((hit) => hit.file.includes("04_langgraph"))).toBe(true);
  });

  it("prevents path traversal", async () => {
    await expect(readKbSection("../package.json")).rejects.toThrow(/escapes knowledge root/);
  });
});
