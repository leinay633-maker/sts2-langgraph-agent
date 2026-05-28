import { randomUUID } from "node:crypto";
import { RunEventLogger } from "./eventLogger.js";
import { createGraph } from "./graph.js";
import { McpFacade } from "./mcpClient.js";
import { initialState } from "./state.js";

const maxSteps = readNumberArg("--max-steps", 30);
const runId = process.env.RUN_ID ?? `run-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
process.env.RUN_ID = runId;

const logger = new RunEventLogger(runId);
const mcp = new McpFacade();

try {
  const graph = createGraph(mcp, logger);
  const finalState = await graph.invoke(initialState(runId, maxSteps), { recursionLimit: 100 });
  await logger.writeJson("memory.json", finalState.memory ?? {});
  await logger.writeJson("final-state.json", finalState);
  await logger.writeText("transcript.md", transcript(finalState));
  console.log(JSON.stringify({ runId, outcome: finalState.gameState?.outcome ?? finalState.stateType, haltReason: finalState.haltReason }, null, 2));
} finally {
  await mcp.close();
}

function readNumberArg(name: string, fallback: number) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function transcript(state: Awaited<ReturnType<ReturnType<typeof createGraph>["invoke"]>>) {
  const memory = state.memory;
  return [
    `# STS2 LangGraph Run Transcript`,
    ``,
    `- Run ID: ${state.runId}`,
    `- Final state: ${state.stateType}`,
    `- Outcome: ${state.gameState?.outcome ?? "unknown"}`,
    `- Halt reason: ${state.haltReason ?? "none"}`,
    ``,
    `## Memory Facts`,
    "```json",
    JSON.stringify(memory?.facts ?? {}, null, 2),
    "```",
    ``,
    `## Strategy`,
    "```json",
    JSON.stringify(memory?.strategy ?? {}, null, 2),
    "```",
    ``,
    `## Events`,
    ...(memory?.events ?? []).map((event) => `- [${event.step_no}] ${event.event_type}: ${event.summary}`)
  ].join("\n");
}
