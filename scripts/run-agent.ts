import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const runner = commandSpec();
const bridgePort = process.env.BRIDGE_PORT ?? "15526";
const bridgeUrl = process.env.BRIDGE_URL ?? `http://127.0.0.1:${bridgePort}`;
const runId = process.env.RUN_ID ?? `agent-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const bridge = spawn(runner.command, [...runner.prefixArgs, "bridge-runtime/src/server.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, BRIDGE_PORT: bridgePort },
  stdio: ["ignore", "pipe", "pipe"]
});

bridge.stderr.on("data", (chunk) => process.stderr.write(chunk));
bridge.stdout.on("data", (chunk) => process.stdout.write(chunk));

try {
  await waitForBridge(`${bridgeUrl}/health`);
  const child = spawn(runner.command, [...runner.prefixArgs, "langgraph-runner/src/run.ts", "--max-steps", "30"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRIDGE_URL: bridgeUrl,
      RUN_ID: runId,
      MCP_SERVER_COMMAND: runner.command,
      MCP_SERVER_ARGS: JSON.stringify([...runner.prefixArgs, "mcp-server/src/server.ts"])
    },
    stdio: "inherit"
  });

  const code = await waitForExit(child);
  process.exitCode = code;
} finally {
  bridge.kill();
}

function commandSpec() {
  return {
    command: process.execPath,
    prefixArgs: [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs")]
  };
}

async function waitForBridge(url: string) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await delay(100);
  }
  throw new Error(`Bridge did not become healthy: ${url}`);
}

function waitForExit(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", reject);
  });
}
