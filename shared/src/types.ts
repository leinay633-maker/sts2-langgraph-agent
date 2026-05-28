export type StateType =
  | "combat"
  | "reward"
  | "map"
  | "shop"
  | "event"
  | "rest"
  | "busy"
  | "not_ready"
  | "victory"
  | "defeat"
  | "game_over";

export type BridgeStatus = "stable" | "busy" | "not_ready";

export type RiskLevel = "low" | "medium" | "high" | "fatal";

export interface PlayerSnapshot {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  gold: number;
  deck: string[];
  relics: string[];
  potions: string[];
}

export interface EnemySnapshot {
  id: string;
  name: string;
  hp: number;
  intent: string;
  incomingDamage: number;
}

export interface LegalAction {
  action_id: string;
  action_type: string;
  label: string;
  description: string;
  risk: RiskLevel;
  metadata?: Record<string, unknown>;
}

export interface GameState {
  run_id: string;
  step_no: number;
  status: BridgeStatus;
  state_type: StateType;
  screen: string;
  state_fingerprint: string;
  player: PlayerSnapshot;
  enemies: EnemySnapshot[];
  legal_actions: LegalAction[];
  is_game_over: boolean;
  outcome?: "victory" | "defeat";
  message?: string;
}

export interface ExecuteActionRequest {
  action_id: string;
}

export interface ExecuteActionResponse {
  status: "accepted" | "rejected";
  reason?: string;
  action?: LegalAction;
  state?: GameState;
}

export interface RunSummary {
  facts: Record<string, unknown>;
  strategy: Record<string, unknown>;
  risks: Record<string, unknown>;
  events: Array<{
    step_no: number;
    event_type: string;
    summary: string;
    source: "bridge" | "model" | "system";
  }>;
}

export interface PlannerState {
  build_direction: string | null;
  reward_policy: string[];
  route_policy: string[];
  shop_policy: string[];
  boss_plan: string | null;
  confidence: number;
  reasons: string[];
}

export interface CandidateAction {
  action_id: string;
  action_type: string;
  target_id?: string;
  reason: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  needs_verifier: boolean;
  reason: string;
}

export interface VerifierResult {
  approved: boolean;
  reason: string;
  fatal?: boolean;
  retry_hint?: string;
}

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
