import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class McpFacade {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect() {
    if (this.client) return;

    const command = process.env.MCP_SERVER_COMMAND ?? process.execPath;
    const args = process.env.MCP_SERVER_ARGS
      ? JSON.parse(process.env.MCP_SERVER_ARGS)
      : [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "mcp-server/src/server.ts"];

    this.transport = new StdioClientTransport({
      command,
      args,
      env: process.env as Record<string, string>
    });

    this.client = new Client({
      name: "sts2-langgraph-runner",
      version: "0.1.0"
    });

    await this.client.connect(this.transport);
  }

  async call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    await this.connect();
    const result = await this.client!.callTool({ name, arguments: args });
    const content = (result as { content?: Array<{ type: string; text?: string }>; isError?: boolean }).content ?? [];
    const first = content[0];
    if (!first || first.type !== "text") {
      throw new Error(`MCP tool ${name} returned no text content`);
    }

    const text = first.text ?? "";
    const parsed = JSON.parse(text) as T;
    if ((result as { isError?: boolean }).isError) {
      throw new Error(typeof parsed === "object" && parsed && "error" in parsed ? String((parsed as { error: unknown }).error) : text);
    }
    return parsed;
  }

  async close() {
    await this.client?.close();
    this.client = null;
    this.transport = null;
  }
}
