import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export class JsonlLogger {
  private readonly file: string;

  constructor(runId = process.env.RUN_ID ?? "manual") {
    const root = process.env.RUNS_DIR ?? path.join(process.cwd(), "runs");
    this.file = path.join(root, runId, "mcp-tools.jsonl");
  }

  async log(event: Record<string, unknown>) {
    await mkdir(path.dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`, "utf8");
  }
}
