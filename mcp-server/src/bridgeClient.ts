import type { ExecuteActionResponse, GameState, LegalAction, RunSummary } from "../../shared/src/types.js";

export class BridgeClient {
  constructor(private readonly baseUrl = process.env.BRIDGE_URL ?? "http://127.0.0.1:15526") {}

  async health(): Promise<unknown> {
    return this.get("/health");
  }

  async getGameState(): Promise<GameState> {
    return this.get<GameState>("/state");
  }

  async listLegalActions(): Promise<LegalAction[]> {
    return this.get<LegalAction[]>("/actions");
  }

  async executeAction(actionId: string): Promise<ExecuteActionResponse> {
    return this.post<ExecuteActionResponse>("/execute", { action_id: actionId });
  }

  async step(actionId: string): Promise<{ execution: ExecuteActionResponse; state: GameState }> {
    const execution = await this.executeAction(actionId);
    const state = await this.getGameState();
    return { execution, state };
  }

  async getRunSummary(): Promise<RunSummary> {
    return this.get<RunSummary>("/summary");
  }

  async updateRunSummary(diff: Record<string, unknown>): Promise<RunSummary> {
    return this.post<RunSummary>("/summary", { diff });
  }

  async startAutoslay(): Promise<unknown> {
    return this.post("/automation/start_autoslay", {});
  }

  async stopAutoslay(): Promise<unknown> {
    return this.post("/automation/stop_autoslay", {});
  }

  private async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    return this.read<T>(res);
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    return this.read<T>(res);
  }

  private async read<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      throw new Error(`Bridge HTTP ${res.status}: ${JSON.stringify(data)}`);
    }

    return data as T;
  }
}
