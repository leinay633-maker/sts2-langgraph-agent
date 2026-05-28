import { mkdir, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class RunEventLogger {
  private readonly root: string;

  constructor(readonly runId: string) {
    this.root = path.join(process.env.RUNS_DIR ?? path.join(process.cwd(), "runs"), runId);
  }

  async event(type: string, data: Record<string, unknown>) {
    await mkdir(this.root, { recursive: true });
    await appendFile(
      path.join(this.root, "graph-events.jsonl"),
      `${JSON.stringify({ ts: new Date().toISOString(), type, ...data })}\n`,
      "utf8"
    );
  }

  async writeJson(name: string, data: unknown) {
    await mkdir(this.root, { recursive: true });
    await writeFile(path.join(this.root, name), JSON.stringify(data, null, 2), "utf8");
  }

  async writeText(name: string, data: string) {
    await mkdir(this.root, { recursive: true });
    await writeFile(path.join(this.root, name), data, "utf8");
  }
}
