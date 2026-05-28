import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  ExecuteActionRequestSchema,
  ReadKbSectionRequestSchema,
  SearchKbRequestSchema,
  UpdateRunSummaryRequestSchema
} from "../../shared/src/schemas.js";
import { BridgeClient } from "./bridgeClient.js";
import { readKbSection, searchKnowledge } from "./kb.js";
import { JsonlLogger } from "./logger.js";

const bridge = new BridgeClient();
const logger = new JsonlLogger();

const server = new Server(
  {
    name: "sts2-mcp-server",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    tool("get_game_state", "Read the current game state from the Bridge.", {}),
    tool("list_legal_actions", "Read the current legal action list from the Bridge.", {}),
    tool("execute_action", "Execute a legal action_id through the Bridge.", {
      action_id: { type: "string", description: "The action_id selected from legal_actions." }
    }),
    tool("step", "Execute action_id and read the next state.", {
      action_id: { type: "string", description: "The action_id selected from legal_actions." }
    }),
    tool("get_run_summary", "Read structured run memory from the Bridge.", {}),
    tool("update_run_summary", "Write a structured strategy/risk memory diff.", {
      diff: { type: "object", description: "Structured memory diff. Facts remain Bridge-owned." }
    }),
    tool("search_kb", "Search the built-in Markdown knowledge base.", {
      query: { type: "string" },
      limit: { type: "number" }
    }),
    tool("read_kb_section", "Read a full KB file or one Markdown heading.", {
      file: { type: "string" },
      heading: { type: "string" }
    }),
    tool("start_autoslay", "Start the Bridge-side AutoSlay baseline loop.", {}),
    tool("stop_autoslay", "Stop the Bridge-side AutoSlay baseline loop.", {})
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const started = Date.now();

  try {
    const data = await dispatch(name, args);
    await logger.log({ tool: name, args, ok: true, elapsed_ms: Date.now() - started });
    return textResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.log({ tool: name, args, ok: false, error: message, elapsed_ms: Date.now() - started });
    return textResult({ error: message }, true);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[mcp-server] sts2 MCP server connected over stdio");

async function dispatch(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_game_state":
      return bridge.getGameState();
    case "list_legal_actions":
      return bridge.listLegalActions();
    case "execute_action": {
      const parsed = ExecuteActionRequestSchema.parse(args);
      return bridge.executeAction(parsed.action_id);
    }
    case "step": {
      const parsed = ExecuteActionRequestSchema.parse(args);
      return bridge.step(parsed.action_id);
    }
    case "get_run_summary":
      return bridge.getRunSummary();
    case "update_run_summary": {
      const parsed = UpdateRunSummaryRequestSchema.parse(args);
      return bridge.updateRunSummary(parsed.diff);
    }
    case "search_kb": {
      const parsed = SearchKbRequestSchema.parse(args);
      return searchKnowledge(parsed.query, parsed.limit);
    }
    case "read_kb_section": {
      const parsed = ReadKbSectionRequestSchema.parse(args);
      return readKbSection(parsed.file, parsed.heading);
    }
    case "start_autoslay":
      return bridge.startAutoslay();
    case "stop_autoslay":
      return bridge.stopAutoslay();
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

function textResult(data: unknown, isError = false) {
  return {
    isError,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties,
      additionalProperties: false
    }
  };
}
